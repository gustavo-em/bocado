import type { Locale } from './FoodProvider';
import {
  MAX_KCAL_PER_100G,
  MAX_MACROS_PER_100G,
  REFERENCE_SERVING,
  type NormalizedFood,
  type Serving,
} from './NormalizedFood';
import { roundTo } from './portion';

/**
 * "Registrar só as calorias" (docs/specs/05): the escape hatch for a food no
 * table has. The user types kcal — macros and a name are optional — and the
 * app stores a real food so the diary entry, its snapshot and the totals all
 * behave exactly like any other row.
 */

export const QUICK_PREFIX = 'user:quick-';

/** A quick entry is written as one portion of this serving. */
export const QUICK_SERVING_ID = 'user:quick';

export function isQuickLog(foodId: string): boolean {
  return foodId.startsWith(QUICK_PREFIX);
}

export interface QuickLogInput {
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  /** Falls back to the localized "Registro rápido". */
  name?: string;
  /** Injectable so a test does not depend on the clock or on randomness. */
  id?: string;
  fetchedAt?: string;
}

export const QUICK_LIMITS = { kcal: 9999, macro: 999 } as const;

function positive(value: number | undefined, max: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, max);
}

/**
 * The grams one quick entry weighs. A food's per-100 g values may not exceed
 * the domain's ceilings, so a 1.500 kcal plate is stored as a heavier portion
 * of a legal food instead of an impossible 100 g row. The entry's snapshot is
 * the typed number either way.
 */
export function quickGrams(
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
): number {
  const macros = protein + carbs + fat;
  const factor = Math.max(
    1,
    kcal / (MAX_KCAL_PER_100G - 50),
    macros / (MAX_MACROS_PER_100G - 5),
  );
  return roundTo(100 * factor, 2);
}

/**
 * A `user:quick-*` food carrying exactly what was typed. Unverified, never
 * boosted, never fetched: it is the user's own note.
 */
export function buildQuickFood(
  input: QuickLogInput,
  fallbackName: string,
  _locale: Locale = 'pt-BR',
): NormalizedFood {
  const kcal = positive(input.kcal, QUICK_LIMITS.kcal);
  const protein = positive(input.protein, QUICK_LIMITS.macro);
  const carbs = positive(input.carbs, QUICK_LIMITS.macro);
  const fat = positive(input.fat, QUICK_LIMITS.macro);
  const grams = quickGrams(kcal, protein, carbs, fat);
  const scale = 100 / grams;
  const name = input.name?.trim() || fallbackName;
  const sourceId = `quick-${input.id ?? String(Date.now())}`;

  const serving: Serving = {
    id: QUICK_SERVING_ID,
    label: { pt: name, en: name },
    grams,
    kind: 'package',
    isDefault: true,
  };

  return {
    id: `user:${sourceId}`,
    source: 'user',
    sourceId,
    name: { pt: name, en: name },
    verified: false,
    per100g: {
      kcal: roundTo(kcal * scale, 4),
      protein_g: roundTo(protein * scale, 4),
      carbs_g: roundTo(carbs * scale, 4),
      fat_g: roundTo(fat * scale, 4),
      energySource: 'declared',
    },
    servings: [serving, REFERENCE_SERVING],
    completeness: 0,
    lastFetchedAt: input.fetchedAt ?? new Date().toISOString(),
    attribution: { license: 'user', text: '' },
  };
}
