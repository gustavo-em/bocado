/**
 * Which foods the app measures in millilitres (spec 09).
 *
 * Conversion: **1 ml = 1 g**, everywhere. It is an approximation and it is the
 * honest one here: TACO and IBGE publish beverages per 100 g, and the IBGE
 * household measures for milk and juice already arrive in grams — so the
 * numbers the app owns were produced under that very equivalence. Do not
 * "fix" this with an invented density: it would rescale published data that
 * was never per-millilitre to begin with. Millilitres are a label on the same
 * stored grams, never a second stored unit.
 */

/** Beverage-ish categories from TACO, IBGE and Open Food Facts tags. */
const LIQUID_CATEGORY =
  /bebida|suco|refrigerante|beverage|drink|juice|milks?\b|leites?\b/i;

/** The food itself is poured: "Leite, integral", "Suco de laranja", "Água de coco". */
const LIQUID_NAME =
  /^(leite|suco|agua|água|cha|chá|refrigerante|milk|juice|water|tea|soda)\b/i;

/**
 * Poured-looking words that are not a poured food: cheese and yoghurt live in
 * the milk category, and powdered or condensed milk is sold and eaten by
 * weight.
 */
const NOT_LIQUID =
  // `\b` is ASCII-only, so "pó" is bounded by a lookahead instead: it must not
  // be the start of a longer word ("porco", "pote").
  /queijo|requeij|iogurte|manteiga|creme|doce de leite|\bp[oó](?![a-zà-ÿ])|condensad|desidratad|cheese|yogh?urt|butter|powder/i;

export interface LiquidCandidate {
  /** The food's name in either language; the pt one is enough. */
  name?: string;
  /** The source category, already flattened to text. */
  category?: string;
}

/**
 * Whether a bundled food is drunk rather than eaten. The rule is deliberately
 * narrow — beverages, juices and liquid milk — so a cheese never lands in the
 * milk category and starts asking for millilitres.
 */
export function isLiquidFood({ name, category }: LiquidCandidate): boolean {
  const text = `${name ?? ''} ${category ?? ''}`;
  if (NOT_LIQUID.test(text)) return false;
  return LIQUID_CATEGORY.test(category ?? '') || LIQUID_NAME.test(name ?? '');
}
