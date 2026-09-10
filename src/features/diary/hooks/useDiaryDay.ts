import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  diaryRepository,
  type DiaryEntryView,
} from '../../../data/diary/DiaryRepository';
import type { DailyGoal } from '../../../domain/diary/Meal';
import {
  summarizeDay,
  type DaySummary,
} from '../../../domain/diary/daySummary';
import type { DayKey } from '../../../domain/diary/days';

export type DiaryDayStatus = 'loading' | 'ready' | 'error';

export interface DiaryDay {
  status: DiaryDayStatus;
  entries: DiaryEntryView[];
  /** `null` until the first load of this day finishes. */
  summary: DaySummary | null;
}

const DB_LOG_TAG = '[bocado:db]';

/**
 * Entries and totals for one day. Reloads when the repository reports a
 * write, when the screen regains focus, and whenever `day` changes. A failed
 * read is logged and shows the day as empty with `status: 'error'`.
 */
export function useDiaryDay(day: DayKey, goal: DailyGoal): DiaryDay {
  const [loadedDay, setLoadedDay] = useState<DayKey | null>(null);
  const [entries, setEntries] = useState<DiaryEntryView[]>([]);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    diaryRepository.entriesForDay(day).then(
      rows => {
        if (id !== requestId.current) return;
        setEntries(rows);
        setLoadedDay(day);
        setFailed(false);
      },
      error => {
        if (id !== requestId.current) return;
        console.warn(
          `${DB_LOG_TAG} entriesForDay(${day}) failed: ${String(error)}`,
        );
        setEntries([]);
        setLoadedDay(day);
        setFailed(true);
      },
    );
  }, [day]);

  useEffect(() => diaryRepository.subscribe(load), [load]);
  useFocusEffect(load);

  const ready = loadedDay === day;
  const summary = useMemo(
    () => (ready ? summarizeDay(entries, goal) : null),
    [ready, entries, goal],
  );

  return {
    status: !ready ? 'loading' : failed ? 'error' : 'ready',
    entries: ready ? entries : [],
    summary,
  };
}
