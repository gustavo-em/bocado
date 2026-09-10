/**
 * Term-by-term Portuguese → English translation of the bundled food names,
 * applied at build time by scripts/build-food-seed.mjs. No network, no model:
 * the vocabulary is data/glossary/pt-en.json, a reviewable file in the repo.
 *
 * Honesty rule: a name is translated only when every one of its terms is
 * known. One unknown term leaves the food without an English name, and the app
 * then shows the whole Portuguese name (never half of each).
 *
 * Catalog order is preserved: the comma-separated facets keep their order and
 * their meaning, so "Arroz, tipo 1, cozido" becomes "Rice, type 1, cooked" —
 * the same shape USDA foods already use in the list.
 */

/** Lowercase, no diacritics. Glossary keys are stored in this form. */
export function normalizeKey(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words, keeping hyphens and apostrophes inside a term ("contra-file", "d'agua"). */
const TOKEN = /[a-z0-9%][a-z0-9%'-]*/g;

/** Portuguese genitive linkers: they trigger the "modifier first" reorder. */
const OF = new Set(['de', 'da', 'do', 'dos', 'das']);

/**
 * Prepositions that must stay in front of the whole expression: "com capa de
 * gordura" is "with fat cap", not "fat with cap".
 */
const PREPOSITION = new Set([
  'com',
  'sem',
  'em',
  'ao',
  'no',
  'na',
  'para',
  'exceto',
]);

/** Longest phrase (in words) the greedy matcher tries. */
const MAX_PHRASE = 6;

const isNumeric = token => /^\d+([.,]\d+)?%?$/.test(token);

/**
 * Reads the glossary file into lookup maps. `keep` holds the terms that stay
 * verbatim in English (açaí, feijoada); `pending` holds the ambiguous ones,
 * which are deliberately left untranslated so no food gets a wrong name.
 */
export function loadGlossary(json) {
  const map = section =>
    new Map(
      Object.entries(json[section] ?? {}).map(([key, value]) => [
        normalizeKey(key),
        value,
      ]),
    );
  return {
    phrases: map('phrases'),
    trailing: map('trailing'),
    terms: map('terms'),
    keep: map('keep'),
    labels: map('labels'),
    categories: map('categories'),
    pending: new Set(
      Object.keys(json.pending ?? {}).map(key => normalizeKey(key)),
    ),
    adjectives: new Set((json.adjectives ?? []).map(key => normalizeKey(key))),
  };
}

function lookupTerm(token, glossary) {
  if (glossary.pending.has(token)) return null;
  const keep = glossary.keep.get(token);
  if (keep !== undefined) return keep;
  const term = glossary.terms.get(token);
  if (term !== undefined) return term;
  if (isNumeric(token)) return token;
  return null;
}

/**
 * Splits a run into the core it names and the qualifiers that trail it, the
 * ones English lists after a comma ("massa fresca" → "pasta, fresh"). With
 * `nounRequired`, a run made only of qualifiers is left untouched, because
 * there would be nothing for them to qualify.
 */
function splitQualifiers(tokens, glossary, nounRequired = true) {
  let cut = tokens.length;
  while (cut > 0 && glossary.adjectives.has(tokens[cut - 1])) cut -= 1;
  if (cut === tokens.length || (cut === 0 && nounRequired)) return [tokens, []];
  return [tokens.slice(0, cut), tokens.slice(cut)];
}

function renderTerms(tokens, glossary, missing) {
  const words = [];
  for (const token of tokens) {
    const term = lookupTerm(token, glossary);
    if (term === null) {
      missing.push(token);
      continue;
    }
    if (term) words.push(term);
  }
  return words;
}

/** "Coconut milk, light": the qualifiers close the name, comma separated. */
function withQualifiers(text, qualifiers, glossary, missing) {
  if (qualifiers.length === 0) return text;
  return [text, ...renderTerms(qualifiers, glossary, missing)]
    .filter(Boolean)
    .join(', ');
}

/**
 * Translates one run of words: greedy longest phrase first, then the genitive
 * reorder ("carne de galinha" → "chicken meat"), then term by term.
 * Returns the English words, or collects what is missing.
 */
function translateTokens(tokens, glossary, missing) {
  if (tokens.length === 0) return '';

  // A phrase wins over any rule, so exceptions stay data instead of code.
  for (let size = Math.min(MAX_PHRASE, tokens.length); size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const phrase = glossary.phrases.get(
        tokens.slice(start, start + size).join(' '),
      );
      if (phrase === undefined) continue;
      const [rest, qualifiers] = splitQualifiers(
        tokens.slice(start + size),
        glossary,
        false,
      );
      const after = translateTokens(rest, glossary, missing);
      // "Corvina de água doce": the phrase is the modifier of what comes
      // before it, so English puts it first ("freshwater croaker").
      const parts =
        start > 0 && OF.has(tokens[start - 1])
          ? [
              phrase,
              after,
              translateTokens(tokens.slice(0, start - 1), glossary, missing),
            ]
          : [
              translateTokens(tokens.slice(0, start), glossary, missing),
              phrase,
              after,
            ];
      return withQualifiers(
        parts.filter(Boolean).join(' '),
        qualifiers,
        glossary,
        missing,
      );
    }
  }

  const at = tokens.findIndex(token => OF.has(token));
  if (at !== -1) {
    const head = tokens.slice(0, at);
    const tail = tokens.slice(at + 1);
    if (tail.length === 0) {
      /*
        The tables invert some names ("Cana, caldo de", "Coco, água de"). The
        linker has nothing to reorder, so the head is translated on its own —
        unless the whole run is a listed idiom ("caldo de" is juice, not broth).
      */
      const idiom = glossary.trailing.get(tokens.join(' '));
      if (idiom !== undefined) return idiom;
      return translateTokens(head, glossary, missing);
    }
    const [core, qualifiers] = splitQualifiers(tail, glossary);
    const modifier = translateTokens(core, glossary, missing);
    const close = text => withQualifiers(text, qualifiers, glossary, missing);
    if (head.length === 0) return close(modifier);
    // "65% de lipídeos" reads "65% fat", not "fat 65%".
    if (head.every(isNumeric)) {
      return close(`${head.join(' ')} ${modifier}`.trim());
    }
    if (PREPOSITION.has(head[0])) {
      const preposition = lookupTerm(head[0], glossary);
      if (preposition === null) missing.push(head[0]);
      const noun = translateTokens(head.slice(1), glossary, missing);
      return close([preposition, modifier, noun].filter(Boolean).join(' '));
    }
    const noun = translateTokens(head, glossary, missing);
    return close(`${modifier} ${noun}`.trim());
  }

  /*
    Catalog form, the same the USDA rows already use in the list: a qualifier
    that trails the noun in Portuguese ("massa fresca", "milho verde") is
    inverted with a comma in English ("pasta, fresh"), instead of being
    reordered by guesswork.
  */
  const [core, qualifiers] = splitQualifiers(tokens, glossary);
  return withQualifiers(
    renderTerms(core, glossary, missing).join(' '),
    qualifiers,
    glossary,
    missing,
  );
}

/** Splits on commas that are outside parentheses, so "(a, b)" stays whole. */
function splitFacets(text) {
  const facets = [];
  let depth = 0;
  let current = '';
  for (const char of String(text)) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      facets.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  facets.push(current);
  return facets.map(facet => facet.trim()).filter(Boolean);
}

function translateFacet(facet, glossary, missing) {
  const parts = [];
  const outer = normalizeKey(facet);
  let index = 0;
  while (index < outer.length) {
    const open = outer.indexOf('(', index);
    if (open === -1) {
      parts.push({ paren: false, text: outer.slice(index) });
      break;
    }
    const close = outer.indexOf(')', open);
    const end = close === -1 ? outer.length : close;
    parts.push({ paren: false, text: outer.slice(index, open) });
    parts.push({ paren: true, text: outer.slice(open + 1, end) });
    index = end + 1;
  }
  const pieces = [];
  for (const part of parts) {
    const inner = part.paren ? splitFacets(part.text) : [part.text];
    const translated = inner
      .map(chunk =>
        translateTokens(chunk.match(TOKEN) ?? [], glossary, missing),
      )
      .filter(Boolean)
      .join(', ');
    if (!translated) continue;
    pieces.push(part.paren ? `(${translated})` : translated);
  }
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "Arroz, tipo 1, cozido" → { text: "Rice, type 1, cooked", missing: [] }.
 * `missing` lists every term the glossary does not know; when it is not empty
 * the caller must drop `text` and keep the Portuguese name.
 */
export function translateName(name, glossary) {
  const missing = [];
  const facets = splitFacets(name).map(facet =>
    translateFacet(facet, glossary, missing),
  );
  const text = facets
    .filter(Boolean)
    .join(', ')
    // A phrase may carry its own comma (", any flavor"); tidy the seam.
    .replace(/\s+,/g, ',')
    .replace(/\(\s*,\s*/g, '(')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { text: text ? capitalize(text) : '', missing };
}

/**
 * Household measure labels are a closed vocabulary ("colher de sopa cheia"),
 * and English wants them re-ordered, so they are translated as whole labels
 * instead of word by word.
 */
export function translateLabel(label, glossary) {
  const key = normalizeKey(label);
  const text = glossary.labels.get(key);
  return { text: text ?? '', missing: text === undefined ? [key] : [] };
}

/** Same treatment as labels: the 34 category strings are matched whole. */
export function translateCategory(category, glossary) {
  const key = normalizeKey(category);
  const text = glossary.categories.get(key);
  return { text: text ?? '', missing: text === undefined ? [key] : [] };
}
