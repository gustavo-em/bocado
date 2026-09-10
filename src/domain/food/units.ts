/** Shared conversions used by every provider mapper. */

export const kjToKcal = (kj: number): number => kj / 4.184;

export const sodiumGToMg = (grams: number): number => grams * 1000;

/** NaCl is 39.3 % sodium ≈ 1/2.5. */
export const saltToSodiumMg = (saltGrams: number): number =>
  (saltGrams / 2.5) * 1000;

/** Atwater general factors: 4 kcal/g protein and carbohydrate, 9 kcal/g fat. */
export const atwaterKcal = (
  protein: number,
  carbs: number,
  fat: number,
): number => 4 * protein + 4 * carbs + 9 * fat;

/**
 * Parses the values the tables actually contain: numbers, numeric strings with
 * a decimal comma, "Tr" (trace → 0) and the many spellings of "not available".
 */
export function num(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  const text = String(value).trim();
  if (text === '' || text === 'NA' || text === '-' || text === '*')
    return undefined;
  if (text === 'Tr' || text === 'tr') return 0;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Lowercase, no diacritics, single spaces: the form the search index and dedupe keys use. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** UPC-A (12 digits) becomes GTIN-13 with a leading zero; anything else is returned trimmed. */
export function normalizeBarcode(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.length === 12 ? `0${digits}` : digits;
}

/** Nutrients of `grams` of a food, from its per-100 g values. Rounding is a display concern. */
export function scaleNutrients(
  per100g: { kcal: number; protein_g: number; carbs_g: number; fat_g: number },
  grams: number,
) {
  const factor = grams / 100;
  return {
    kcal: per100g.kcal * factor,
    protein: per100g.protein_g * factor,
    carbs: per100g.carbs_g * factor,
    fat: per100g.fat_g * factor,
  };
}
