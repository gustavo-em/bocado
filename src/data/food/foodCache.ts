import type { Scalar, SQLBatchTuple } from '@op-engineering/op-sqlite';

import type { Locale } from '../../domain/food/FoodProvider';
import type {
  FoodSource,
  NormalizedFood,
} from '../../domain/food/NormalizedFood';
import { normalizeText } from '../../domain/food/units';
import { getDatabase } from '../db/database';
import {
  FOODS_UPSERT,
  FTS_DELETE,
  FTS_INSERT,
} from '../seed/mapSeedFood';
import { rowToFood } from '../providers/LocalFoodProvider';

/**
 * The private, per-user cache of everything an online provider answered
 * (docs/FOOD_DATA_CONTRACT.md, "Cache policy"). It never leaves the device
 * and is never conveyed anywhere: that is what keeps the app a "Produced
 * Work" under the ODbL instead of a derivative database.
 */

export const CACHE_LOG_TAG = '[bocado:cache]';

/** A cached product is refreshed silently once it is older than this. */
export const PRODUCT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** A cached search answer is reused for a day. */
export const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Online rows kept at most. The 20 MB ceiling of the contract, counted in
 * rows: a cached product is ~1 kB of JSON, so this stays an order of
 * magnitude below it on the reference device.
 */
export const MAX_ONLINE_ROWS = 2000;

const ONLINE_SOURCES: FoodSource[] = ['off', 'usda'];

const READ_SEARCH = `
  SELECT ids_json, fetched_at FROM food_search_cache
  WHERE source = ? AND locale = ? AND query = ?`;

const WRITE_SEARCH = `
  INSERT INTO food_search_cache (source, locale, query, ids_json, fetched_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(source, locale, query) DO UPDATE SET
    ids_json = excluded.ids_json, fetched_at = excluded.fetched_at`;

/**
 * Rows this app may drop: online sources only, never referenced by the diary
 * and never used by the ranking. A food a diary entry points at stays
 * forever — the entry keeps its own snapshot, but the row is what the sheet
 * reopens.
 */
const PRUNE = `
  DELETE FROM foods
  WHERE id IN (
    SELECT f.id FROM foods f
    WHERE f.source IN (${ONLINE_SOURCES.map(() => '?').join(', ')})
      AND f.id NOT IN (SELECT food_id FROM diary_entries)
      AND f.id NOT IN (SELECT food_id FROM food_usage)
    ORDER BY f.fetched_at ASC
    LIMIT ?
  )`;

const COUNT_ONLINE = `
  SELECT count(*) AS n FROM foods
  WHERE source IN (${ONLINE_SOURCES.map(() => '?').join(', ')})`;

const BY_IDS = `
  SELECT f.*, COALESCE(u.use_count, 0) AS use_count
  FROM foods f LEFT JOIN food_usage u ON u.food_id = f.id
  WHERE f.id IN`;

/** One normalized food → the parameter list of `FOODS_UPSERT`. */
export function cacheRow(food: NormalizedFood): Scalar[] {
  const name = food.name.pt ?? food.name.en ?? '';
  const aliasesNorm = food.aliases?.length
    ? food.aliases.map(normalizeText).join(' ')
    : null;
  return [
    food.id,
    food.source,
    food.sourceId,
    name,
    food.name.en ?? null,
    normalizeText(name),
    aliasesNorm,
    food.brand ?? null,
    food.category?.pt ?? food.category?.en ?? null,
    food.barcode ?? null,
    food.verified ? 1 : 0,
    food.per100g.kcal,
    food.per100g.protein_g,
    food.per100g.carbs_g,
    food.per100g.fat_g,
    food.per100g.fiber_g ?? null,
    food.per100g.sugar_g ?? null,
    food.per100g.sodium_mg ?? null,
    JSON.stringify(food.servings),
    // Never from an online source (contract, "Merge, dedupe and ranking").
    0,
    food.completeness,
    JSON.stringify(food.attribution),
    food.lastFetchedAt,
    food.isLiquid ? 1 : 0,
    // NULL, not 0: a label that never declared the mineral must stay out of
    // the day's total instead of dragging it down.
    food.per100g.iron_mg ?? null,
    food.per100g.calcium_mg ?? null,
    food.per100g.magnesium_mg ?? null,
    food.per100g.potassium_mg ?? null,
    food.per100g.zinc_mg ?? null,
  ];
}

/** One normalized food → the parameter list of `FTS_INSERT`. */
export function cacheFtsRow(food: NormalizedFood): Scalar[] {
  const name = food.name.pt ?? food.name.en ?? '';
  return [
    food.id,
    normalizeText(name),
    food.aliases?.length ? food.aliases.map(normalizeText).join(' ') : '',
    normalizeText(food.brand ?? ''),
  ];
}

/**
 * Writes foods into the same table the bundle uses, so a product found online
 * once is findable offline afterwards. Failure is never fatal: the results
 * are already on screen.
 */
export async function upsertFoods(
  foods: readonly NormalizedFood[],
): Promise<void> {
  if (foods.length === 0) return;
  const db = await getDatabase();
  const commands: SQLBatchTuple[] = [];
  for (const food of foods) {
    commands.push([FOODS_UPSERT, cacheRow(food)]);
    commands.push([FTS_DELETE, [food.id]]);
    commands.push([FTS_INSERT, cacheFtsRow(food)]);
  }
  await db.executeBatch(commands);
}

/** Foods by id, in the order asked for; unknown ids are skipped. */
export async function readFoods(
  ids: readonly string[],
): Promise<NormalizedFood[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const result = await db.execute(`${BY_IDS} (${placeholders})`, [...ids]);
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

export interface CachedSearch {
  ids: string[];
  fetchedAt: string;
}

/** The ids one provider answered for a query, when still inside the 24 h TTL. */
export async function readSearchCache(
  source: FoodSource,
  locale: Locale,
  query: string,
  now: number = Date.now(),
): Promise<CachedSearch | null> {
  const db = await getDatabase();
  const result = await db.execute(READ_SEARCH, [source, locale, query]);
  const row = result.rows[0];
  if (!row) return null;
  const fetchedAt = String(row.fetched_at);
  if (now - Date.parse(fetchedAt) > SEARCH_TTL_MS) return null;
  try {
    const ids = JSON.parse(String(row.ids_json)) as unknown;
    if (!Array.isArray(ids)) return null;
    return { ids: ids.map(String), fetchedAt };
  } catch {
    return null;
  }
}

export async function writeSearchCache(
  source: FoodSource,
  locale: Locale,
  query: string,
  ids: readonly string[],
  now: number = Date.now(),
): Promise<void> {
  const db = await getDatabase();
  await db.execute(WRITE_SEARCH, [
    source,
    locale,
    query,
    JSON.stringify(ids),
    new Date(now).toISOString(),
  ]);
}

/** True once a cached product is old enough to be refetched silently. */
export function isStale(food: NormalizedFood, now: number = Date.now()): boolean {
  const fetched = Date.parse(food.lastFetchedAt);
  return !Number.isFinite(fetched) || now - fetched > PRODUCT_TTL_MS;
}

/**
 * Keeps the cache under `MAX_ONLINE_ROWS`, oldest first. Runs at most once
 * per session, after a successful online search, so it never sits between a
 * keystroke and its results.
 */
export async function pruneOnlineFoods(): Promise<number> {
  const db = await getDatabase();
  const counted = await db.execute(COUNT_ONLINE, [...ONLINE_SOURCES]);
  const total = Number(counted.rows[0]?.n ?? 0);
  const excess = total - MAX_ONLINE_ROWS;
  if (excess <= 0) return 0;
  await db.execute(PRUNE, [...ONLINE_SOURCES, excess]);
  await db.execute(
    `DELETE FROM foods_fts WHERE id NOT IN (SELECT id FROM foods)`,
  );
  if (__DEV__) console.log(`${CACHE_LOG_TAG} pruned ${excess} online foods`);
  return excess;
}
