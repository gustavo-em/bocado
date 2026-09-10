import type { NormalizedFood } from './NormalizedFood';

/**
 * Which group of the search screen a food belongs to. The answer is the
 * food's own origin, never where the row happened to come from: once a
 * product found online is cached in `foods`, the local provider returns it
 * like any other row, and it must still read as "Produtos" with its "Rótulo"
 * badge instead of sliding into "Base" (docs/specs/05).
 */

/**
 * A label, not a table: Open Food Facts, and the USDA Branded rows, which the
 * mapper marks unverified for exactly this reason. TACO, IBGE and the USDA
 * analysed datasets are "Base".
 */
export function isPackagedProduct(food: NormalizedFood): boolean {
  if (food.source === 'off') return true;
  return food.source === 'usda' && !food.verified;
}

export interface FoodGroups {
  /** Official tables and the user's own foods. */
  base: NormalizedFood[];
  /** Branded labels, whichever way they arrived. */
  products: NormalizedFood[];
}

/** Splits one ranked list into the two groups, preserving its order. */
export function groupBySource(foods: readonly NormalizedFood[]): FoodGroups {
  const base: NormalizedFood[] = [];
  const products: NormalizedFood[] = [];
  for (const food of foods) {
    if (isPackagedProduct(food)) products.push(food);
    else base.push(food);
  }
  return { base, products };
}

/**
 * The "Produtos" group as the screen shows it: the cached labels the local
 * search already returned, then whatever the online round added that is not
 * one of them.
 */
export function mergeProductGroups(
  cached: readonly NormalizedFood[],
  online: readonly NormalizedFood[],
): NormalizedFood[] {
  const seen = new Set(cached.map(food => food.id));
  const merged = [...cached];
  for (const food of online) {
    if (seen.has(food.id)) continue;
    seen.add(food.id);
    merged.push(food);
  }
  return merged;
}
