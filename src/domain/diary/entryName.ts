import type { Locale } from '../food/FoodProvider';
import type { Serving } from '../food/NormalizedFood';
import { servingLabel } from '../food/portion';

/** The two names a diary entry carries; `foodNameEn` is often absent. */
export interface NamedEntry {
  foodName: string;
  foodNameEn?: string;
}

/** What an entry knows about the measure it was written with. */
export interface MeasuredEntry {
  /** The label as it was written, in the language of that moment. */
  servingLabel?: string;
  /** The measures of the food today, read live from `foods`. */
  foodServings?: readonly Serving[];
}

/**
 * Name of a logged food in the language of the app, with the same rule as
 * `localizedName` for search results: English when the bundled glossary
 * covered the whole name, the Portuguese name otherwise — never half of each.
 * Resolved at render, so switching the language in "Metas" changes what the
 * diary prints without re-importing the seed or rewriting a single row.
 */
export function entryName(entry: NamedEntry, locale: Locale): string {
  return locale === 'en-US'
    ? entry.foodNameEn ?? entry.foodName
    : entry.foodName;
}

/**
 * Label of the household measure of an entry, in the language of the app. The
 * diary stores the text that was on screen when the entry was written, so an
 * entry logged in Portuguese would keep "colher de servir cheia" forever next
 * to an English name — half of each, which the app does not do. The stored
 * text is matched against the measures the food has today and re-read in the
 * current language; a measure the glossary never covered keeps its Portuguese
 * label, in both languages.
 */
export function entryServingLabel(
  entry: MeasuredEntry,
  locale: Locale,
): string | undefined {
  const stored = entry.servingLabel;
  if (stored === undefined) return undefined;
  const measure = entry.foodServings?.find(
    serving => serving.label.pt === stored || serving.label.en === stored,
  );
  return (measure ? servingLabel(measure, locale) : undefined) ?? stored;
}
