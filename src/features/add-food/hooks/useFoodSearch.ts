import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { localFoodProvider } from '../../../data/providers/LocalFoodProvider';
import { importSeedIfNeeded } from '../../../data/seed/importSeed';
import { getStarters } from '../../../data/seed/starters';
import type { Meal } from '../../../domain/diary/Meal';
import type { NormalizedFood } from '../../../domain/food/NormalizedFood';
import { searchKey } from '../../../domain/food/searchQuery';
import { currentLanguage } from '../../../i18n';
import { useOnlineProducts } from './useOnlineProducts';

/** One keystroke's worth of quiet before the database is asked. */
export const SEARCH_DEBOUNCE_MS = 150;
/** Rows kept per search; the list shows the first 20 and "Ver mais" the rest. */
export const SEARCH_LIMIT = 60;
export const VISIBLE_LIMIT = 20;
/** Starters shown before the user types. */
export const SUGGESTION_COUNT = 6;

const SEARCH_LOG_TAG = '[bocado:search]';

export type SearchStatus =
  /** The seed is still being written; nothing can be found yet. */
  | 'preparing'
  /** Field empty: the meal's starters. */
  | 'suggestions'
  /** A completed search found nothing for `emptyQuery`. */
  | 'empty'
  /** Ranked matches (possibly still the previous keystroke's, while pending). */
  | 'results';

export interface FoodSearch {
  query: string;
  setQuery: (text: string) => void;
  clear: () => void;
  status: SearchStatus;
  /** What the list shows for the current status. */
  foods: NormalizedFood[];
  /** The query the empty state names ("Nada para “xyzq”."). */
  emptyQuery: string;
  /** More rows than `VISIBLE_LIMIT` are held back until `showMore`. */
  hasMore: boolean;
  showMore: () => void;
  /** The "Produtos" group: packaged labels found online (spec 05). */
  products: NormalizedFood[];
  /** A round has been running long enough to say so in the group's footer. */
  searchingProducts: boolean;
  /** Every online provider failed; the local table is all there is. */
  offline: boolean;
}

interface Completed {
  key: string;
  /** What was typed, as the empty state echoes it. */
  text: string;
  foods: NormalizedFood[];
}

/**
 * Search-as-you-type over the bundled table. Debounced 150 ms; every request
 * carries a sequence number so a slow early answer never overwrites a later
 * one. Results swap in place: the previous list stays until the next arrives.
 */
export function useFoodSearch(meal: Meal): FoodSearch {
  const [query, setQueryState] = useState('');
  const [seedReady, setSeedReady] = useState(false);
  const [suggestions, setSuggestions] = useState<NormalizedFood[]>([]);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [expanded, setExpanded] = useState(false);
  const sequence = useRef(0);
  const key = searchKey(query);

  useEffect(() => {
    let active = true;
    importSeedIfNeeded().then(() => {
      if (active) setSeedReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!seedReady) return;
    let active = true;
    getStarters(meal)
      .then(ids => localFoodProvider.getByIds(ids.slice(0, SUGGESTION_COUNT)))
      .then(foods => {
        if (active) setSuggestions(foods);
      })
      .catch(error => {
        console.warn(`${SEARCH_LOG_TAG} starters failed: ${String(error)}`);
      });
    return () => {
      active = false;
    };
  }, [meal, seedReady]);

  useEffect(() => {
    if (!seedReady || key.length === 0) return;
    const id = ++sequence.current;
    const timer = setTimeout(() => {
      localFoodProvider
        .search(query, { locale: currentLanguage(), limit: SEARCH_LIMIT })
        .then(foods => {
          if (id === sequence.current) {
            setCompleted({ key, text: query.trim(), foods });
          }
        })
        .catch(error => {
          console.warn(`${SEARCH_LOG_TAG} "${query}" failed: ${String(error)}`);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key, query, seedReady]);

  const setQuery = useCallback((text: string) => {
    setQueryState(text);
    setExpanded(false);
  }, []);

  const clear = useCallback(() => {
    sequence.current += 1;
    setQueryState('');
    setCompleted(null);
    setExpanded(false);
  }, []);

  const showMore = useCallback(() => setExpanded(true), []);

  const searching = key.length > 0;
  const results = useMemo(
    () => (searching && completed ? completed.foods : []),
    [searching, completed],
  );
  // Only the answer to the current text may say "nothing"; while a new search
  // is pending, the previous list stays but the old term is never named.
  const current = completed !== null && completed.key === key;
  // Until the first answer of the session lands — and if it never lands,
  // because the query failed — the starters stay on screen: the list never
  // blanks between the first keystroke and the first result.
  const status: SearchStatus = !seedReady
    ? 'preparing'
    : !searching || completed === null
    ? 'suggestions'
    : current && results.length === 0
    ? 'empty'
    : 'results';

  const foods = useMemo(() => {
    if (status === 'suggestions') return suggestions;
    if (status !== 'results') return [];
    return expanded ? results : results.slice(0, VISIBLE_LIMIT);
  }, [status, suggestions, results, expanded]);

  /*
    The online half runs on its own clock (400 ms debounce, 2,5 s ceiling) and
    writes to its own state, so nothing here waits on the network: the local
    answer above is already on screen when the first request leaves.
  */
  const online = useOnlineProducts(key, query, results, seedReady);

  return {
    query,
    setQuery,
    clear,
    status,
    foods,
    emptyQuery: completed?.text ?? '',
    hasMore:
      status === 'results' && !expanded && results.length > VISIBLE_LIMIT,
    showMore,
    products: online.products,
    searchingProducts: online.searching,
    offline: online.offline,
  };
}
