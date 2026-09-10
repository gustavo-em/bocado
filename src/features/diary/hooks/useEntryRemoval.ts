import { useCallback, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { SnackbarMessage } from '../../../components/Snackbar';
import { useSnackbarCountdown } from '../../../components/useSnackbarCountdown';
import {
  diaryRepository,
  type DiaryEntryView,
} from '../../../data/diary/DiaryRepository';
import { entryName } from '../../../domain/diary/entryName';
import { currentLanguage, t } from '../../../i18n';

const DIARY_LOG_TAG = '[bocado:diary]';

export interface EntryRemoval {
  snackbar: SnackbarMessage | null;
  /** Deletes the entry and offers "Desfazer" for the next 4 s. */
  remove: (entry: DiaryEntryView) => void;
  undo: () => void;
  /** Takes the pill down without undoing: another action owns it now. */
  dismiss: () => void;
}

/**
 * Removing an entry from the diary: the row goes at once, a snackbar says
 * what left and "Desfazer" puts the exact row back, in its place in the meal.
 * There is no "Tem certeza?" anywhere in this path — the undo is the
 * confirmation.
 */
export function useEntryRemoval(): EntryRemoval {
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const pending = useRef<DiaryEntryView | null>(null);
  /** The removal still in flight, so "Desfazer" can wait for it to land. */
  const removing = useRef<Promise<unknown>>(Promise.resolve());
  const countdown = useSnackbarCountdown(() => setSnackbar(null));

  const remove = useCallback(
    (entry: DiaryEntryView) => {
      pending.current = entry;
      const name = entryName(entry, currentLanguage());
      setSnackbar({
        food: name,
        meal: t(`meals.${entry.meal}`),
        kind: 'removed',
      });
      countdown.start();
      removing.current = diaryRepository.removeEntry(entry.id).then(
        () => {
          AccessibilityInfo.announceForAccessibility(
            t('search.removed', { food: name }),
          );
        },
        error => {
          console.warn(`${DIARY_LOG_TAG} remove failed: ${String(error)}`);
        },
      );
    },
    [countdown],
  );

  const undo = useCallback(() => {
    const entry = pending.current;
    countdown.cancel();
    setSnackbar(null);
    if (!entry) return;
    pending.current = null;
    // The two writes are separate transactions, so the restore is chained
    // onto the delete: an INSERT that commits first would be wiped by the
    // DELETE landing after it, and the entry would vanish for good.
    removing.current
      .catch(() => undefined)
      .then(() => diaryRepository.restoreEntry(entry))
      .catch(error => {
        console.warn(`${DIARY_LOG_TAG} restore failed: ${String(error)}`);
      });
  }, [countdown]);

  const dismiss = useCallback(() => {
    countdown.cancel();
    pending.current = null;
    setSnackbar(null);
  }, [countdown]);

  // Memoised so the rows below keep the same `onRemove` between renders and
  // `React.memo` on a 56 dp row still means something on the J6.
  return useMemo(
    () => ({ snackbar, remove, undo, dismiss }),
    [snackbar, remove, undo, dismiss],
  );
}
