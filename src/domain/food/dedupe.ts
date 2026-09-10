import { SOURCE_WEIGHT } from './FoodProvider';
import type { NormalizedFood, Serving } from './NormalizedFood';
import { normalizeText } from './units';

/**
 * Merge and dedupe, as fixed in docs/FOOD_DATA_CONTRACT.md: the same product
 * reached through two sources is one row. Pure — the service hands it the
 * local rows and whatever the online providers answered.
 */

/** Grams closer than this are the same measure ("1 cup" of 185 vs 185,0 g). */
const SAME_GRAMS_EPSILON = 0.05;

/**
 * Barcode when there is one, otherwise the normalized name plus brand. Two
 * foods that share this key are the same product.
 */
export function dedupeKey(food: NormalizedFood): string {
  if (food.barcode !== undefined && food.barcode.length > 0)
    return `barcode:${food.barcode}`;
  const name = normalizeText(food.name.pt ?? food.name.en ?? '');
  const brand = normalizeText(food.brand ?? '');
  return `name:${name}|${brand}`;
}

/**
 * Which of two records for the same product the app keeps: verified first,
 * then the source weight, then the more complete record.
 */
export function preferredFood(
  a: NormalizedFood,
  b: NormalizedFood,
): NormalizedFood {
  if (a.verified !== b.verified) return a.verified ? a : b;
  const weightA = SOURCE_WEIGHT[a.source];
  const weightB = SOURCE_WEIGHT[b.source];
  if (weightA !== weightB) return weightA > weightB ? a : b;
  return b.completeness > a.completeness ? b : a;
}

/**
 * The winner's servings plus the loser's, when the loser knows a weight the
 * winner does not. The 100 g reference stays last and the default untouched.
 */
export function mergeServings(
  winner: readonly Serving[],
  loser: readonly Serving[],
): Serving[] {
  const kept = winner.filter(serving => serving.kind !== 'reference');
  const reference = winner[winner.length - 1];
  const grams = new Set(kept.map(serving => serving.grams));
  for (const serving of loser) {
    if (serving.kind === 'reference') continue;
    const known = [...grams].some(
      value => Math.abs(value - serving.grams) < SAME_GRAMS_EPSILON,
    );
    if (known) continue;
    grams.add(serving.grams);
    kept.push({ ...serving, isDefault: false });
  }
  return reference === undefined ? kept : [...kept, reference];
}

/** The winner of a duplicate pair, carrying the servings of both. */
export function mergeFoods(
  a: NormalizedFood,
  b: NormalizedFood,
): NormalizedFood {
  const winner = preferredFood(a, b);
  const loser = winner === a ? b : a;
  return {
    ...winner,
    servings: mergeServings(winner.servings, loser.servings),
    // The link of a label survives a merge into an official row: the ODbL
    // asks for it wherever that data is shown.
    attribution:
      winner.attribution.url === undefined &&
      loser.attribution.url !== undefined
        ? { ...winner.attribution, url: loser.attribution.url }
        : winner.attribution,
  };
}

export interface DedupeResult {
  /** The local rows, enriched with any servings an online duplicate added. */
  base: NormalizedFood[];
  /** Online rows that are not already on screen, in the order given. */
  products: NormalizedFood[];
}

/**
 * Splits the online answer against what the local table already shows. A
 * product that loses to a local row never appears twice: its measures are
 * folded into the local row and it leaves the "Produtos" group.
 */
export function dedupeAgainstLocal(
  local: readonly NormalizedFood[],
  online: readonly NormalizedFood[],
): DedupeResult {
  const byKey = new Map<string, number>();
  const base = local.map((food, index) => {
    byKey.set(dedupeKey(food), index);
    return food;
  });
  const products: NormalizedFood[] = [];
  const seen = new Map<string, number>();

  for (const candidate of online) {
    const key = dedupeKey(candidate);
    const localIndex = byKey.get(key);
    if (localIndex !== undefined) {
      const merged = mergeFoods(base[localIndex], candidate);
      // A local row that loses its own key would break the list: the winner
      // keeps the identity that is already on screen.
      base[localIndex] =
        merged.id === base[localIndex].id
          ? merged
          : { ...base[localIndex], servings: merged.servings };
      continue;
    }
    const productIndex = seen.get(key);
    if (productIndex !== undefined) {
      products[productIndex] = mergeFoods(products[productIndex], candidate);
      continue;
    }
    seen.set(key, products.length);
    products.push(candidate);
  }

  return { base, products };
}
