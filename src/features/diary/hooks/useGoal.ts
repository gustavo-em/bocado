import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { prefs } from '../../../data/prefs/prefs';
import type { DailyGoal } from '../../../domain/diary/Meal';

/** The daily goal from MMKV, re-read on focus so "Metas" edits show up on return. */
export function useGoal(): DailyGoal {
  const [goal, setGoal] = useState<DailyGoal>(() => prefs.getGoal());

  useFocusEffect(
    useCallback(() => {
      const next = prefs.getGoal();
      setGoal(previous =>
        previous.kcal === next.kcal &&
        previous.protein_g === next.protein_g &&
        previous.carbs_g === next.carbs_g &&
        previous.fat_g === next.fat_g
          ? previous
          : next,
      );
    }, []),
  );

  return goal;
}
