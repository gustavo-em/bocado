import {
  REFERENCE_SERVING,
  validateFood,
  type NormalizedFood,
  type Per100g,
  type Serving,
} from '../NormalizedFood';
import {
  atwaterKcal,
  kjToKcal,
  normalizeBarcode,
  num,
  saltToSodiumMg,
} from '../units';

/**
 * Open Food Facts → `NormalizedFood`, exactly as fixed in
 * docs/FOOD_DATA_CONTRACT.md. Pure and payload-shaped: it takes the raw JSON
 * of both endpoints the app uses — `/api/v2/product/{barcode}` and the
 * search-a-licious `/search` hit — and never touches the network.
 */

/** Ready to display; the product page link their terms require. */
export const OFF_ATTRIBUTION_TEXT =
  'Dados de produto: © Open Food Facts contributors (ODbL)';

export const OFF_PRODUCT_URL = 'https://br.openfoodfacts.org/produto';

/**
 * The raw payload, typed as loosely as it really is: Open Food Facts sends
 * numbers as strings often enough that every read goes through `num`.
 */
export interface OffProduct {
  code?: unknown;
  product_name?: unknown;
  product_name_pt?: unknown;
  product_name_en?: unknown;
  /** A comma-separated string on the product endpoint, an array on search. */
  brands?: unknown;
  serving_size?: unknown;
  serving_quantity?: unknown;
  serving_quantity_unit?: unknown;
  nutriments?: Record<string, unknown>;
  /** Never read: values guessed from the ingredient list are not label data. */
  nutriments_estimated?: Record<string, unknown>;
  completeness?: unknown;
  categories_tags?: unknown;
}

export interface OffSearchResponse {
  hits?: unknown;
}

export interface OffProductResponse {
  product?: unknown;
  status?: unknown;
}

function textOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** `"Nestlé, Moça"` and `["Nestlé", "Moça"]` both mean Nestlé. */
export function firstBrand(brands: unknown): string | undefined {
  if (Array.isArray(brands)) return textOf(brands[0]);
  const text = textOf(brands);
  return text === undefined ? undefined : textOf(text.split(',')[0]);
}

/** `"en:condensed-milks"` → `"condensed milks"`, most specific tag first. */
function categoryOf(tags: unknown): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  const last = tags[tags.length - 1];
  const text = textOf(last);
  if (text === undefined) return undefined;
  return text.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
}

interface Energy {
  kcal: number;
  energySource: Per100g['energySource'];
}

/**
 * kcal per 100 g and where it came from: the declared value, the kJ value
 * converted (`energy_100g` is always kJ), or Atwater over the macros.
 */
export function offEnergy(
  nutriments: Record<string, unknown>,
  protein: number,
  carbs: number,
  fat: number,
): Energy | null {
  const declared = num(nutriments['energy-kcal_100g']);
  if (declared !== undefined)
    return { kcal: declared, energySource: 'declared' };
  const kj = num(nutriments['energy-kj_100g']) ?? num(nutriments.energy_100g);
  if (kj !== undefined)
    return { kcal: kjToKcal(kj), energySource: 'kj_converted' };
  const hasMacros =
    num(nutriments.proteins_100g) !== undefined ||
    num(nutriments.carbohydrates_100g) !== undefined ||
    num(nutriments.fat_100g) !== undefined;
  if (!hasMacros) return null;
  return { kcal: atwaterKcal(protein, carbs, fat), energySource: 'atwater' };
}

/** Sodium is declared in **grams**; salt is the fallback. */
export function offSodiumMg(
  nutriments: Record<string, unknown>,
): number | undefined {
  const sodium = num(nutriments.sodium_100g);
  if (sodium !== undefined) return sodium * 1000;
  const salt = num(nutriments.salt_100g);
  return salt === undefined ? undefined : saltToSodiumMg(salt);
}

/**
 * Minerals arrive like sodium does: `<nutrient>_100g` normalised to **grams**,
 * so the app multiplies to reach the milligrams it stores. Brazilian labels
 * almost never carry them (RDC 429/2020 does not require any mineral but
 * sodium), and an absent key stays absent — it is not a zero.
 */
export function offMineralMg(
  nutriments: Record<string, unknown>,
  nutrient: 'iron' | 'calcium' | 'magnesium' | 'potassium' | 'zinc',
): number | undefined {
  const grams = num(nutriments[`${nutrient}_100g`]);
  return grams === undefined ? undefined : grams * 1000;
}

function offServings(product: OffProduct): Serving[] {
  const grams = num(product.serving_quantity);
  const unit = textOf(product.serving_quantity_unit)?.toLowerCase();
  const label = textOf(product.serving_size);
  const usable =
    grams !== undefined &&
    grams > 0 &&
    (unit === undefined || unit === 'g' || unit === 'ml');
  if (!usable || grams === undefined) {
    return [{ ...REFERENCE_SERVING, isDefault: true }];
  }
  return [
    {
      id: 'off:serving',
      // The label is the printed one ("20 g", "1 porção (20 g)"), so the row
      // can repeat it verbatim instead of inventing a count.
      label: { pt: label ?? `${grams} g`, en: label ?? `${grams} g` },
      grams,
      kind: 'package',
      isDefault: true,
    },
    REFERENCE_SERVING,
  ];
}

export interface OffMapOptions {
  /** Overrides `lastFetchedAt`; defaults to now. */
  fetchedAt?: string;
}

/**
 * One product. Returns `null` when the record carries no usable label data —
 * a product whose only numbers live in `nutriments_estimated` is not a label.
 */
export function mapOffProduct(
  raw: unknown,
  options: OffMapOptions = {},
): NormalizedFood | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const product = raw as OffProduct;
  const code = textOf(product.code);
  if (code === undefined) return null;
  const barcode = normalizeBarcode(code);
  if (barcode.length === 0) return null;

  const nutriments = product.nutriments;
  if (typeof nutriments !== 'object' || nutriments === null) return null;

  const name =
    textOf(product.product_name_pt) ??
    textOf(product.product_name) ??
    undefined;
  const nameEn =
    textOf(product.product_name_en) ??
    textOf(product.product_name) ??
    undefined;
  if (name === undefined && nameEn === undefined) return null;

  const protein = num(nutriments.proteins_100g) ?? 0;
  const carbs = num(nutriments.carbohydrates_100g) ?? 0;
  const fat = num(nutriments.fat_100g) ?? 0;
  const energy = offEnergy(nutriments, protein, carbs, fat);
  if (energy === null) return null;

  const completeness = num(product.completeness) ?? 0;
  const category = categoryOf(product.categories_tags);

  const food: NormalizedFood = {
    id: `off:${barcode}`,
    source: 'off',
    sourceId: barcode,
    name: { pt: name, en: nameEn },
    brand: firstBrand(product.brands),
    barcode,
    category: category === undefined ? undefined : { en: category },
    verified: false,
    per100g: {
      kcal: energy.kcal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: num(nutriments.fiber_100g),
      sugar_g: num(nutriments.sugars_100g),
      sodium_mg: offSodiumMg(nutriments),
      saturated_fat_g: num(nutriments['saturated-fat_100g']),
      iron_mg: offMineralMg(nutriments, 'iron'),
      calcium_mg: offMineralMg(nutriments, 'calcium'),
      magnesium_mg: offMineralMg(nutriments, 'magnesium'),
      potassium_mg: offMineralMg(nutriments, 'potassium'),
      zinc_mg: offMineralMg(nutriments, 'zinc'),
      energySource: energy.energySource,
    },
    servings: offServings(product),
    // The label states its own unit: a serving measured in millilitres is a
    // drink, and the sheet says ml for it (spec 09).
    isLiquid: textOf(product.serving_quantity_unit)?.toLowerCase() === 'ml',
    completeness: Math.min(Math.max(completeness, 0), 1),
    lastFetchedAt: options.fetchedAt ?? new Date().toISOString(),
    attribution: {
      license: 'ODbL-1.0+DbCL',
      text: OFF_ATTRIBUTION_TEXT,
      url: `${OFF_PRODUCT_URL}/${barcode}`,
    },
  };

  return validateFood(food).length === 0 ? food : null;
}

/** `{ product }` of `/api/v2/product/{barcode}`. */
export function mapOffProductResponse(
  raw: unknown,
  options: OffMapOptions = {},
): NormalizedFood | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { product } = raw as OffProductResponse;
  return product === undefined ? null : mapOffProduct(product, options);
}

/** `{ hits }` of the search-a-licious endpoint; unusable hits are dropped. */
export function mapOffSearch(
  raw: unknown,
  options: OffMapOptions = {},
): NormalizedFood[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const { hits } = raw as OffSearchResponse;
  if (!Array.isArray(hits)) return [];
  const foods: NormalizedFood[] = [];
  for (const hit of hits) {
    const food = mapOffProduct(hit, options);
    if (food !== null) foods.push(food);
  }
  return foods;
}
