import {
  addDays,
  startOfWeek,
  weekStarts,
  type DayKey,
} from '../../domain/diary/days';

/** Two years of weeks back: the diary is not an archive of a whole lifetime. */
export const WEEKS_BACK = 104;

export interface DayRange {
  /** Monday of the oldest week the diary can show. */
  firstDay: DayKey;
  /** Sunday that closes the week being lived: nothing further ahead is picked. */
  lastDay: DayKey;
}

/** The one range both the day strip and the month sheet obey. */
export function dayRange(today: DayKey): DayRange {
  return {
    firstDay: weekStarts(today, WEEKS_BACK)[0],
    lastDay: addDays(startOfWeek(today), 6),
  };
}
