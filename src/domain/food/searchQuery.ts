import { normalizeText } from './units';

/**
 * The form both sides of a search share: lowercase ASCII words separated by
 * single spaces. `foods.name_norm`, the FTS index and the typed query all go
 * through it, so "pao" and "Pão" meet in the middle.
 */
export function searchKey(text: string): string {
  return normalizeText(text);
}

/** Query words, already normalized; empty for blank input. */
export function searchTerms(query: string): string[] {
  const key = searchKey(query);
  return key.length === 0 ? [] : key.split(' ');
}

/**
 * FTS5 MATCH expression with prefix matching on every word:
 * `"arroz"* "int"*` (implicit AND). Terms only contain `[a-z0-9]`, so quoting
 * is always safe. `null` when the query has no searchable word.
 */
export function buildFtsMatch(query: string): string | null {
  const terms = searchTerms(query);
  if (terms.length === 0) return null;
  return terms.map(term => `"${term}"*`).join(' ');
}

/**
 * `searchKey` without collapsing: one output character per input character,
 * so an index found in the key points at the same character of the original
 * name. Used to bold the typed part of a result name.
 */
export function alignedKey(text: string): string {
  let out = '';
  for (const char of text) {
    const folded = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += folded.length === 1 && /[a-z0-9]/.test(folded) ? folded : ' ';
  }
  return out;
}

export interface MatchRange {
  start: number;
  end: number;
}

/**
 * Character ranges of `text` (by code point index) that start a word matching
 * a query term. Ranges never overlap; sorted by start.
 */
export function matchRanges(text: string, query: string): MatchRange[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];
  const key = alignedKey(text);
  const ranges: MatchRange[] = [];
  for (const term of terms) {
    let from = 0;
    while (from < key.length) {
      const index = key.indexOf(term, from);
      if (index === -1) break;
      const wordStart = index === 0 || key[index - 1] === ' ';
      if (wordStart) ranges.push({ start: index, end: index + term.length });
      from = index + 1;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: MatchRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end)
      last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}
