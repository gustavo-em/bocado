import { useEffect, useMemo, useRef, useState } from 'react';

import {
  pruneOnlineFoods,
  readFoods,
  readSearchCache,
  upsertFoods,
  writeSearchCache,
} from '../../../data/food/foodCache';
import { openFoodFactsProvider } from '../../../data/providers/OpenFoodFactsProvider';
import { usdaProvider } from '../../../data/providers/UsdaProvider';
import type { Locale } from '../../../domain/food/FoodProvider';
import {
  searchOnline,
  shouldSearchOnline,
  type OnlineSearchDeps,
} from '../../../domain/food/FoodSearchService';
import type { NormalizedFood } from '../../../domain/food/NormalizedFood';
import { currentLanguage } from '../../../i18n';

/** Spec 05: the network waits for the typing to settle. */
export const ONLINE_DEBOUNCE_MS = 400;

/**
 * A round shorter than this shows nothing at all: a product list that appears
 * and is replaced within a blink is noise, not feedback.
 */
export const PROGRESS_DELAY_MS = 300;

const ONLINE_LOG_TAG = '[bocado:online]';

export interface OnlineProducts {
  /** Ranked products for the current query; empty until they arrive. */
  products: NormalizedFood[];
  /** True once a round has been running for `PROGRESS_DELAY_MS`. */
  searching: boolean;
  /** Every provider asked failed: the local table is all there is. */
  offline: boolean;
}

const EMPTY: NormalizedFood[] = [];

/** Reads and writes the private per-user cache the contract allows. */
const cacheDeps: Pick<OnlineSearchDeps, 'readCache' | 'writeCache'> = {
  readCache: async (source, locale, query) => {
    try {
      const cached = await readSearchCache(source, locale, query);
      if (cached === null) return null;
      const foods = await readFoods(cached.ids);
      return foods.length === cached.ids.length ? foods : null;
    } catch (error) {
      console.warn(`${ONLINE_LOG_TAG} cache read failed: ${String(error)}`);
      return null;
    }
  },
  writeCache: async (source, locale, query, foods) => {
    try {
      await upsertFoods(foods);
      await writeSearchCache(
        source,
        locale,
        query,
        foods.map(food => food.id),
      );
    } catch (error) {
      console.warn(`${ONLINE_LOG_TAG} cache write failed: ${String(error)}`);
    }
  },
};

/**
 * The shape of a round while developing: the screen can only ever say "Sem
 * conexão", so this is the only place that tells a timeout from a rejected
 * request from a round that simply found nothing.
 *
 * What the user typed is food they ate, so a release build writes nothing at
 * all — the whole report is behind `__DEV__`, device logs included.
 */
const report: Pick<OnlineSearchDeps, 'onProviderDone' | 'onRoundDone'> = {
  onProviderDone: (source, outcome, count, elapsedMs, detail) => {
    if (!__DEV__) return;
    console.log(
      `${ONLINE_LOG_TAG} ${source} ${outcome} ${count} em ${elapsedMs} ms${
        detail === undefined ? '' : ` (${detail})`
      }`,
    );
  },
  onRoundDone: round => {
    if (!__DEV__) return;
    console.log(
      `${ONLINE_LOG_TAG} "${round.query}" ${round.locale} produtos=${round.products} offline=${round.offline} em ${round.elapsedMs} ms`,
    );
  },
};

/**
 * How long the cache is left alone between two tidy-ups. Pruning is a write
 * over the whole `foods` table, so it never runs per keystroke — but a
 * process that lives for days must keep honouring `MAX_ONLINE_ROWS`, so a
 * single flag would be a leak.
 */
export const PRUNE_INTERVAL_MS = 5 * 60 * 1000;

/** When the cache was last tidied; `0` means never, in this process. */
let prunedAt = 0;

/**
 * The online half of the search (spec 05). It runs beside the local one and
 * never in front of it: the local list is already on screen when this starts,
 * every round is cancelled by the next keystroke, and a round that fails
 * leaves what is on screen exactly where it is.
 */
export function useOnlineProducts(
  /** Normalized query key; changes with every meaningful keystroke. */
  key: string,
  query: string,
  /** What the local table answered, used only to drop duplicates. */
  local: readonly NormalizedFood[],
  enabled: boolean,
): OnlineProducts {
  const [products, setProducts] = useState<NormalizedFood[]>(EMPTY);
  const [answeredKey, setAnsweredKey] = useState('');
  const [pending, setPending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [offline, setOffline] = useState(false);

  // Read at request time: a new local answer must not restart the round.
  const localRef = useRef(local);
  localRef.current = local;

  const wanted = enabled && shouldSearchOnline(query);

  useEffect(() => {
    if (!wanted) {
      setPending(false);
      // Nothing is being asked any more, so there is nothing to be offline
      // from: the strip must not outlive the round that raised it.
      setOffline(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setPending(true);
    const timer = setTimeout(() => {
      const locale: Locale = currentLanguage();
      searchOnline(
        {
          off: openFoodFactsProvider,
          usda: usdaProvider,
          ...cacheDeps,
          ...report,
        },
        {
          query,
          locale,
          local: localRef.current,
          signal: controller.signal,
        },
      )
        .then(result => {
          if (!active) return;
          setProducts(result.products);
          setAnsweredKey(key);
          setOffline(result.offline);
          const now = Date.now();
          if (!result.offline && now - prunedAt > PRUNE_INTERVAL_MS) {
            prunedAt = now;
            // In the background, after the rows are already on screen.
            pruneOnlineFoods().catch(error => {
              console.warn(`${ONLINE_LOG_TAG} prune failed: ${String(error)}`);
            });
          }
        })
        .catch(error => {
          if (!active) return;
          // Never the query itself: what the user is eating stays off the log.
          console.warn(`${ONLINE_LOG_TAG} round failed: ${String(error)}`);
          setOffline(true);
        })
        .finally(() => {
          if (active) setPending(false);
        });
    }, ONLINE_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
      // The previous keystroke's request is dropped, not awaited.
      controller.abort();
    };
  }, [key, query, wanted]);

  // The footer only appears once the wait is long enough to be worth saying.
  useEffect(() => {
    if (!pending) {
      setSearching(false);
      return;
    }
    const timer = setTimeout(() => setSearching(true), PROGRESS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  // A stale answer never sits under a different query.
  const current = wanted && answeredKey === key ? products : EMPTY;

  return useMemo(
    () => ({
      products: current,
      searching: wanted && searching,
      // Gated like `searching`: the strip belongs to a live round, so it is
      // gone the moment the query stops being one.
      offline: wanted && offline,
    }),
    [current, searching, wanted, offline],
  );
}
