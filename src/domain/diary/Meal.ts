/** The four fixed meals, in the order the day shows them. */
export const MEALS = [
  'breakfast',
  'lunch',
  'afternoon_snack',
  'dinner',
] as const;

export type Meal = (typeof MEALS)[number];

/** Hour ranges used to guess the meal from the clock (local time, inclusive start). */
export const MEAL_HOURS: Record<Meal, { from: number; to: number }> = {
  breakfast: { from: 4, to: 10 },
  lunch: { from: 11, to: 14 },
  afternoon_snack: { from: 15, to: 17 },
  dinner: { from: 18, to: 3 },
};

export function mealForHour(hour: number): Meal {
  if (hour >= 4 && hour <= 10) return 'breakfast';
  if (hour >= 11 && hour <= 14) return 'lunch';
  if (hour >= 15 && hour <= 17) return 'afternoon_snack';
  return 'dinner';
}

export interface DiaryEntry {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  meal: Meal;
  foodId: string;
  grams: number;
  /** How the user expressed it ("colher de servir cheia"); undefined when typed in grams. */
  servingLabel?: string;
  servingCount?: number;
  /** Snapshot at logging time. Never recomputed from the food later. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumTotals(
  entries: readonly Pick<DiaryEntry, 'kcal' | 'protein' | 'carbs' | 'fat'>[],
): DayTotals {
  return entries.reduce(
    (total, entry) => ({
      kcal: total.kcal + entry.kcal,
      protein: total.protein + entry.protein,
      carbs: total.carbs + entry.carbs,
      fat: total.fat + entry.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export interface DailyGoal {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const DEFAULT_GOAL: DailyGoal = {
  kcal: 2000,
  protein_g: 120,
  carbs_g: 250,
  fat_g: 65,
};
