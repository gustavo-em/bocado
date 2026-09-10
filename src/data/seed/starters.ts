import type { Meal } from '../../domain/diary/Meal';
import { getDatabase } from '../db/database';
import { META_UPSERT, STARTERS_META_KEY } from './importSeed';
import type { SeedFile } from './seedTypes';

type Starters = Record<Meal, string[]>;

const META_SELECT = 'SELECT value FROM meta WHERE key = ?';

let cached: Starters | null = null;

function parseStarters(value: unknown): Starters | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as Partial<Starters>;
    return parsed && typeof parsed === 'object' ? (parsed as Starters) : null;
  } catch {
    return null;
  }
}

/**
 * Food ids suggested before the user types, per meal, in seed order.
 * Read from `meta` (written by the seed import); when the row is missing —
 * a database created before this task — the bundled seed is read once and
 * the row is written so later opens skip the parse.
 */
export async function getStarters(meal: Meal): Promise<string[]> {
  if (!cached) {
    const db = await getDatabase();
    const result = await db.execute(META_SELECT, [STARTERS_META_KEY]);
    cached = parseStarters(result.rows[0]?.value);
    if (!cached) {
      const seed = require('../../../assets/data/foods.seed.json') as SeedFile;
      cached = seed.starters;
      await db.execute(META_UPSERT, [
        STARTERS_META_KEY,
        JSON.stringify(seed.starters),
      ]);
    }
  }
  return cached[meal] ?? [];
}

/** Test seam. */
export function resetStartersForTests(): void {
  cached = null;
}
