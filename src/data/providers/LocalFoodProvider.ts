import type { Scalar } from '@op-engineering/op-sqlite';

import type {
  FoodProvider,
  SearchOptions,
} from '../../domain/food/FoodProvider';
import {
  REFERENCE_SERVING,
  type Attribution,
  type FoodSource,
  type NormalizedFood,
  type Serving,
} from '../../domain/food/NormalizedFood';
import { rankFoods, type RankCandidate } from '../../domain/food/rank';
import { buildFtsMatch, searchTerms } from '../../domain/food/searchQuery';
import { getDatabase } from '../db/database';

export const SEARCH_LOG_TAG = '[bocado:search]';

/** How many FTS hits the ranker sees; the screen shows `limit` of them. */
const CANDIDATE_LIMIT = 100;

const FOOD_COLUMNS = `
  f.id, f.source, f.source_id, f.name_pt, f.name_en, f.aliases_norm, f.brand,
  f.category, f.barcode, f.verified, f.kcal_100, f.protein_100, f.carbs_100,
  f.fat_100, f.fiber_100, f.sugar_100, f.sodium_mg_100, f.servings_json,
  f.boost, f.completeness, f.attribution_json, f.fetched_at, f.is_liquid,
  f.iron_mg_100, f.calcium_mg_100, f.magnesium_mg_100, f.potassium_mg_100,
  f.zinc_mg_100,
  COALESCE(u.use_count, 0) AS use_count`;

/**
 * Prefix match on every typed word; SQL pre-orders so the 100 candidates the
 * ranker sees are the most promising ones (exact, then name prefix, then
 * boosted staples, then short names).
 *
 * The English name counts in that pre-order too, and the bundled tables come
 * before the online cache (task 21). `name_norm` holds the Portuguese name, so
 * without either rule an English word like "rice" put every cached USDA row
 * ahead of every bundled row, and the staple could fall outside the 100
 * candidates before the ranker ever saw it — which is why "rice type 1" found
 * it and "rice" did not. The bundled base is the primary source
 * (docs/FOOD_DATA_CONTRACT.md); it must never be crowded out of the window by
 * rows that were cached from a previous online search.
 */
const SEARCH = `
  SELECT ${FOOD_COLUMNS}
  FROM foods_fts
  JOIN foods f ON f.id = foods_fts.id
  LEFT JOIN food_usage u ON u.food_id = f.id
  WHERE foods_fts MATCH ?
  ORDER BY (f.name_norm = ? OR lower(f.name_en) = ?) DESC,
           (f.name_norm LIKE ? OR lower(f.name_en) LIKE ?) DESC,
           (f.source IN ('taco', 'ibge')) DESC,
           f.boost DESC, length(f.name_norm) ASC
  LIMIT ${CANDIDATE_LIMIT}`;

const BY_IDS = `
  SELECT ${FOOD_COLUMNS}
  FROM foods f
  LEFT JOIN food_usage u ON u.food_id = f.id
  WHERE f.id IN`;

function text(value: Scalar | undefined): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function number(value: Scalar | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseJson<T>(value: Scalar | undefined, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseServings(value: Scalar | undefined): Serving[] {
  const servings = parseJson<Serving[]>(value, []);
  if (!Array.isArray(servings) || servings.length === 0)
    return [{ ...REFERENCE_SERVING, isDefault: true }];
  return servings;
}

/** One `foods` row (with `use_count`) → the domain shape. */
export function rowToFood(row: Record<string, Scalar>): NormalizedFood {
  const brand = text(row.brand);
  const category = text(row.category);
  const barcode = text(row.barcode);
  const aliasesNorm = text(row.aliases_norm);
  const boost = number(row.boost);
  const fiber = number(row.fiber_100);
  const sugar = number(row.sugar_100);
  const sodium = number(row.sodium_mg_100);
  return {
    id: String(row.id),
    source: String(row.source) as FoodSource,
    sourceId: String(row.source_id),
    name: { pt: String(row.name_pt), en: text(row.name_en) },
    aliases: aliasesNorm ? [aliasesNorm] : undefined,
    brand,
    barcode,
    category: category ? { pt: category } : undefined,
    verified: Boolean(number(row.verified)),
    per100g: {
      kcal: number(row.kcal_100) ?? 0,
      protein_g: number(row.protein_100) ?? 0,
      carbs_g: number(row.carbs_100) ?? 0,
      fat_g: number(row.fat_100) ?? 0,
      fiber_g: fiber,
      sugar_g: sugar,
      sodium_mg: sodium,
      // `number` gives back undefined for NULL, which is what "never measured"
      // has to look like all the way up to the day's total.
      iron_mg: number(row.iron_mg_100),
      calcium_mg: number(row.calcium_mg_100),
      magnesium_mg: number(row.magnesium_mg_100),
      potassium_mg: number(row.potassium_mg_100),
      zinc_mg: number(row.zinc_mg_100),
      energySource: 'declared',
    },
    servings: parseServings(row.servings_json),
    // The column is the answer, and only it: a product whose label states its
    // serving in grams was written as solid on purpose, and second-guessing it
    // here would put "milk chocolate" in millilitres (spec 09). Rows imported
    // before the column existed are back-filled by the migration.
    isLiquid: number(row.is_liquid) === 1,
    completeness: number(row.completeness) ?? 1,
    boost: boost && boost > 0 ? boost : undefined,
    lastFetchedAt: String(row.fetched_at),
    attribution: parseJson<Attribution>(row.attribution_json, {
      license: 'TACO',
      text: '',
    }),
  };
}

function toCandidate(row: Record<string, Scalar>): RankCandidate {
  return { food: rowToFood(row), useCount: number(row.use_count) ?? 0 };
}

const clock = (globalThis as { performance?: { now(): number } }).performance;
const now = (): number => clock?.now() ?? Date.now();

/**
 * Bundled TACO + IBGE rows in SQLite: always offline, always first. Search
 * time is logged in development so the < 100 ms budget stays visible.
 */
export class LocalFoodProvider implements FoodProvider {
  readonly source: FoodSource = 'taco';
  readonly offline = true;

  async search(
    query: string,
    options: SearchOptions,
  ): Promise<NormalizedFood[]> {
    const match = buildFtsMatch(query);
    if (match === null) return [];
    const queryKey = searchTerms(query).join(' ');
    const limit = options.limit ?? 20;
    const started = now();
    const db = await getDatabase();
    const result = await db.execute(SEARCH, [
      match,
      queryKey,
      queryKey,
      `${queryKey}%`,
      `${queryKey}%`,
    ]);
    if (options.signal?.aborted) return [];
    const ranked = rankFoods(result.rows.map(toCandidate), query, options.locale)
      .slice(0, limit)
      .map(item => item.food);
    if (__DEV__) {
      const elapsed = now() - started;
      // The candidate window is what decides whether the ranker ever sees the
      // bundled staple, so the head of it is logged with the timing.
      const head = result.rows
        .slice(0, 3)
        .map(row => String(row.id))
        .join(', ');
      console.log(
        `${SEARCH_LOG_TAG} "${query}" ${ranked.length}/${result.rows.length} em ${elapsed.toFixed(1)} ms [${head}]`,
      );
    }
    return ranked;
  }

  /** `sourceId` may be a bare TACO id ("3") or a full id ("ibge:8501303"). */
  async getById(sourceId: string): Promise<NormalizedFood | null> {
    const id = sourceId.includes(':') ? sourceId : `${this.source}:${sourceId}`;
    const [food] = await this.getByIds([id]);
    return food ?? null;
  }

  /** Foods in the order of `ids`; unknown ids are skipped. */
  async getByIds(ids: readonly string[]): Promise<NormalizedFood[]> {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(', ');
    const result = await db.execute(
      `${BY_IDS} (${placeholders})`,
      ids.map(id => id),
    );
    const byId = new Map<string, NormalizedFood>();
    for (const row of result.rows) {
      const food = rowToFood(row);
      byId.set(food.id, food);
    }
    const foods: NormalizedFood[] = [];
    for (const id of ids) {
      const food = byId.get(id);
      if (food) foods.push(food);
    }
    return foods;
  }
}

export const localFoodProvider = new LocalFoodProvider();
