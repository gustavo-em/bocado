import {
  REFERENCE_SERVING,
  validateFood,
  type NormalizedFood,
  type Per100g,
  type Serving,
} from '../NormalizedFood';
import { atwaterKcal, kjToKcal, normalizeBarcode, num } from '../units';

/**
 * USDA FoodData Central → `NormalizedFood`, as fixed in
 * docs/FOOD_DATA_CONTRACT.md. Pure: it takes the raw JSON of
 * `/foods/search`, of the full detail endpoint and of the abridged one, which
 * each name their nutrients differently.
 */

export const USDA_ATTRIBUTION_TEXT =
  'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, fdc.nal.usda.gov';

export const USDA_FOOD_URL = 'https://fdc.nal.usda.gov/food-details';

/** The nutrient ids the app reads. */
export const USDA_NUTRIENT = {
  energyKcal: 1008,
  energyAtwaterGeneral: 2048,
  energyAtwaterSpecific: 2047,
  energyKj: 1062,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugars: 2000,
  sodium: 1093,
  saturatedFat: 1258,
  /** All five already in milligrams per 100 g. */
  iron: 1089,
  calcium: 1087,
  magnesium: 1090,
  potassium: 1092,
  zinc: 1095,
} as const;

/** The abridged payload identifies nutrients by their legacy number only. */
const NUMBER_TO_ID: Record<string, number> = {
  '203': USDA_NUTRIENT.protein,
  '204': USDA_NUTRIENT.fat,
  '205': USDA_NUTRIENT.carbs,
  '208': USDA_NUTRIENT.energyKcal,
  '268': USDA_NUTRIENT.energyKj,
  '269': USDA_NUTRIENT.sugars,
  '291': USDA_NUTRIENT.fiber,
  '307': USDA_NUTRIENT.sodium,
  '606': USDA_NUTRIENT.saturatedFat,
  '957': USDA_NUTRIENT.energyAtwaterSpecific,
  '958': USDA_NUTRIENT.energyAtwaterGeneral,
};

/** Datasets analysed by USDA itself; Branded is label data, like Open Food Facts. */
const VERIFIED_TYPES = new Set(['Foundation', 'SR Legacy', 'Survey (FNDDS)']);

export interface UsdaFood {
  fdcId?: unknown;
  description?: unknown;
  dataType?: unknown;
  brandName?: unknown;
  brandOwner?: unknown;
  gtinUpc?: unknown;
  servingSize?: unknown;
  servingSizeUnit?: unknown;
  householdServingFullText?: unknown;
  foodCategory?: unknown;
  foodNutrients?: unknown;
  foodPortions?: unknown;
}

export interface UsdaSearchResponse {
  foods?: unknown;
}

function textOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * `{ nutrientId, value }` (search), `{ nutrient: { id }, amount }` (detail)
 * and `{ number, amount }` (abridged) folded into one lookup by id.
 */
export function usdaNutrients(raw: unknown): Map<number, number> {
  const values = new Map<number, number>();
  if (!Array.isArray(raw)) return values;
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as {
      nutrientId?: unknown;
      nutrient?: { id?: unknown; number?: unknown };
      number?: unknown;
      value?: unknown;
      amount?: unknown;
    };
    const id =
      num(item.nutrientId) ??
      num(item.nutrient?.id) ??
      NUMBER_TO_ID[String(item.number ?? item.nutrient?.number ?? '')];
    const value = num(item.value) ?? num(item.amount);
    if (id === undefined || value === undefined) continue;
    if (!values.has(id)) values.set(id, value);
  }
  return values;
}

interface Energy {
  kcal: number;
  energySource: Per100g['energySource'];
}

/** 1008 → 2048 → 2047 → 1062 in kJ → Atwater over the macros. */
export function usdaEnergy(
  values: Map<number, number>,
  protein: number,
  carbs: number,
  fat: number,
): Energy | null {
  for (const id of [
    USDA_NUTRIENT.energyKcal,
    USDA_NUTRIENT.energyAtwaterGeneral,
    USDA_NUTRIENT.energyAtwaterSpecific,
  ]) {
    const declared = values.get(id);
    if (declared !== undefined)
      return { kcal: declared, energySource: 'declared' };
  }
  const kj = values.get(USDA_NUTRIENT.energyKj);
  if (kj !== undefined)
    return { kcal: kjToKcal(kj), energySource: 'kj_converted' };
  const hasMacros =
    values.has(USDA_NUTRIENT.protein) ||
    values.has(USDA_NUTRIENT.carbs) ||
    values.has(USDA_NUTRIENT.fat);
  if (!hasMacros) return null;
  return { kcal: atwaterKcal(protein, carbs, fat), energySource: 'atwater' };
}

/** `{ amount: 1, modifier: "cup" }` → "1 cup"; the measure unit is the fallback. */
function portionLabel(portion: {
  amount?: unknown;
  modifier?: unknown;
  measureUnit?: { name?: unknown };
  portionDescription?: unknown;
}): string | undefined {
  const described = textOf(portion.portionDescription);
  const unit =
    textOf(portion.modifier) ??
    (textOf(portion.measureUnit?.name) === 'undetermined'
      ? undefined
      : textOf(portion.measureUnit?.name));
  const amount = num(portion.amount);
  if (unit !== undefined)
    return amount === undefined ? unit : `${amount} ${unit}`;
  return described;
}

function usdaServings(food: UsdaFood): Serving[] {
  const servings: Serving[] = [];

  const portions = Array.isArray(food.foodPortions) ? food.foodPortions : [];
  for (const entry of portions) {
    if (typeof entry !== 'object' || entry === null) continue;
    const portion = entry as { gramWeight?: unknown; id?: unknown };
    const grams = num(portion.gramWeight);
    const label = portionLabel(entry as Parameters<typeof portionLabel>[0]);
    if (grams === undefined || grams <= 0 || label === undefined) continue;
    servings.push({
      id: `usda:portion:${num(portion.id) ?? servings.length}`,
      label: { en: label },
      grams,
      kind: 'household',
      isDefault: servings.length === 0,
    });
  }

  if (servings.length === 0) {
    // Branded rows carry the label serving instead of household measures.
    const grams = num(food.servingSize);
    const unit = textOf(food.servingSizeUnit)?.toLowerCase();
    if (
      grams !== undefined &&
      grams > 0 &&
      (unit === undefined || unit === 'g' || unit === 'ml')
    ) {
      const label =
        textOf(food.householdServingFullText) ?? `${grams} ${unit ?? 'g'}`;
      servings.push({
        id: 'usda:serving',
        label: { en: label },
        grams,
        kind: 'package',
        isDefault: true,
      });
    }
  }

  if (servings.length === 0) return [{ ...REFERENCE_SERVING, isDefault: true }];
  servings.push(REFERENCE_SERVING);
  return servings;
}

export interface UsdaMapOptions {
  fetchedAt?: string;
}

/** One food, from any of the three payload shapes. `null` when unusable. */
export function mapUsdaFood(
  raw: unknown,
  options: UsdaMapOptions = {},
): NormalizedFood | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const food = raw as UsdaFood;
  const fdcId = num(food.fdcId);
  const description = textOf(food.description);
  if (fdcId === undefined || description === undefined) return null;

  const values = usdaNutrients(food.foodNutrients);
  const protein = values.get(USDA_NUTRIENT.protein) ?? 0;
  const carbs = values.get(USDA_NUTRIENT.carbs) ?? 0;
  const fat = values.get(USDA_NUTRIENT.fat) ?? 0;
  const energy = usdaEnergy(values, protein, carbs, fat);
  if (energy === null) return null;

  const dataType = textOf(food.dataType);
  const gtin = textOf(food.gtinUpc);
  const sourceId = String(fdcId);
  const category = textOf(food.foodCategory);

  const normalized: NormalizedFood = {
    id: `usda:${sourceId}`,
    source: 'usda',
    sourceId,
    name: { en: description },
    brand: textOf(food.brandName) ?? textOf(food.brandOwner),
    // UPC-A arrives with 12 digits; the app keys products on GTIN-13.
    barcode: gtin === undefined ? undefined : normalizeBarcode(gtin),
    category: category === undefined ? undefined : { en: category },
    verified: dataType !== undefined && VERIFIED_TYPES.has(dataType),
    per100g: {
      kcal: energy.kcal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: values.get(USDA_NUTRIENT.fiber),
      sugar_g: values.get(USDA_NUTRIENT.sugars),
      /** 1093 is already in milligrams. */
      sodium_mg: values.get(USDA_NUTRIENT.sodium),
      saturated_fat_g: values.get(USDA_NUTRIENT.saturatedFat),
      iron_mg: values.get(USDA_NUTRIENT.iron),
      calcium_mg: values.get(USDA_NUTRIENT.calcium),
      magnesium_mg: values.get(USDA_NUTRIENT.magnesium),
      potassium_mg: values.get(USDA_NUTRIENT.potassium),
      zinc_mg: values.get(USDA_NUTRIENT.zinc),
      energySource: energy.energySource,
    },
    servings: usdaServings(food),
    completeness: 1,
    lastFetchedAt: options.fetchedAt ?? new Date().toISOString(),
    attribution: {
      license: 'CC0-1.0',
      text: USDA_ATTRIBUTION_TEXT,
      url: `${USDA_FOOD_URL}/${sourceId}/nutrients`,
    },
  };

  return validateFood(normalized).length === 0 ? normalized : null;
}

/** `{ foods }` of `/foods/search`; unusable rows are dropped. */
export function mapUsdaSearch(
  raw: unknown,
  options: UsdaMapOptions = {},
): NormalizedFood[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const { foods } = raw as UsdaSearchResponse;
  if (!Array.isArray(foods)) return [];
  const mapped: NormalizedFood[] = [];
  for (const food of foods) {
    const normalized = mapUsdaFood(food, options);
    if (normalized !== null) mapped.push(normalized);
  }
  return mapped;
}
