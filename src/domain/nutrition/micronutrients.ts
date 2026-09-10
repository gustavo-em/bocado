/**
 * The day's minerals, fibre and sodium. Everything here works on values that
 * may be missing, and "missing" is never zero: a food the source table never
 * measured must not pull a total down, and must not be counted as covered.
 */

/** The grid, in reading order: two columns, three rows. */
export const GRID_MICRO_KEYS = [
  'fiber',
  'calcium',
  'iron',
  'magnesium',
  'potassium',
  'zinc',
] as const;

/** Shown apart, under "Limites": the word does the semantic work, not a colour. */
export const LIMIT_MICRO_KEYS = ['sodium'] as const;

export type GridMicroKey = (typeof GRID_MICRO_KEYS)[number];
export type MicroKey = GridMicroKey | (typeof LIMIT_MICRO_KEYS)[number];

/** Position of each mineral inside `SeedFood.micro` and the `foods` columns. */
export const MINERAL_ORDER = [
  'iron',
  'calcium',
  'magnesium',
  'potassium',
  'zinc',
] as const;

export type MineralKey = (typeof MINERAL_ORDER)[number];

export type MicroUnit = 'g' | 'mg';

export interface MicroReference {
  amount: number;
  unit: MicroUnit;
}

/**
 * IDR of RDC 269/2005 (Annex II of IN 75/2020), the single adult value every
 * Brazilian label prints. General references, not a personal target — the
 * screen says so in its footnote.
 */
export const DAILY_REFERENCES: Record<MicroKey, MicroReference> = {
  fiber: { amount: 25, unit: 'g' },
  calcium: { amount: 1000, unit: 'mg' },
  iron: { amount: 14, unit: 'mg' },
  magnesium: { amount: 260, unit: 'mg' },
  potassium: { amount: 3510, unit: 'mg' },
  zinc: { amount: 7, unit: 'mg' },
  sodium: { amount: 2000, unit: 'mg' },
};

/** What one diary entry contributes: its grams and what the food has per 100 g. */
export interface MicroContribution {
  grams: number;
  /** `null` and `undefined` both mean "never measured". */
  per100: Partial<Record<MicroKey, number | null | undefined>>;
}

export interface MicroTotal {
  key: MicroKey;
  /** Sum of the entries that had the value; 0 when `hasData` is false. */
  consumed: number;
  reference: number;
  unit: MicroUnit;
  /** consumed / reference, clamped to 1. Past the reference the bar is full. */
  ratio: number;
  /** At least one entry of the day carried this nutrient. */
  hasData: boolean;
}

export interface MicroSummary {
  /** Six cells; the ones with no contributor sink to the end, order kept. */
  grid: MicroTotal[];
  limits: MicroTotal[];
  /**
   * Counted in items, never in percent, and only over the six cells of the
   * grid: sodium is out of the numerator. Nearly every Brazilian label
   * declares sodium and no mineral at all (RDC 429/2020), so counting it
   * would read "11 de 11" over a grid where all six cells say "sem dado".
   */
  coverage: { withData: number; total: number };
}

function measured(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function total(
  entries: readonly MicroContribution[],
  key: MicroKey,
): MicroTotal {
  const { amount, unit } = DAILY_REFERENCES[key];
  let consumed = 0;
  let hasData = false;
  for (const entry of entries) {
    const per100 = entry.per100[key];
    if (!measured(per100)) continue;
    hasData = true;
    consumed += (per100 * entry.grams) / 100;
  }
  return {
    key,
    consumed,
    reference: amount,
    unit,
    ratio: hasData && amount > 0 ? Math.min(consumed / amount, 1) : 0,
    hasData,
  };
}

/**
 * The whole block, computed once from the day's entries. Sorting happens here
 * so the screen never decides it twice.
 */
export function summarizeMicros(
  entries: readonly MicroContribution[],
): MicroSummary {
  const grid = GRID_MICRO_KEYS.map(key => total(entries, key));
  const withValue = grid.filter(cell => cell.hasData);
  const withoutValue = grid.filter(cell => !cell.hasData);
  return {
    grid: [...withValue, ...withoutValue],
    limits: LIMIT_MICRO_KEYS.map(key => total(entries, key)),
    coverage: {
      withData: entries.filter(entry =>
        GRID_MICRO_KEYS.some(key => measured(entry.per100[key])),
      ).length,
      total: entries.length,
    },
  };
}
