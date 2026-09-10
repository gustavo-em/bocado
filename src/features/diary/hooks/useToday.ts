import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { dayKeyFromDate, type DayKey } from '../../../domain/diary/days';

/**
 * The local civil day, re-read whenever the screen regains focus or the app
 * comes back to the foreground, so a diary left open overnight rolls over.
 */
export function useToday(): DayKey {
  const [today, setToday] = useState<DayKey>(() => dayKeyFromDate(new Date()));

  const refresh = useCallback(() => {
    const now = dayKeyFromDate(new Date());
    setToday(previous => (previous === now ? previous : now));
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return today;
}
