/**
 * The one shape every food takes inside the app, whatever its origin.
 * Field-by-field mapping rules live in docs/FOOD_DATA_CONTRACT.md.
 */
export type FoodSource = 'taco' | 'ibge' | 'usda' | 'off' | 'user';

export interface LocalizedText {
  pt?: string;
  en?: string;
}

/** Always per 100 g of edible portion (per 100 ml for liquids when density is unknown). */
export interface Per100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  saturated_fat_g?: number;
  /**
   * The five minerals the bundled tables cover (task 20), in mg per 100 g.
   * Absent means the source never measured it — never zero.
   */
  iron_mg?: number;
  calcium_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  zinc_mg?: number;
  /** Where the energy came from: the source, converted from kJ, or 4/4/9 from macros. */
  energySource: 'declared' | 'kj_converted' | 'atwater';
}

export type ServingKind = 'household' | 'package' | 'reference';

export interface Serving {
  /** Stable inside the food: "ibge:colher-de-sopa-cheia", "off:serving", "ref:100g". */
  id: string;
  label: LocalizedText;
  grams: number;
  kind: ServingKind;
  /** Exactly one serving per food is the default. */
  isDefault: boolean;
}

export type LicenseId =
  | 'TACO'
  | 'IBGE-open-data'
  | 'ODbL-1.0+DbCL'
  | 'CC0-1.0'
  | 'user';

export interface Attribution {
  license: LicenseId;
  /** Ready to display. */
  text: string;
  /** Product page for Open Food Facts (their terms require the link). */
  url?: string;
}

export interface NormalizedFood {
  /** `${source}:${sourceId}` — the global primary key, e.g. "taco:3", "off:7891000100103". */
  id: string;
  source: FoodSource;
  sourceId: string;
  name: LocalizedText;
  /** Search-only aliases (an IBGE name folded into a TACO row, a brand nickname). */
  aliases?: string[];
  brand?: string;
  /** GTIN-13, zero-padded when it arrived as UPC-A. */
  barcode?: string;
  category?: LocalizedText;
  /** true for official tables (TACO, IBGE, USDA Foundation/SR Legacy); false for labels and user data. */
  verified: boolean;
  per100g: Per100g;
  /** Default first; always ends with the 100 g reference. */
  servings: Serving[];
  isLiquid?: boolean;
  /** 0..1 — how complete the record is (Open Food Facts `completeness`, or 1 for official tables). */
  completeness: number;
  /** Ranking hint for staples from the bundled dataset (3 = daily staple). Never from an online source. */
  boost?: number;
  /** ISO date; the bundle build date for bundled foods. */
  lastFetchedAt: string;
  attribution: Attribution;
}

/** The reference serving every food carries as its last entry. */
export const REFERENCE_SERVING: Serving = {
  id: 'ref:100g',
  label: { pt: '100 g', en: '100 g' },
  grams: 100,
  kind: 'reference',
  isDefault: false,
};

export const MAX_KCAL_PER_100G = 950;
export const MAX_MACROS_PER_100G = 105;

/** Invariants the domain enforces. Returns the list of violations (empty = valid). */
export function validateFood(food: NormalizedFood): string[] {
  const problems: string[] = [];
  const { kcal, protein_g, carbs_g, fat_g } = food.per100g;
  for (const [name, value] of Object.entries({
    kcal,
    protein_g,
    carbs_g,
    fat_g,
  })) {
    if (!Number.isFinite(value) || value < 0)
      problems.push(`${name} must be a finite number ≥ 0`);
  }
  if (kcal > MAX_KCAL_PER_100G)
    problems.push(`kcal above ${MAX_KCAL_PER_100G}`);
  if (protein_g + carbs_g + fat_g > MAX_MACROS_PER_100G)
    problems.push(`macros above ${MAX_MACROS_PER_100G} g`);
  if (food.servings.filter(serving => serving.isDefault).length !== 1)
    problems.push('exactly one default serving');
  const last = food.servings[food.servings.length - 1];
  if (!last || last.kind !== 'reference' || last.grams !== 100)
    problems.push('last serving must be the 100 g reference');
  if (food.id !== `${food.source}:${food.sourceId}`)
    problems.push('id must be source:sourceId');
  return problems;
}
