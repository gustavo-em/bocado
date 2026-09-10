import type { DailyGoal } from '../diary/Meal';

/**
 * The daily goal calculator: Mifflin-St Jeor, an activity factor, an intent
 * delta and a sex floor. Pure on purpose — no React, no MMKV, no i18n — so the
 * numbers a screen shows are the numbers a unit test asserts.
 */

export type Sex = 'female' | 'male';

/** What the user answered on "O que você quer?". */
export type Intent = 'lose' | 'maintain' | 'gain';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense';

export const SEXES = ['female', 'male'] as const satisfies readonly Sex[];
export const INTENTS = [
  'lose',
  'maintain',
  'gain',
] as const satisfies readonly Intent[];
export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'intense',
] as const satisfies readonly ActivityLevel[];

/** Multipliers applied to the basal rate. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
};

/** −500 to lose, +300 to gain; maintaining leaves the expenditure alone. */
export const INTENT_DELTA_KCAL: Record<Intent, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

/** Never propose less than this, whatever the arithmetic says. */
export const KCAL_FLOOR: Record<Sex, number> = {
  female: 1200,
  male: 1500,
};

/** Ranges the data screen accepts; outside them the field shakes and reverts. */
export const PROFILE_LIMITS = {
  ageYears: { min: 14, max: 100 },
  heightCm: { min: 120, max: 220 },
  weightKg: { min: 30, max: 300 },
} as const;

/** What a hand-edited goal may be set to on the result screen. */
export const GOAL_KCAL_INPUT_LIMITS = { min: 800, max: 6000 } as const;

/** Macro split of a calculated goal. */
export const PROTEIN_G_PER_KG = 1.6;
export const FAT_SHARE_OF_KCAL = 0.25;
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export interface GoalProfile {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  intent: Intent;
}

/**
 * What the data screen starts with, and what "Recalcular" falls back to when
 * the user skipped the first run and no profile was ever saved.
 */
export const DEFAULT_PROFILE: GoalProfile = {
  sex: 'female',
  ageYears: 30,
  heightCm: 170,
  weightKg: 70,
  activity: 'sedentary',
  intent: 'maintain',
};

/** "Pular": a round, honest default, flagged as an estimate in "Metas". */
export const DEFAULT_SKIP_GOAL: DailyGoal = {
  kcal: 2000,
  protein_g: 120,
  carbs_g: 250,
  fat_g: 65,
};

export interface CalculatedGoal {
  goal: DailyGoal;
  /** Basal rate, unrounded: kept for "Como calculamos" and for tests. */
  bmr: number;
  /** Basal rate × activity factor, unrounded. */
  expenditure: number;
  /** True when the arithmetic landed under the floor and the floor won. */
  floorApplied: boolean;
}

/** Goals read in tens; a goal of 1.243 kcal pretends to a precision it lacks. */
function roundToTen(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Mifflin-St Jeor: `10·kg + 6,25·cm − 5·anos + 5` for men, `… − 161` for
 * women. Returned unrounded so the rounding happens once, at the end.
 */
export function basalMetabolicRate(
  profile: Pick<GoalProfile, 'sex' | 'ageYears' | 'heightCm' | 'weightKg'>,
): number {
  const base =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.ageYears +
    (profile.sex === 'male' ? 5 : -161);
  return base;
}

/**
 * Protein by body weight, fat as a quarter of the calories, carbohydrates
 * with whatever calories are left. Never negative, even for a floor goal of a
 * very heavy profile.
 */
export function macrosForKcal(
  kcal: number,
  weightKg: number,
): Pick<DailyGoal, 'protein_g' | 'carbs_g' | 'fat_g'> {
  const protein_g = Math.round(PROTEIN_G_PER_KG * weightKg);
  const fat_g = Math.round((FAT_SHARE_OF_KCAL * kcal) / KCAL_PER_GRAM.fat);
  const rest =
    kcal - protein_g * KCAL_PER_GRAM.protein - fat_g * KCAL_PER_GRAM.fat;
  const carbs_g = Math.max(0, Math.round(rest / KCAL_PER_GRAM.carbs));
  return { protein_g, carbs_g, fat_g };
}

/** How much of the goal a macro accounts for, as a whole percentage. */
export function macroPercent(
  macro: keyof typeof KCAL_PER_GRAM,
  grams: number,
  kcal: number,
): number {
  if (kcal <= 0) return 0;
  return Math.round((grams * KCAL_PER_GRAM[macro] * 100) / kcal);
}

/**
 * The whole calculation, in the order it is explained in "Como calculamos":
 * basal rate → activity → intent → round to a multiple of ten → floor.
 */
export function calculateGoal(profile: GoalProfile): CalculatedGoal {
  const bmr = basalMetabolicRate(profile);
  const expenditure = bmr * ACTIVITY_FACTORS[profile.activity];
  const target = expenditure + INTENT_DELTA_KCAL[profile.intent];
  const rounded = roundToTen(target);
  const floor = KCAL_FLOOR[profile.sex];
  const floorApplied = rounded < floor;
  const kcal = floorApplied ? floor : rounded;
  return {
    goal: { kcal, ...macrosForKcal(kcal, profile.weightKg) },
    bmr,
    expenditure,
    floorApplied,
  };
}
