import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { prefs } from '../../../data/prefs/prefs';

/**
 * Whether the minerals block belongs at the end of the day, re-read on focus
 * so the switch in "Metas" shows up on "Hoje" as soon as the user comes back.
 */
export function useMineralsEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(prefs.mineralsInDiary);

  useFocusEffect(
    useCallback(() => {
      const next = prefs.mineralsInDiary();
      setEnabled(previous => (previous === next ? previous : next));
    }, []),
  );

  return enabled;
}
