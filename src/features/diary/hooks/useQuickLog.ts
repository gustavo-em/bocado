import { useCallback, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { haptics } from '../../../components/haptics';
import type { SnackbarMessage } from '../../../components/Snackbar';
import { useSnackbarCountdown } from '../../../components/useSnackbarCountdown';
import {
  diaryRepository,
  type UsageMemoryRow,
} from '../../../data/diary/DiaryRepository';
import type { Meal } from '../../../domain/diary/Meal';
import type { DayKey } from '../../../domain/diary/days';
import type { NormalizedFood } from '../../../domain/food/NormalizedFood';
import { servingFromMemory } from '../../../domain/food/portion';
import { localizedName } from '../../../domain/food/rank';
import { currentLanguage, t } from '../../../i18n';
import { formatKcal } from '../../../i18n/format';

const QUICK_LOG_TAG = '[bocado:quick-log]';

export interface QuickLog {
  snackbar: SnackbarMessage | null;
  /** Writes the remembered portion of a food straight into a meal. */
  log: (
    food: NormalizedFood,
    memory: UsageMemoryRow | null,
    meal: Meal,
  ) => void;
  /** Copies a whole past meal into the same meal of `day`. */
  copyMeal: (fromDay: DayKey, meal: Meal, sentence: string) => void;
  undo: () => void;
  dismiss: () => void;
}

/**
 * Logging from "Hoje" itself: the chips an empty meal offers in place of
 * "Nada registrado ainda" write in one tap, and the snackbar's "Desfazer"
 * takes back either the single entry or the whole copied meal.
 */
export function useQuickLog(day: DayKey): QuickLog {
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  /** The rows this pill can still undo. */
  const written = useRef<string[]>([]);
  /** The write still in flight, so "Desfazer" can wait for its ids. */
  const writing = useRef<Promise<string[]>>(Promise.resolve([]));
  /**
   * Foods (and copies) being written right now. The chip stays on screen
   * until the diary reload replaces it, so a second tap in those few hundred
   * milliseconds would write the same food twice and leave "Desfazer" able to
   * take back only the last of them.
   */
  const inFlight = useRef(new Set<string>());
  const countdown = useSnackbarCountdown(() => setSnackbar(null));

  const show = useCallback(
    (message: SnackbarMessage) => {
      setSnackbar(message);
      countdown.start();
    },
    [countdown],
  );

  const log = useCallback(
    (food: NormalizedFood, memory: UsageMemoryRow | null, meal: Meal) => {
      const key = `${meal}:${food.id}`;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      const locale = currentLanguage();
      const name = localizedName(food, locale);
      const mealName = t(`meals.${meal}`);
      const portion = servingFromMemory(food, memory, locale);
      written.current = [];
      show({ food: name, meal: mealName, kind: 'added' });
      writing.current = diaryRepository
        .addEntry({
          day,
          meal,
          food,
          serving: portion.serving,
          servingCount: portion.servingCount,
          locale,
        })
        .then(entry => {
          written.current = [entry.id];
          haptics.added();
          AccessibilityInfo.announceForAccessibility(
            t('search.addedA11y', {
              food: name,
              meal: mealName,
              kcal: formatKcal(entry.kcal),
            }),
          );
          return [entry.id];
        })
        .catch(error => {
          console.warn(`${QUICK_LOG_TAG} add failed: ${String(error)}`);
          return [];
        })
        .finally(() => {
          inFlight.current.delete(key);
        });
    },
    [day, show],
  );

  const copyMeal = useCallback(
    (fromDay: DayKey, meal: Meal, sentence: string) => {
      const key = `copy:${fromDay}:${meal}`;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      written.current = [];
      show({ food: sentence, meal: t(`meals.${meal}`), kind: 'text' });
      writing.current = diaryRepository
        .copyMealEntries({ fromDay, toDay: day, meal })
        .then(entries => {
          const ids = entries.map(entry => entry.id);
          written.current = ids;
          haptics.added();
          AccessibilityInfo.announceForAccessibility(sentence);
          return ids;
        })
        .catch(error => {
          console.warn(`${QUICK_LOG_TAG} copy failed: ${String(error)}`);
          return [];
        })
        .finally(() => {
          inFlight.current.delete(key);
        });
    },
    [day, show],
  );

  const undo = useCallback(() => {
    countdown.cancel();
    setSnackbar(null);
    writing.current
      .then(ids =>
        ids.length > 0 ? diaryRepository.removeEntries(ids) : undefined,
      )
      .then(() => {
        written.current = [];
      })
      .catch(error => {
        console.warn(`${QUICK_LOG_TAG} undo failed: ${String(error)}`);
      });
  }, [countdown]);

  const dismiss = useCallback(() => {
    countdown.cancel();
    setSnackbar(null);
  }, [countdown]);

  return useMemo(
    () => ({ snackbar, log, copyMeal, undo, dismiss }),
    [snackbar, log, copyMeal, undo, dismiss],
  );
}
