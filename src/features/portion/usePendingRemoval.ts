import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { DiaryEntryView } from '../../data/diary/DiaryRepository';
import { takeRequestedRemoval } from './portionSheet';

/**
 * Carries out the removal asked for by "Remover" on the portion sheet
 * (spec 09). The screen that takes the focus back runs `remove` — its own
 * removal path, with the snackbar and "Desfazer" it already had — and the
 * request is cleared, so a screen still mounted underneath does nothing.
 */
export function usePendingRemoval(
  remove: (entry: DiaryEntryView) => void,
): void {
  useFocusEffect(
    useCallback(() => {
      const entry = takeRequestedRemoval();
      if (entry) remove(entry);
    }, [remove]),
  );
}
