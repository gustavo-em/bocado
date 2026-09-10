import type { DB, Scalar } from '@op-engineering/op-sqlite';

import { getDatabase } from '../db/database';
import { prefs } from '../prefs/prefs';
import {
  FOODS_UPSERT,
  FTS_DELETE,
  FTS_INSERT,
  foodRow,
  ftsRow,
} from './mapSeedFood';
import type { SeedFile } from './seedTypes';

/** `meta` row holding `starters` as JSON, read by `getStarters`. */
export const STARTERS_META_KEY = 'starters';
export const META_UPSERT =
  'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';

export const SEED_LOG_TAG = '[bocado:seed]';

/** The slice of the database the importer needs, so a test can hand it a recorder. */
export type SeedWriter = Pick<DB, 'executeBatch'>;

export interface SeedImportResult {
  foods: number;
  version: number;
}

/**
 * Writes every seed food into `foods` and `foods_fts`, plus the meal
 * starters into `meta`, in one native batch (a single transaction).
 * Idempotent: rows are upserted by id and the FTS rows for those ids are
 * replaced.
 */
export async function importSeed(
  seed: SeedFile,
  db: SeedWriter,
): Promise<SeedImportResult> {
  const foodParams: Scalar[][] = [];
  const ftsDeleteParams: Scalar[][] = [];
  const ftsInsertParams: Scalar[][] = [];
  for (const food of seed.foods) {
    foodParams.push(foodRow(seed, food));
    ftsDeleteParams.push([food.id]);
    ftsInsertParams.push(ftsRow(food));
  }
  await db.executeBatch([
    [FOODS_UPSERT, foodParams],
    [FTS_DELETE, ftsDeleteParams],
    [FTS_INSERT, ftsInsertParams],
    [META_UPSERT, [[STARTERS_META_KEY, JSON.stringify(seed.starters)]]],
  ]);
  return { foods: foodParams.length, version: seed.version };
}

let pending: Promise<SeedImportResult | null> | null = null;

/**
 * Imports the bundled seed once per seed version, in the background. Safe to
 * call more than once: concurrent calls share the same promise, later calls
 * return without touching the database. Never awaited by a screen.
 */
export function importSeedIfNeeded(): Promise<SeedImportResult | null> {
  if (!pending) {
    pending = run().catch(error => {
      console.warn(`${SEED_LOG_TAG} import failed: ${String(error)}`);
      pending = null;
      return null;
    });
  }
  return pending;
}

async function run(): Promise<SeedImportResult | null> {
  // Required lazily: the file is large, and parsing it belongs to this
  // background step, not to app start-up.
  const seed = require('../../../assets/data/foods.seed.json') as SeedFile;
  if (prefs.getSeedVersion() >= seed.version) {
    if (__DEV__) {
      console.log(
        `${SEED_LOG_TAG} skipped (version ${seed.version} already imported)`,
      );
    }
    return null;
  }
  const startedAt = Date.now();
  const db = await getDatabase();
  const result = await importSeed(seed, db);
  prefs.setSeedVersion(seed.version);
  if (__DEV__) {
    console.log(
      `${SEED_LOG_TAG} imported ${result.foods} foods in ${
        Date.now() - startedAt
      } ms (version ${seed.version})`,
    );
  }
  return result;
}

/** Test seam. */
export function resetSeedImportForTests(): void {
  pending = null;
}
