import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { haptics } from '../../../components/haptics';
import type { SnackbarMessage } from '../../../components/Snackbar';
import { useSnackbarCountdown } from '../../../components/useSnackbarCountdown';
import {
  diaryRepository,
  type DiaryEntryView,
  type UsageMemoryRow,
} from '../../../data/diary/DiaryRepository';
import { entryName } from '../../../domain/diary/entryName';
import type { Meal } from '../../../domain/diary/Meal';
import type { NormalizedFood } from '../../../domain/food/NormalizedFood';
import { servingFromMemory } from '../../../domain/food/portion';
import { localizedName } from '../../../domain/food/rank';
import { currentLanguage, t } from '../../../i18n';
import { formatKcal } from '../../../i18n/format';
import { onPortionResult } from '../../portion/portionSheet';

const SESSION_LOG_TAG = '[bocado:add]';

export interface AddedItem {
  entryId: string;
  kcal: number;
  name: string;
  /** The row as written, so the "✓" line and the tray show the real portion. */
  entry: DiaryEntryView;
}

interface Snack extends SnackbarMessage {
  foodId: string;
  /** A copied meal: "Desfazer" takes the whole set back out. */
  copiedIds?: string[];
}

export interface AddSession {
  /** Foods written in this session, by food id. */
  added: ReadonlyMap<string, AddedItem>;
  itemCount: number;
  kcal: number;
  /**
   * Writes the last portion used for this food — the default serving when it
   * has never been logged. A second tap on the same food does nothing.
   */
  add: (food: NormalizedFood, memory?: UsageMemoryRow | null) => void;
  /** Copies a whole past meal into this one; "Desfazer" removes the set. */
  copyMeal: (fromDay: string, sentence: string) => void;
  /** Deletes one item of this session, with "Desfazer" to bring it back. */
  remove: (item: AddedItem) => void;
  snackbar: SnackbarMessage | null;
  /** Reverts whatever the snackbar is announcing. */
  undo: () => void;
}

/**
 * The entries added since the modal opened. Each "+" writes immediately with
 * the food's default serving, so nothing is lost if the modal is dismissed;
 * "Desfazer" deletes the last one while the snackbar is up (4 s, longer with
 * assistive tech — see useSnackbarCountdown). The portion sheet writes
 * through the same repository and reports back here, so a portion adjusted in
 * the sheet keeps its "✓" and moves the tray total with it.
 */
export function useAddSession(day: string, meal: Meal): AddSession {
  const [added, setAdded] = useState<Map<string, AddedItem>>(() => new Map());
  const [snackbar, setSnackbar] = useState<Snack | null>(null);
  const addedRef = useRef(added);
  addedRef.current = added;
  /** Writes still running, by food id; resolve to the entry id or null. */
  const inFlight = useRef(new Map<string, Promise<string | null>>());
  /** Entry ids by food id, kept in sync before React re-renders `added`. */
  const entryIds = useRef(new Map<string, string>());
  /** Foods undone while their write was still running. */
  const undone = useRef(new Set<string>());
  /** What "Desfazer" needs for a removal: the exact row to put back. */
  const removed = useRef(new Map<string, AddedItem>());
  /** The removal still in flight, so "Desfazer" can wait for it to land. */
  const removing = useRef<Promise<unknown>>(Promise.resolve());
  /** The copy still in flight; "Desfazer" waits for its ids. */
  const copying = useRef<Promise<string[]>>(Promise.resolve([]));
  const snackRef = useRef(snackbar);
  snackRef.current = snackbar;
  const countdown = useSnackbarCountdown(() => setSnackbar(null));

  const showSnackbar = useCallback(
    (snack: Snack) => {
      snackRef.current = snack;
      setSnackbar(snack);
      countdown.start();
    },
    [countdown],
  );

  /** Takes the snackbar down only if it still belongs to `foodId`. */
  const hideSnackbar = useCallback(
    (foodId: string) => {
      if (snackRef.current?.foodId !== foodId) return;
      countdown.cancel();
      snackRef.current = null;
      setSnackbar(null);
    },
    [countdown],
  );

  /** Files an entry written elsewhere (the portion sheet) in this session. */
  const remember = useCallback((entry: DiaryEntryView) => {
    entryIds.current.set(entry.foodId, entry.id);
    removed.current.delete(entry.foodId);
    setAdded(previous => {
      const next = new Map(previous);
      next.set(entry.foodId, {
        entryId: entry.id,
        kcal: entry.kcal,
        name:
          previous.get(entry.foodId)?.name ??
          entryName(entry, currentLanguage()),
        entry,
      });
      return next;
    });
  }, []);

  useEffect(
    () =>
      onPortionResult(result => {
        const { entry } = result;
        // An entry saved into another meal or another day leaves this list:
        // the tray only counts what belongs to the meal it was opened for.
        if (entry.meal !== meal || entry.day !== day) {
          entryIds.current.delete(entry.foodId);
          setAdded(previous => {
            if (!previous.has(entry.foodId)) return previous;
            const next = new Map(previous);
            next.delete(entry.foodId);
            return next;
          });
          return;
        }
        remember(entry);
      }),
    [remember, meal, day],
  );

  const add = useCallback(
    (food: NormalizedFood, memory?: UsageMemoryRow | null) => {
      // `added` only catches up on the next render, so the written ids answer
      // for the frames in between: a tap landing right after the write lands
      // must not open a second entry for the same food.
      if (
        addedRef.current.has(food.id) ||
        entryIds.current.has(food.id) ||
        inFlight.current.has(food.id)
      )
        return;
      undone.current.delete(food.id);
      const name = localizedName(food, currentLanguage());
      const mealName = t(`meals.${meal}`);
      // The snackbar goes up with the tap itself, so from the next frame the
      // pill owns every touch over it; "Desfazer" waits for the write below.
      showSnackbar({
        food: name,
        meal: mealName,
        kind: 'added',
        foodId: food.id,
      });
      const locale = currentLanguage();
      const portion = servingFromMemory(food, memory ?? null, locale);
      const write = diaryRepository
        .addEntry({
          day,
          meal,
          food,
          serving: portion.serving,
          servingCount: portion.servingCount,
          locale,
        })
        .then(entry => {
          entryIds.current.set(food.id, entry.id);
          if (__DEV__) {
            console.log(`${SESSION_LOG_TAG} ${food.id} wrote ${entry.id}`);
          }
          // "Desfazer" beat the write: the removal below is already waiting on
          // this id, so no ✓ flashes and nothing is announced as added.
          if (undone.current.has(food.id)) return entry.id;
          setAdded(previous => {
            const next = new Map(previous);
            next.set(food.id, {
              entryId: entry.id,
              kcal: entry.kcal,
              name,
              entry,
            });
            return next;
          });
          haptics.added();
          AccessibilityInfo.announceForAccessibility(
            t('search.addedA11y', {
              food: name,
              meal: mealName,
              kcal: formatKcal(entry.kcal),
            }),
          );
          return entry.id;
        })
        .catch(error => {
          console.warn(`${SESSION_LOG_TAG} add failed: ${String(error)}`);
          hideSnackbar(food.id);
          return null;
        })
        .finally(() => {
          inFlight.current.delete(food.id);
        });
      inFlight.current.set(food.id, write);
    },
    [day, meal, showSnackbar, hideSnackbar],
  );

  /**
   * "Repetir jantar de ontem": the rows of a past meal are copied with their
   * stored portions, land in the tray like anything else added here, and go
   * back out as one set on "Desfazer".
   */
  const copyMeal = useCallback(
    (fromDay: string, sentence: string) => {
      const key = `copy:${fromDay}:${meal}`;
      showSnackbar({
        food: sentence,
        meal: t(`meals.${meal}`),
        kind: 'text',
        foodId: key,
        copiedIds: [],
      });
      copying.current = diaryRepository
        .copyMealEntries({ fromDay, toDay: day, meal })
        .then(entries => {
          const ids = entries.map(entry => entry.id);
          if (undone.current.has(key)) return ids;
          entries.forEach(remember);
          haptics.added();
          if (snackRef.current?.foodId === key) {
            snackRef.current = { ...snackRef.current, copiedIds: ids };
            setSnackbar(snackRef.current);
          }
          AccessibilityInfo.announceForAccessibility(sentence);
          return ids;
        })
        .catch(error => {
          console.warn(`${SESSION_LOG_TAG} copy failed: ${String(error)}`);
          hideSnackbar(key);
          return [];
        });
    },
    [day, meal, remember, showSnackbar, hideSnackbar],
  );

  const remove = useCallback(
    (item: AddedItem) => {
      const foodId = item.entry.foodId;
      removed.current.set(foodId, item);
      entryIds.current.delete(foodId);
      setAdded(previous => {
        const next = new Map(previous);
        next.delete(foodId);
        return next;
      });
      showSnackbar({
        food: item.name,
        meal: t(`meals.${item.entry.meal}`),
        kind: 'removed',
        foodId,
      });
      removing.current = diaryRepository
        .removeEntry(item.entryId)
        .catch(error => {
          console.warn(`${SESSION_LOG_TAG} remove failed: ${String(error)}`);
        });
    },
    [showSnackbar],
  );

  const undo = useCallback(() => {
    const snack = snackRef.current;
    if (!snack) return;
    countdown.cancel();
    snackRef.current = null;
    setSnackbar(null);

    if (snack.kind === 'text') {
      // Claimed before the await, so a copy still being written knows its rows
      // are no longer wanted and never files them in the tray.
      undone.current.add(snack.foodId);
      copying.current
        .then(ids => {
          if (ids.length === 0) return undefined;
          return diaryRepository.removeEntries(ids).then(() => {
            setAdded(previous => {
              const next = new Map(previous);
              previous.forEach((item, foodId) => {
                if (ids.includes(item.entryId)) {
                  next.delete(foodId);
                  entryIds.current.delete(foodId);
                }
              });
              return next;
            });
            AccessibilityInfo.announceForAccessibility(t('search.removedTail'));
          });
        })
        .catch(error => {
          console.warn(`${SESSION_LOG_TAG} copy undo failed: ${String(error)}`);
        });
      return;
    }

    if (snack.kind === 'removed') {
      const item = removed.current.get(snack.foodId);
      if (!item) return;
      removed.current.delete(snack.foodId);
      // Chained onto the delete: two separate transactions have no order of
      // their own, and an INSERT that commits first would be wiped by it.
      removing.current
        .catch(() => undefined)
        .then(() => diaryRepository.restoreEntry(item.entry))
        .then(() => remember(item.entry))
        .catch(error => {
          console.warn(`${SESSION_LOG_TAG} restore failed: ${String(error)}`);
        });
      return;
    }

    // Claimed before anything awaits, so a write still in flight knows its ✓
    // and its announcement are no longer wanted.
    undone.current.add(snack.foodId);
    const written = entryIds.current.get(snack.foodId);
    const entryId =
      written !== undefined
        ? Promise.resolve(written)
        : inFlight.current.get(snack.foodId) ?? Promise.resolve(null);
    entryId
      .then(id => {
        if (id === null) return undefined;
        // The id is only forgotten once the row is gone, so a write that fails
        // to be removed keeps its ✓ and stays reachable.
        return diaryRepository.removeEntry(id).then(() => {
          entryIds.current.delete(snack.foodId);
          if (__DEV__) {
            console.log(`${SESSION_LOG_TAG} ${snack.foodId} undid ${id}`);
          }
          setAdded(previous => {
            const next = new Map(previous);
            next.delete(snack.foodId);
            return next;
          });
          AccessibilityInfo.announceForAccessibility(
            t('search.removed', { food: snack.food }),
          );
        });
      })
      .catch(error => {
        console.warn(`${SESSION_LOG_TAG} undo failed: ${String(error)}`);
      });
  }, [countdown, remember]);

  const totals = useMemo(() => {
    let kcal = 0;
    added.forEach(item => {
      kcal += item.kcal;
    });
    return { itemCount: added.size, kcal };
  }, [added]);

  return {
    added,
    itemCount: totals.itemCount,
    kcal: totals.kcal,
    add,
    copyMeal,
    remove,
    snackbar,
    undo,
  };
}
