import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { prefs } from '../../../data/prefs/prefs';
import type { DiaryDisplayMode } from '../../../domain/diary/daySummary';

function stored(): DiaryDisplayMode {
  return prefs.showRemaining() ? 'remaining' : 'consumed';
}

/**
 * What the answer number counts, re-read on focus so the toggle in "Metas"
 * shows up on "Hoje" as soon as the user comes back.
 */
export function useDisplayMode(): DiaryDisplayMode {
  const [mode, setMode] = useState<DiaryDisplayMode>(stored);

  useFocusEffect(
    useCallback(() => {
      const next = stored();
      setMode(previous => (previous === next ? previous : next));
    }, []),
  );

  return mode;
}
