import type { Scalar } from '@op-engineering/op-sqlite';

import { sumTotals } from '../../domain/diary/Meal';
import type { DayTotals, DiaryEntry, Meal } from '../../domain/diary/Meal';
import type { Locale } from '../../domain/food/FoodProvider';
import type { NormalizedFood, Serving } from '../../domain/food/NormalizedFood';
import { portionSnapshot } from '../../domain/food/portion';
import type { MicroKey } from '../../domain/nutrition/micronutrients';
import { getDatabase } from '../db/database';

/** A diary entry with the food name the screen prints. */
export interface DiaryEntryView extends DiaryEntry {
  foodName: string;
  /**
   * English name of the food, when the bundled glossary covered the whole of
   * it. Both names travel with the entry so switching the language re-renders
   * in the other one, with no re-import and no write.
   */
  foodNameEn?: string;
  /**
   * The measures the food has today, so the household label of the entry can
   * be re-read in the language on screen instead of staying in the language it
   * was written in (`entryServingLabel`).
   */
  foodServings?: Serving[];
  /**
   * Minerals, fibre and sodium per 100 g, read live from `foods` instead of
   * being snapshot on the entry (docs/DECISIONS.md, task 20). `undefined` is
   * "the source never measured it" and must never be read as zero.
   */
  per100: Partial<Record<MicroKey, number | undefined>>;
}

type Listener = () => void;

const listeners = new Set<Listener>();

const ENTRIES_FOR_DAY = `
  SELECT e.id, e.day, e.meal, e.food_id, e.grams, e.serving_label,
         e.serving_count, e.kcal, e.protein, e.carbs, e.fat, e.position,
         e.created_at, e.updated_at, f.name_pt AS food_name, f.name_en AS food_name_en,
         f.servings_json AS food_servings,
         f.fiber_100, f.sodium_mg_100, f.iron_mg_100, f.calcium_mg_100,
         f.magnesium_mg_100, f.potassium_mg_100, f.zinc_mg_100
  FROM diary_entries e
  JOIN foods f ON f.id = e.food_id
  WHERE e.day = ?
  ORDER BY e.position ASC, e.created_at ASC`;

const NEXT_POSITION = `
  SELECT COALESCE(MAX(position), 0) + 1 AS position
  FROM diary_entries WHERE day = ? AND meal = ?`;

const INSERT_ENTRY = `
  INSERT INTO diary_entries (id, day, meal, food_id, grams, serving_label,
    serving_count, kcal, protein, carbs, fat, position, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const ENTRY_BY_ID = `
  SELECT e.id, e.day, e.meal, e.food_id, e.grams, e.serving_label,
         e.serving_count, e.kcal, e.protein, e.carbs, e.fat, e.position,
         e.created_at, e.updated_at, f.name_pt AS food_name, f.name_en AS food_name_en,
         f.servings_json AS food_servings,
         f.fiber_100, f.sodium_mg_100, f.iron_mg_100, f.calcium_mg_100,
         f.magnesium_mg_100, f.potassium_mg_100, f.zinc_mg_100
  FROM diary_entries e
  JOIN foods f ON f.id = e.food_id
  WHERE e.id = ?`;

const DELETE_ENTRY = 'DELETE FROM diary_entries WHERE id = ?';

/** Where an entry stands today, before an edit moves it. */
const ENTRY_CONTEXT =
  'SELECT id, day, meal, food_id, position FROM diary_entries WHERE id = ?';

const UPDATE_ENTRY = `
  UPDATE diary_entries SET meal = ?, grams = ?, serving_label = ?,
    serving_count = ?, kcal = ?, protein = ?, carbs = ?, fat = ?,
    position = ?, updated_at = ?
  WHERE id = ?`;

/** "Desfazer" of a removal: the same row, in the same place in its meal. */
const RESTORE_ENTRY = `
  INSERT OR REPLACE INTO diary_entries (id, day, meal, food_id, grams,
    serving_label, serving_count, kcal, protein, carbs, fat, position,
    created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/**
 * An edit is not a new use: `use_count` stays where it is and only the
 * remembered portion (and the meal tally, when the entry moved) is rewritten.
 */
const USAGE_REMEMBER = `
  UPDATE food_usage SET
    last_used_at = ?, last_grams = ?, last_serving_label = ?,
    last_serving_count = ?, by_meal_json = ?
  WHERE food_id = ?`;

const USAGE_MEMORY = `
  SELECT last_grams, last_serving_label, last_serving_count
  FROM food_usage WHERE food_id = ?`;

/**
 * What removal needs, without joining `foods`: a missing food row must never
 * make an entry look absent, or "Desfazer" would report a removal it never did.
 */
const ENTRY_FOR_REMOVAL =
  'SELECT id, food_id, meal FROM diary_entries WHERE id = ?';

const USAGE_BY_FOOD = 'SELECT by_meal_json FROM food_usage WHERE food_id = ?';

/** Frecency memory (task 04 reads it); `last_*` is the next default portion. */
const USAGE_UPSERT = `
  INSERT INTO food_usage (food_id, use_count, last_used_at, last_grams,
    last_serving_label, last_serving_count, by_meal_json)
  VALUES (?, 1, ?, ?, ?, ?, ?)
  ON CONFLICT(food_id) DO UPDATE SET
    use_count = use_count + 1,
    last_used_at = excluded.last_used_at,
    last_grams = excluded.last_grams,
    last_serving_label = excluded.last_serving_label,
    last_serving_count = excluded.last_serving_count,
    by_meal_json = excluded.by_meal_json`;

/**
 * Undo also forgets the portion: once the counter is back to zero the food has
 * no remembered serving, so the `last_*` columns are cleared in the same write
 * (`last_used_at` is NOT NULL, so the emptied row is pruned below).
 */
const USAGE_DECREMENT = `
  UPDATE food_usage SET
    use_count = MAX(use_count - 1, 0),
    by_meal_json = ?,
    last_grams = CASE WHEN use_count - 1 <= 0 THEN NULL ELSE last_grams END,
    last_serving_label = CASE WHEN use_count - 1 <= 0 THEN NULL
      ELSE last_serving_label END,
    last_serving_count = CASE WHEN use_count - 1 <= 0 THEN NULL
      ELSE last_serving_count END
  WHERE food_id = ?`;

/** A food nobody logged and nobody favourited leaves no memory behind. */
const USAGE_PRUNE = `
  DELETE FROM food_usage
  WHERE food_id = ? AND use_count = 0 AND favorite = 0`;

/** Task 04: every logging of the last 90 days, as the score reads them. */
const SUGGESTION_EVENTS = `
  SELECT food_id, meal, day, created_at
  FROM diary_entries WHERE day >= ?`;

/** The whole memory table; it holds one row per food ever logged or favourited. */
const USAGE_SUMMARY = `
  SELECT food_id, use_count, last_used_at, last_grams, last_serving_label,
         last_serving_count, favorite
  FROM food_usage ORDER BY last_used_at DESC`;

const RECENT_USAGE = `
  SELECT food_id, use_count, last_used_at, last_grams, last_serving_label,
         last_serving_count, favorite
  FROM food_usage WHERE use_count > 0
  ORDER BY last_used_at DESC LIMIT ?`;

const FAVORITE_USAGE = `
  SELECT food_id, use_count, last_used_at, last_grams, last_serving_label,
         last_serving_count, favorite
  FROM food_usage WHERE favorite = 1
  ORDER BY last_used_at DESC LIMIT ?`;

/** A heart on a food never logged still has to leave a row behind. */
const FAVORITE_UPSERT = `
  INSERT INTO food_usage (food_id, use_count, last_used_at, by_meal_json,
    favorite)
  VALUES (?, 0, ?, '{}', ?)
  ON CONFLICT(food_id) DO UPDATE SET favorite = excluded.favorite`;

const FAVORITE_BY_FOOD = 'SELECT favorite FROM food_usage WHERE food_id = ?';

/** What "Repetir" needs about a past meal, without reading its rows. */
const MEAL_SUMMARY = `
  SELECT COUNT(*) AS items, COALESCE(SUM(kcal), 0) AS kcal
  FROM diary_entries WHERE day = ? AND meal = ?`;

/** The rows "Repetir" copies, in the order they were eaten. */
const ENTRIES_FOR_MEAL = `
  SELECT id, day, meal, food_id, grams, serving_label, serving_count, kcal,
         protein, carbs, fat, position, created_at, updated_at
  FROM diary_entries WHERE day = ? AND meal = ?
  ORDER BY position ASC, created_at ASC`;

const USAGE_CLEAR = 'DELETE FROM food_usage';

/**
 * "Desfazer" of "Limpar sugestões". The backup is merged, never written over
 * what is there: anything logged during the four seconds of the snackbar has
 * already recreated its row, and that use is the newer truth — so the counters
 * keep the larger value and the remembered portion belongs to whichever of the
 * two was used last.
 */
const USAGE_RESTORE = `
  INSERT INTO food_usage (food_id, use_count, last_used_at,
    last_grams, last_serving_label, last_serving_count, by_meal_json, favorite)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(food_id) DO UPDATE SET
    use_count = MAX(food_usage.use_count, excluded.use_count),
    favorite = MAX(food_usage.favorite, excluded.favorite),
    last_grams = CASE WHEN food_usage.last_used_at >= excluded.last_used_at
      THEN food_usage.last_grams ELSE excluded.last_grams END,
    last_serving_label =
      CASE WHEN food_usage.last_used_at >= excluded.last_used_at
      THEN food_usage.last_serving_label ELSE excluded.last_serving_label END,
    last_serving_count =
      CASE WHEN food_usage.last_used_at >= excluded.last_used_at
      THEN food_usage.last_serving_count ELSE excluded.last_serving_count END,
    by_meal_json = CASE WHEN food_usage.last_used_at >= excluded.last_used_at
      THEN food_usage.by_meal_json ELSE excluded.by_meal_json END,
    last_used_at = MAX(food_usage.last_used_at, excluded.last_used_at)`;

const USAGE_ROW_BY_FOOD = `
  SELECT food_id, use_count, last_used_at, last_grams, last_serving_label,
         last_serving_count, by_meal_json, favorite
  FROM food_usage`;

const TOTALS_FOR_DAY = `
  SELECT COALESCE(SUM(kcal), 0) AS kcal, COALESCE(SUM(protein), 0) AS protein,
         COALESCE(SUM(carbs), 0) AS carbs, COALESCE(SUM(fat), 0) AS fat
  FROM diary_entries WHERE day = ?`;

const TOTALS_FOR_RANGE = `
  SELECT day, COALESCE(SUM(kcal), 0) AS kcal, COALESCE(SUM(protein), 0) AS protein,
         COALESCE(SUM(carbs), 0) AS carbs, COALESCE(SUM(fat), 0) AS fat
  FROM diary_entries WHERE day >= ? AND day <= ?
  GROUP BY day`;

function text(value: Scalar | undefined): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function number(value: Scalar | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function newEntryId(): string {
  return `e_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function parseMealCounts(json: Scalar | undefined): Record<string, number> {
  if (typeof json !== 'string') return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

/** `by_meal_json` with `meal` moved by `delta`, never below zero. */
function shiftMealCount(
  json: Scalar | undefined,
  meal: Meal,
  delta: 1 | -1,
): string {
  const counts = parseMealCounts(json);
  counts[meal] = Math.max((Number(counts[meal]) || 0) + delta, 0);
  return JSON.stringify(counts);
}

/** `by_meal_json` with one entry moved from `from` to `to`, in one write. */
function moveMealCount(json: Scalar | undefined, from: Meal, to: Meal): string {
  const counts = parseMealCounts(json);
  counts[from] = Math.max((Number(counts[from]) || 0) - 1, 0);
  counts[to] = Math.max((Number(counts[to]) || 0) + 1, 0);
  return JSON.stringify(counts);
}

/** Anything that runs SQL: the database handle or a transaction. */
interface SqlRunner {
  execute: (
    query: string,
    params?: Scalar[],
  ) => Promise<{ rows: Array<Record<string, Scalar>> }>;
}

/** Gives back what one entry lent to `food_usage`: the counters and the portion. */
async function forgetUsage(
  runner: SqlRunner,
  foodId: string,
  meal: Meal,
): Promise<void> {
  const usage = await runner.execute(USAGE_BY_FOOD, [foodId]);
  await runner.execute(USAGE_DECREMENT, [
    shiftMealCount(usage.rows[0]?.by_meal_json, meal, -1),
    foodId,
  ]);
  await runner.execute(USAGE_PRUNE, [foodId]);
}

export interface AddEntryInput {
  day: string;
  meal: Meal;
  food: NormalizedFood;
  serving: Serving;
  servingCount?: number;
  /** Language of the stored serving label; defaults to pt-BR. */
  locale?: Locale;
}

export interface UpdateEntryInput {
  id: string;
  food: NormalizedFood;
  serving: Serving;
  servingCount?: number;
  /** Where the entry should end up; omitted keeps it in its meal. */
  meal?: Meal;
  locale?: Locale;
}

/** The last portion the user chose for a food (`food_usage.last_*`). */
export interface UsageMemoryRow {
  lastGrams?: number;
  lastServingLabel?: string;
  lastServingCount?: number;
}

/** One row of `food_usage`: the memory the suggestions are ranked from. */
export interface UsageRow extends UsageMemoryRow {
  foodId: string;
  useCount: number;
  lastUsedAt: string;
  favorite: boolean;
}

/** A `food_usage` row kept whole, so "Desfazer" can put the table back. */
export interface UsageBackupRow extends UsageRow {
  byMealJson: string;
}

/** One past logging, with its local clock, as `rankSuggestions` reads it. */
export interface SuggestionEventRow {
  foodId: string;
  meal: Meal;
  day: string;
  minuteOfDay: number;
}

/** What "Repetir" prints about a past meal. */
export interface MealSummaryRow {
  itemCount: number;
  kcal: number;
}

export interface CopyMealInput {
  fromDay: string;
  toDay: string;
  meal: Meal;
}

function usageRow(row: Record<string, Scalar>): UsageRow {
  return {
    foodId: String(row.food_id),
    useCount: number(row.use_count) ?? 0,
    lastUsedAt: String(row.last_used_at),
    lastGrams: number(row.last_grams),
    lastServingLabel: text(row.last_serving_label),
    lastServingCount: number(row.last_serving_count),
    favorite: (number(row.favorite) ?? 0) === 1,
  };
}

/** Local minutes past midnight of an ISO timestamp. */
function minuteOfDay(iso: string): number {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getHours() * 60 + date.getMinutes();
}

/** `servings_json` as stored by the import; a broken row simply has none. */
function parseServings(value: Scalar): Serving[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Serving[]) : undefined;
  } catch {
    return undefined;
  }
}

function toEntry(row: Record<string, Scalar>): DiaryEntryView {
  return {
    id: String(row.id),
    day: String(row.day),
    meal: String(row.meal) as Meal,
    foodId: String(row.food_id),
    grams: number(row.grams) ?? 0,
    servingLabel: text(row.serving_label),
    servingCount: number(row.serving_count),
    kcal: number(row.kcal) ?? 0,
    protein: number(row.protein) ?? 0,
    carbs: number(row.carbs) ?? 0,
    fat: number(row.fat) ?? 0,
    position: number(row.position) ?? 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    foodName: String(row.food_name),
    foodNameEn: text(row.food_name_en),
    foodServings: parseServings(row.food_servings),
    per100: {
      fiber: number(row.fiber_100),
      sodium: number(row.sodium_mg_100),
      iron: number(row.iron_mg_100),
      calcium: number(row.calcium_mg_100),
      magnesium: number(row.magnesium_mg_100),
      potassium: number(row.potassium_mg_100),
      zinc: number(row.zinc_mg_100),
    },
  };
}

/**
 * The only place that reads or writes `diary_entries`. Screens subscribe and
 * reload when `notifyChanged` fires; writers (task 02 onwards) call it after
 * every successful write.
 */
export const diaryRepository = {
  async entriesForDay(day: string): Promise<DiaryEntryView[]> {
    const db = await getDatabase();
    const result = await db.execute(ENTRIES_FOR_DAY, [day]);
    return result.rows.map(toEntry);
  },

  async totalsForDay(day: string): Promise<DayTotals> {
    const db = await getDatabase();
    const result = await db.execute(TOTALS_FOR_DAY, [day]);
    const row = result.rows[0];
    if (!row) return sumTotals([]);
    return {
      kcal: number(row.kcal) ?? 0,
      protein: number(row.protein) ?? 0,
      carbs: number(row.carbs) ?? 0,
      fat: number(row.fat) ?? 0,
    };
  },

  /**
   * Every day of a closed range that has anything in it, in one grouped read:
   * the month piece needs thirty-one totals and must not run thirty-one
   * queries on a J6. Days with no entries are simply absent from the map.
   */
  async totalsForRange(
    firstDay: string,
    lastDay: string,
  ): Promise<Record<string, DayTotals>> {
    const db = await getDatabase();
    const result = await db.execute(TOTALS_FOR_RANGE, [firstDay, lastDay]);
    const totals: Record<string, DayTotals> = {};
    for (const row of result.rows) {
      const day = text(row.day);
      if (day === undefined) continue;
      totals[day] = {
        kcal: number(row.kcal) ?? 0,
        protein: number(row.protein) ?? 0,
        carbs: number(row.carbs) ?? 0,
        fat: number(row.fat) ?? 0,
      };
    }
    return totals;
  },

  /**
   * Writes one entry with its nutrient snapshot at the end of the meal and
   * remembers the food in `food_usage`, in one transaction. Returns the row
   * as the screen will print it.
   */
  async addEntry(input: AddEntryInput): Promise<DiaryEntryView> {
    const db = await getDatabase();
    const snapshot = portionSnapshot(
      input.food,
      input.serving,
      input.servingCount ?? 1,
      input.locale,
    );
    const id = newEntryId();
    const now = new Date().toISOString();
    await db.transaction(async tx => {
      const next = await tx.execute(NEXT_POSITION, [input.day, input.meal]);
      const position = number(next.rows[0]?.position) ?? 1;
      await tx.execute(INSERT_ENTRY, [
        id,
        input.day,
        input.meal,
        input.food.id,
        snapshot.grams,
        snapshot.servingLabel ?? null,
        snapshot.servingCount ?? null,
        snapshot.kcal,
        snapshot.protein,
        snapshot.carbs,
        snapshot.fat,
        position,
        now,
        now,
      ]);
      const usage = await tx.execute(USAGE_BY_FOOD, [input.food.id]);
      await tx.execute(USAGE_UPSERT, [
        input.food.id,
        now,
        snapshot.grams,
        snapshot.servingLabel ?? null,
        snapshot.servingCount ?? null,
        shiftMealCount(usage.rows[0]?.by_meal_json, input.meal, 1),
      ]);
    });
    const result = await db.execute(ENTRY_BY_ID, [id]);
    const row = result.rows[0];
    if (!row) throw new Error(`diary entry ${id} not written`);
    diaryRepository.notifyChanged();
    return toEntry(row);
  },

  /** One entry as the screen prints it, or `null` when it is already gone. */
  async entryById(id: string): Promise<DiaryEntryView | null> {
    const db = await getDatabase();
    const result = await db.execute(ENTRY_BY_ID, [id]);
    const row = result.rows[0];
    return row ? toEntry(row) : null;
  },

  /** The last portion chosen for a food; `null` when it has never been used. */
  async usageForFood(foodId: string): Promise<UsageMemoryRow | null> {
    const db = await getDatabase();
    const row = (await db.execute(USAGE_MEMORY, [foodId])).rows[0];
    if (!row) return null;
    return {
      lastGrams: number(row.last_grams),
      lastServingLabel: text(row.last_serving_label),
      lastServingCount: number(row.last_serving_count),
    };
  },

  /**
   * Rewrites one entry with a new portion and, when `meal` differs, moves it
   * to the end of the target meal. An edit is not a new use: `use_count` is
   * left alone and only the remembered portion is refreshed, so correcting a
   * typo never inflates what "Frequentes" will rank.
   */
  async updateEntry(input: UpdateEntryInput): Promise<DiaryEntryView> {
    const db = await getDatabase();
    const snapshot = portionSnapshot(
      input.food,
      input.serving,
      input.servingCount ?? 1,
      input.locale,
    );
    const now = new Date().toISOString();
    await db.transaction(async tx => {
      const current = (await tx.execute(ENTRY_CONTEXT, [input.id])).rows[0];
      if (!current) throw new Error(`diary entry ${input.id} not found`);
      const day = String(current.day);
      const from = String(current.meal) as Meal;
      const to = input.meal ?? from;
      const moved = to !== from;
      let position = number(current.position);
      if (moved || position === undefined) {
        const next = await tx.execute(NEXT_POSITION, [day, to]);
        position = number(next.rows[0]?.position) ?? 1;
      }
      await tx.execute(UPDATE_ENTRY, [
        to,
        snapshot.grams,
        snapshot.servingLabel ?? null,
        snapshot.servingCount ?? null,
        snapshot.kcal,
        snapshot.protein,
        snapshot.carbs,
        snapshot.fat,
        position,
        now,
        input.id,
      ]);
      const usage = await tx.execute(USAGE_BY_FOOD, [input.food.id]);
      const byMeal = moved
        ? moveMealCount(usage.rows[0]?.by_meal_json, from, to)
        : JSON.stringify(parseMealCounts(usage.rows[0]?.by_meal_json));
      await tx.execute(USAGE_REMEMBER, [
        now,
        snapshot.grams,
        snapshot.servingLabel ?? null,
        snapshot.servingCount ?? null,
        byMeal,
        input.food.id,
      ]);
    });
    const row = (await db.execute(ENTRY_BY_ID, [input.id])).rows[0];
    if (!row) throw new Error(`diary entry ${input.id} not updated`);
    diaryRepository.notifyChanged();
    return toEntry(row);
  },

  /**
   * "Desfazer" of a removal: the exact row comes back, keeping its id, its
   * position in the meal and its original `created_at`, so the entry lands
   * where the eye last saw it instead of at the bottom of the list.
   */
  async restoreEntry(entry: DiaryEntry): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.transaction(async tx => {
      await tx.execute(RESTORE_ENTRY, [
        entry.id,
        entry.day,
        entry.meal,
        entry.foodId,
        entry.grams,
        entry.servingLabel ?? null,
        entry.servingCount ?? null,
        entry.kcal,
        entry.protein,
        entry.carbs,
        entry.fat,
        entry.position,
        entry.createdAt,
        now,
      ]);
      const usage = await tx.execute(USAGE_BY_FOOD, [entry.foodId]);
      await tx.execute(USAGE_UPSERT, [
        entry.foodId,
        now,
        entry.grams,
        entry.servingLabel ?? null,
        entry.servingCount ?? null,
        shiftMealCount(usage.rows[0]?.by_meal_json, entry.meal, 1),
      ]);
    });
    diaryRepository.notifyChanged();
  },

  /**
   * Undo of `addEntry`: deletes the row and gives back both usage counters
   * (total and per meal) in one transaction.
   *
   * "Desfazer" reverts its ✓ and its tray on this promise, so the removal is
   * read back after the commit: an entry still standing is deleted straight on
   * the handle, and only a row that survives both attempts throws — the screen
   * never claims a removal the day did not get.
   */
  async removeEntry(id: string): Promise<void> {
    const db = await getDatabase();
    await db.transaction(async tx => {
      const existing = await tx.execute(ENTRY_FOR_REMOVAL, [id]);
      const row = existing.rows[0];
      if (!row) return;
      await tx.execute(DELETE_ENTRY, [id]);
      await forgetUsage(tx, String(row.food_id), String(row.meal) as Meal);
    });
    const left = (await db.execute(ENTRY_FOR_REMOVAL, [id])).rows[0];
    if (left) {
      await db.execute(DELETE_ENTRY, [id]);
      await forgetUsage(db, String(left.food_id), String(left.meal) as Meal);
      const stillThere = (await db.execute(ENTRY_FOR_REMOVAL, [id])).rows[0];
      if (stillThere) throw new Error(`diary entry ${id} not removed`);
    }
    diaryRepository.notifyChanged();
  },

  /**
   * Every logging of the last `sinceDay` days, flattened for the ranking: the
   * civil day of the entry with the clock time it was written at, so an entry
   * added later for a past day counts on the day it belongs to.
   */
  async suggestionEvents(sinceDay: string): Promise<SuggestionEventRow[]> {
    const db = await getDatabase();
    const result = await db.execute(SUGGESTION_EVENTS, [sinceDay]);
    return result.rows.map(row => ({
      foodId: String(row.food_id),
      meal: String(row.meal) as Meal,
      day: String(row.day),
      minuteOfDay: minuteOfDay(String(row.created_at)),
    }));
  },

  /** The whole `food_usage` table, newest use first. */
  async usageSummary(): Promise<UsageRow[]> {
    const db = await getDatabase();
    const result = await db.execute(USAGE_SUMMARY);
    return result.rows.map(usageRow);
  },

  /** The last foods logged in any meal, newest first (the "Recentes" chips). */
  async recentUsage(limit: number): Promise<UsageRow[]> {
    const db = await getDatabase();
    const result = await db.execute(RECENT_USAGE, [limit]);
    return result.rows.map(usageRow);
  },

  async favoriteUsage(limit: number): Promise<UsageRow[]> {
    const db = await getDatabase();
    const result = await db.execute(FAVORITE_USAGE, [limit]);
    return result.rows.map(usageRow);
  },

  async isFavorite(foodId: string): Promise<boolean> {
    const db = await getDatabase();
    const row = (await db.execute(FAVORITE_BY_FOOD, [foodId])).rows[0];
    return (number(row?.favorite) ?? 0) === 1;
  },

  /**
   * The heart. A food nobody logged still gets its row, and unfavouriting one
   * leaves no memory behind (`USAGE_PRUNE`).
   */
  async setFavorite(foodId: string, favorite: boolean): Promise<void> {
    const db = await getDatabase();
    await db.execute(FAVORITE_UPSERT, [
      foodId,
      new Date().toISOString(),
      favorite ? 1 : 0,
    ]);
    if (!favorite) await db.execute(USAGE_PRUNE, [foodId]);
    diaryRepository.notifyChanged();
  },

  /** How many items a past meal has and what they add up to. */
  async mealSummary(day: string, meal: Meal): Promise<MealSummaryRow> {
    const db = await getDatabase();
    const row = (await db.execute(MEAL_SUMMARY, [day, meal])).rows[0];
    return {
      itemCount: number(row?.items) ?? 0,
      kcal: number(row?.kcal) ?? 0,
    };
  },

  /**
   * "Repetir almoço de ontem": every row of one meal copied to another day
   * with its stored snapshot — the same portions, never recomputed — in one
   * transaction. Returns the new rows, as the tray and "Desfazer" need them.
   */
  async copyMealEntries(input: CopyMealInput): Promise<DiaryEntryView[]> {
    const db = await getDatabase();
    const source = await db.execute(ENTRIES_FOR_MEAL, [
      input.fromDay,
      input.meal,
    ]);
    if (source.rows.length === 0) return [];
    const now = new Date().toISOString();
    const ids: string[] = [];
    await db.transaction(async tx => {
      const next = await tx.execute(NEXT_POSITION, [input.toDay, input.meal]);
      let position = number(next.rows[0]?.position) ?? 1;
      for (const row of source.rows) {
        const entry = toEntry({ ...row, food_name: '' });
        const id = newEntryId();
        ids.push(id);
        await tx.execute(INSERT_ENTRY, [
          id,
          input.toDay,
          input.meal,
          entry.foodId,
          entry.grams,
          entry.servingLabel ?? null,
          entry.servingCount ?? null,
          entry.kcal,
          entry.protein,
          entry.carbs,
          entry.fat,
          position,
          now,
          now,
        ]);
        position += 1;
        const usage = await tx.execute(USAGE_BY_FOOD, [entry.foodId]);
        await tx.execute(USAGE_UPSERT, [
          entry.foodId,
          now,
          entry.grams,
          entry.servingLabel ?? null,
          entry.servingCount ?? null,
          shiftMealCount(usage.rows[0]?.by_meal_json, input.meal, 1),
        ]);
      }
    });
    const written = new Set(ids);
    const rows = await db.execute(ENTRIES_FOR_DAY, [input.toDay]);
    diaryRepository.notifyChanged();
    return rows.rows.map(toEntry).filter(entry => written.has(entry.id));
  },

  /** "Desfazer" of a copy: the whole set leaves in one transaction. */
  async removeEntries(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    await db.transaction(async tx => {
      for (const id of ids) {
        const row = (await tx.execute(ENTRY_FOR_REMOVAL, [id])).rows[0];
        if (!row) continue;
        await tx.execute(DELETE_ENTRY, [id]);
        await forgetUsage(tx, String(row.food_id), String(row.meal) as Meal);
      }
    });
    diaryRepository.notifyChanged();
  },

  /**
   * "Limpar sugestões": `food_usage` is emptied — the diary is not touched —
   * and the rows come back as they were on "Desfazer".
   */
  async clearUsage(): Promise<UsageBackupRow[]> {
    const db = await getDatabase();
    const before = await db.execute(USAGE_ROW_BY_FOOD);
    const backup = before.rows.map(row => ({
      ...usageRow(row),
      byMealJson: String(row.by_meal_json ?? '{}'),
    }));
    await db.execute(USAGE_CLEAR);
    diaryRepository.notifyChanged();
    return backup;
  },

  async restoreUsage(rows: readonly UsageBackupRow[]): Promise<void> {
    if (rows.length === 0) return;
    const db = await getDatabase();
    await db.transaction(async tx => {
      for (const row of rows) {
        await tx.execute(USAGE_RESTORE, [
          row.foodId,
          row.useCount,
          row.lastUsedAt,
          row.lastGrams ?? null,
          row.lastServingLabel ?? null,
          row.lastServingCount ?? null,
          row.byMealJson,
          row.favorite ? 1 : 0,
        ]);
      }
    });
    diaryRepository.notifyChanged();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notifyChanged(): void {
    for (const listener of listeners) listener();
  },
};
