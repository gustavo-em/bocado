import { SOURCE_WEIGHT, type Locale } from './FoodProvider';
import type { FoodSource, NormalizedFood } from './NormalizedFood';
import { searchKey, searchTerms } from './searchQuery';

/**
 * Ranking of the "Base" and "Produtos" groups, as fixed in
 * docs/FOOD_DATA_CONTRACT.md ("Merge, dedupe and ranking"). Pure: the data
 * layer fetches candidates (FTS prefix match) and hands them here.
 */

export interface RankCandidate {
  food: NormalizedFood;
  /** From `food_usage.use_count`; 0 when the food was never logged. */
  useCount?: number;
}

export interface RankedFood extends RankCandidate {
  score: number;
  relevance: number;
}

export const RELEVANCE = {
  exact: 100,
  namePrefix: 80,
  wordPrefix: 65,
  aliasPrefix: 60,
  contains: 50,
  none: 0,
} as const;

export const VERIFIED_GENERIC_BONUS = 15;
export const LOCALE_NAME_BONUS = 10;
export const SHORT_NAME_BASE = 8;
export const COMPLETENESS_WEIGHT = 10;
export const BOOST_WEIGHT = 6;
export const USAGE_WEIGHT = 6;

const EN_US_SOURCE_WEIGHT: Record<FoodSource, number> = {
  ...SOURCE_WEIGHT,
  usda: 32,
  taco: 18,
};

/** The tables that ship with the app; only they are lifted by the glossary. */
const BUNDLED_SOURCES = new Set<FoodSource>(['taco', 'ibge']);

/**
 * Weight of the source for this locale. The en-US table demotes the bundled
 * Brazilian tables and promotes the USDA, which is right only while a bundled
 * row has no English name: a Portuguese name in an English list is worth less
 * than an English one. Once the glossary gives that row an English name
 * (task 21), the data contract applies again — the bundled base is the primary
 * source — so it goes back to its base weight. Every other source keeps the
 * en-US weight it already had; the USDA stays at 32.
 */
export function sourceWeight(
  source: FoodSource,
  locale: Locale,
  hasLocaleName = false,
): number {
  const lifted = hasLocaleName && BUNDLED_SOURCES.has(source);
  return locale === 'en-US' && !lifted
    ? EN_US_SOURCE_WEIGHT[source]
    : SOURCE_WEIGHT[source];
}

export function localizedName(food: NormalizedFood, locale: Locale): string {
  const preferred = locale === 'en-US' ? food.name.en : food.name.pt;
  return preferred ?? food.name.pt ?? food.name.en ?? '';
}

function everyTermPrefixesAWord(terms: string[], words: string[]): boolean {
  return terms.every(term => words.some(word => word.startsWith(term)));
}

function everyTermContained(terms: string[], haystack: string): boolean {
  return terms.every(term => haystack.includes(term));
}

/**
 * Text tier of one food against an already-normalized query. `0` means the
 * food does not match and must be excluded.
 */
export function textRelevance(
  food: NormalizedFood,
  queryKey: string,
  locale: Locale = 'pt-BR',
): number {
  const terms = queryKey.length === 0 ? [] : queryKey.split(' ');
  if (terms.length === 0) return RELEVANCE.none;

  /*
    Only what the app would print in this language, plus the Portuguese name as
    the fallback it already is. In pt-BR the English name of a bundled food is
    index text and nothing else: a food must never surface in Portuguese
    because of a word the screen will not show.
  */
  const names = [localizedName(food, locale), food.name.pt]
    .filter((name): name is string => Boolean(name))
    .map(searchKey);
  const aliases = (food.aliases ?? []).map(searchKey);

  if (names.some(name => name === queryKey)) return RELEVANCE.exact;
  if (names.some(name => name.startsWith(queryKey)))
    return RELEVANCE.namePrefix;
  if (names.some(name => everyTermPrefixesAWord(terms, name.split(' '))))
    return RELEVANCE.wordPrefix;
  if (
    aliases.some(
      alias =>
        alias.startsWith(queryKey) ||
        everyTermPrefixesAWord(terms, alias.split(' ')),
    )
  )
    return RELEVANCE.aliasPrefix;
  const haystack = [...names, ...aliases].join(' ');
  if (everyTermContained(terms, haystack)) return RELEVANCE.contains;
  return RELEVANCE.none;
}

/** Full score for one candidate; `relevance` must already be > 0. */
export function scoreFood(
  candidate: RankCandidate,
  relevance: number,
  locale: Locale,
): number {
  const { food } = candidate;
  const nameKey = searchKey(localizedName(food, locale));
  const wordCount = nameKey.length === 0 ? 0 : nameKey.split(' ').length;
  const hasLocaleName =
    locale === 'en-US' ? Boolean(food.name.en) : Boolean(food.name.pt);
  return (
    relevance +
    (food.verified && !food.brand ? VERIFIED_GENERIC_BONUS : 0) +
    sourceWeight(food.source, locale, hasLocaleName) +
    (hasLocaleName ? LOCALE_NAME_BONUS : 0) +
    (SHORT_NAME_BASE - wordCount) +
    COMPLETENESS_WEIGHT * food.completeness +
    BOOST_WEIGHT * (food.boost ?? 0) +
    USAGE_WEIGHT * Math.log1p(candidate.useCount ?? 0)
  );
}

/**
 * Orders candidates for a query. Non-matching foods are dropped; ties break
 * on shorter name, then alphabetical, so the order is stable across runs.
 */
export function rankFoods(
  candidates: readonly RankCandidate[],
  query: string,
  locale: Locale = 'pt-BR',
): RankedFood[] {
  const queryKey = searchTerms(query).join(' ');
  if (queryKey.length === 0) return [];
  const ranked: RankedFood[] = [];
  for (const candidate of candidates) {
    const relevance = textRelevance(candidate.food, queryKey, locale);
    if (relevance === RELEVANCE.none) continue;
    ranked.push({
      ...candidate,
      relevance,
      score: scoreFood(candidate, relevance, locale),
    });
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const nameA = localizedName(a.food, locale);
    const nameB = localizedName(b.food, locale);
    if (nameA.length !== nameB.length) return nameA.length - nameB.length;
    return nameA.localeCompare(nameB);
  });
  return ranked;
}
