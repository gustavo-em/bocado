import { dedupeAgainstLocal } from './dedupe';
import type { FoodProvider, Locale } from './FoodProvider';
import type { NormalizedFood } from './NormalizedFood';
import { rankFoods } from './rank';

/**
 * The orchestration fixed in docs/FOOD_DATA_CONTRACT.md and spec 05: the
 * local table answers first and alone; the online providers are asked in
 * parallel, only for a query worth a request, and never hold the screen for
 * more than `timeoutMs`. Pure of React and of SQLite — the providers, the
 * cache and the clock all arrive as arguments, so the rules are testable.
 */

/** Below this, a query is still being typed. */
export const MIN_ONLINE_QUERY = 3;

/** How long an online provider may take before the local list stands alone. */
export const ONLINE_TIMEOUT_MS = 2500;

/** USDA only joins when Brazil's own sources came back this thin. */
export const USDA_THRESHOLD = 5;

/** Rows the "Produtos" group shows. */
export const PRODUCTS_LIMIT = 10;

/** How one provider ended its part of a round. */
export type ProviderOutcome =
  | 'cache'
  | 'ok'
  | 'timeout'
  | 'error'
  /** The round's deadline had already passed. */
  | 'skipped';

export interface RoundReport {
  query: string;
  locale: Locale;
  products: number;
  offline: boolean;
  elapsedMs: number;
}

export interface OnlineSearchDeps {
  off: FoodProvider;
  usda: FoodProvider;
  /**
   * Called once per provider. The screen only ever shows "Sem conexão", so
   * without this a failing round and a round that simply found nothing look
   * identical from the outside.
   */
  onProviderDone?: (
    source: 'off' | 'usda',
    outcome: ProviderOutcome,
    count: number,
    elapsedMs: number,
    detail?: string,
  ) => void;
  onRoundDone?: (report: RoundReport) => void;
  /** Ids a provider answered for this query inside the 24 h TTL. */
  readCache?: (
    source: 'off' | 'usda',
    locale: Locale,
    query: string,
  ) => Promise<NormalizedFood[] | null>;
  /** Stores the answer: the foods themselves and the query → ids index. */
  writeCache?: (
    source: 'off' | 'usda',
    locale: Locale,
    query: string,
    foods: readonly NormalizedFood[],
  ) => Promise<void>;
  timeoutMs?: number;
}

export interface OnlineSearchInput {
  query: string;
  locale: Locale;
  /** What the local table already put on screen, in its own order. */
  local: readonly NormalizedFood[];
  signal?: AbortSignal;
}

export interface OnlineSearchResult {
  /** Ranked products, deduplicated against `local`. Never longer than `PRODUCTS_LIMIT`. */
  products: NormalizedFood[];
  /** `local`, with any measures a duplicate product contributed. */
  base: NormalizedFood[];
  /** True when every provider asked failed or timed out. */
  offline: boolean;
  /** False when the query was too short to be worth a request. */
  attempted: boolean;
}

export function shouldSearchOnline(query: string): boolean {
  return query.trim().length >= MIN_ONLINE_QUERY;
}

class Timeout extends Error {
  constructor() {
    super('timeout');
    this.name = 'Timeout';
  }
}

interface AskOutcome {
  kind: ProviderOutcome;
  foods: NormalizedFood[] | null;
  /** The error, as one line, when there was one. */
  detail?: string;
}

/**
 * Resolves with whatever the provider managed to answer, or `null` when it
 * failed, was cancelled or ran out of time — and says which of the three it
 * was, so a silent round can be told apart from a broken one.
 */
async function ask(
  provider: FoodProvider,
  query: string,
  locale: Locale,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<AskOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Timeout()), timeoutMs);
  });
  try {
    const foods = await Promise.race([
      provider.search(query, { locale, signal }),
      expiry,
    ]);
    return { kind: 'ok', foods };
  } catch (error) {
    if (error instanceof Timeout)
      return { kind: 'timeout', foods: null, detail: `${timeoutMs} ms` };
    return { kind: 'error', foods: null, detail: String(error) };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * One online round for one query. Ordering is the contract's ranking, so a
 * product with a Brazilian name and a complete record leads its group.
 */
export async function searchOnline(
  deps: OnlineSearchDeps,
  input: OnlineSearchInput,
): Promise<OnlineSearchResult> {
  const { query, locale, local, signal } = input;
  const timeoutMs = deps.timeoutMs ?? ONLINE_TIMEOUT_MS;

  if (!shouldSearchOnline(query)) {
    return { products: [], base: [...local], offline: false, attempted: false };
  }

  const trimmed = query.trim();
  const started = Date.now();
  /*
    One deadline for the whole round, not one per provider: two independent
    2,5 s ceilings would let the group take 5 s to settle.
  */
  const deadline = started + timeoutMs;
  const run = async (
    source: 'off' | 'usda',
    provider: FoodProvider,
  ): Promise<NormalizedFood[] | null> => {
    // The cache is local and instant, so it answers even past the deadline.
    const cached = await deps.readCache?.(source, locale, trimmed);
    if (cached !== null && cached !== undefined) {
      deps.onProviderDone?.(source, 'cache', cached.length, 0);
      return cached;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      deps.onProviderDone?.(source, 'skipped', 0, Date.now() - started);
      return null;
    }
    const outcome = await ask(provider, trimmed, locale, signal, remaining);
    const elapsed = Date.now() - started;
    deps.onProviderDone?.(
      source,
      outcome.kind,
      outcome.foods?.length ?? 0,
      elapsed,
      outcome.detail,
    );
    if (outcome.foods !== null)
      await deps.writeCache?.(source, locale, trimmed, outcome.foods);
    return outcome.foods;
  };

  /*
    Both providers start inside the same window instead of one after the
    other. Serially, a slow Open Food Facts ate the whole round and left USDA
    no time at all, so a query with nothing local — "nutella" on a cold
    connection — settled as offline with an empty "Produtos". USDA is only
    dialled when it stands a chance of being needed: in en-US, or when the
    local table is already thin. The contract's gate is applied afterwards,
    on the result.
  */
  const mayNeedUsda = locale === 'en-US' || local.length < USDA_THRESHOLD;
  const offPromise = run('off', deps.off);
  const usdaPromise = mayNeedUsda ? run('usda', deps.usda) : null;

  const offResult = await offPromise;
  const merged = dedupeAgainstLocal(local, offResult ?? []);

  // USDA is the fallback for what Brazil does not answer, and the primary
  // generic table in English (contract, "Merge, dedupe and ranking").
  const thin = merged.base.length + merged.products.length < USDA_THRESHOLD;
  const askedUsda = locale === 'en-US' || thin;
  const dialled = await (usdaPromise ?? Promise.resolve(null));
  // Fetched but not needed: it stays in the cache and out of the list.
  const usdaResult = askedUsda ? dialled : null;

  const combined = dedupeAgainstLocal(merged.base, [
    ...merged.products,
    ...(usdaResult ?? []),
  ]);

  const products = rankFoods(
    combined.products.map(food => ({ food })),
    trimmed,
    locale,
  )
    .slice(0, PRODUCTS_LIMIT)
    .map(item => item.food);

  // "Offline" only when every provider that was actually asked came back
  // empty-handed; one working provider is not an offline device.
  const failed =
    offResult === null && (!askedUsda || !mayNeedUsda || dialled === null);
  deps.onRoundDone?.({
    query: trimmed,
    locale,
    products: products.length,
    offline: failed,
    elapsedMs: Date.now() - started,
  });
  return { products, base: combined.base, offline: failed, attempted: true };
}
