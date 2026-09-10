import {
  MEALS,
  sumTotals,
  type DailyGoal,
  type DayTotals,
  type DiaryEntry,
  type Meal,
} from './Meal';

export interface MealSummary extends DayTotals {
  /** How many entries the meal has; 0 means "Nada registrado ainda". */
  count: number;
}

export interface DaySummary {
  consumed: DayTotals;
  /** kcal still available; never negative. */
  remaining: number;
  /** kcal past the goal; 0 when under or exactly at the goal. */
  overBy: number;
  isOver: boolean;
  /** consumed / goal, clamped to 1: the accent segment of the daily bar. */
  goalRatio: number;
  /** Share of the bar drawn in `overGoal`: 0 under the goal, (consumed − goal) / consumed above it. */
  overRatio: number;
  /** Fill of each macro bar, clamped to 1. */
  macroRatio: { protein: number; carbs: number; fat: number };
  byMeal: Record<Meal, MealSummary>;
}

type MealEntry = Pick<
  DiaryEntry,
  'meal' | 'kcal' | 'protein' | 'carbs' | 'fat'
>;

function ratio(consumed: number, goal: number): number {
  if (goal <= 0) return consumed > 0 ? 1 : 0;
  return Math.min(consumed / goal, 1);
}

/**
 * Everything the "Hoje" screen shows, computed once from the day's entries.
 * Rounding happens here (whole kcal and grams) so that the number, the line
 * under it and the bar never disagree with each other.
 */
export function summarizeDay(
  entries: readonly MealEntry[],
  goal: DailyGoal,
): DaySummary {
  const raw = sumTotals(entries);
  const consumed: DayTotals = {
    kcal: Math.round(raw.kcal),
    protein: Math.round(raw.protein),
    carbs: Math.round(raw.carbs),
    fat: Math.round(raw.fat),
  };
  const goalKcal = Math.round(goal.kcal);
  const overBy = Math.max(consumed.kcal - goalKcal, 0);
  const isOver = overBy > 0;

  const byMeal = {} as Record<Meal, MealSummary>;
  for (const meal of MEALS) {
    const own = entries.filter(entry => entry.meal === meal);
    const totals = sumTotals(own);
    byMeal[meal] = {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      count: own.length,
    };
  }

  return {
    consumed,
    remaining: Math.max(goalKcal - consumed.kcal, 0),
    overBy,
    isOver,
    goalRatio: ratio(consumed.kcal, goalKcal),
    overRatio: isOver && consumed.kcal > 0 ? overBy / consumed.kcal : 0,
    macroRatio: {
      protein: ratio(consumed.protein, goal.protein_g),
      carbs: ratio(consumed.carbs, goal.carbs_g),
      fat: ratio(consumed.fat, goal.fat_g),
    },
    byMeal,
  };
}

/** What the answer number counts: what is left, or what was eaten ("Metas"). */
export type DiaryDisplayMode = 'remaining' | 'consumed';

export interface HeroValue {
  /** The number in `hero` type. */
  kcal: number;
  /**
   * Which line goes under it: nothing eaten yet, what is left, how far past
   * the goal, or — in "consumidas" — the goal the total is measured against.
   */
  line: 'available' | 'remaining' | 'over' | 'ofGoal';
}

/**
 * The answer number of "Hoje", in one place, so the screen never decides it
 * twice. "consumidas" always reads as a total against the goal — going past
 * the goal is information, not an alarm, and does not change the wording.
 */
export function heroValue(
  summary: DaySummary | null,
  goalKcal: number,
  mode: DiaryDisplayMode,
): HeroValue {
  if (mode === 'consumed') {
    return { kcal: summary?.consumed.kcal ?? 0, line: 'ofGoal' };
  }
  if (!summary) return { kcal: Math.round(goalKcal), line: 'available' };
  if (summary.consumed.kcal === 0) {
    return { kcal: summary.remaining, line: 'available' };
  }
  return summary.isOver
    ? { kcal: summary.overBy, line: 'over' }
    : { kcal: summary.remaining, line: 'remaining' };
}

/** Goal limits enforced by the "Metas" screen. */
export const GOAL_LIMITS = {
  kcal: { min: 1, max: 9999 },
  protein_g: { min: 1, max: 999 },
  carbs_g: { min: 1, max: 999 },
  fat_g: { min: 1, max: 999 },
} as const;

export type GoalField = keyof DailyGoal;

export type GoalInput =
  | { kind: 'valid'; value: number }
  | { kind: 'clamped'; value: number }
  | { kind: 'invalid' };

/**
 * What the user typed → what gets saved. Empty, non-numeric or below the
 * minimum is invalid (the field shakes and reverts); above the maximum is
 * clamped (the field shakes and keeps the limit).
 */
export function parseGoalInput(field: GoalField, text: string): GoalInput {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return { kind: 'invalid' };
  const value = Number(digits);
  const { min, max } = GOAL_LIMITS[field];
  if (!Number.isFinite(value) || value < min) return { kind: 'invalid' };
  if (value > max) return { kind: 'clamped', value: max };
  return { kind: 'valid', value };
}
