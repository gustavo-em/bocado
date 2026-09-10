import {
  addDays,
  addMonths,
  dateFromDayKey,
  dayKeyFromDate,
  diffDays,
  diffMonths,
  MONTH_GRID_SIZE,
  monthGrid,
  startOfMonth,
  startOfWeek,
  weekDays,
  weekStarts,
} from '../src/domain/diary/days';
import { dayRange, WEEKS_BACK } from '../src/features/diary/todayRange';

describe('day keys', () => {
  test('round-trips through a local Date', () => {
    expect(dayKeyFromDate(new Date(2026, 8, 8))).toBe('2026-09-08');
    expect(dateFromDayKey('2026-09-08').getDate()).toBe(8);
    expect(dateFromDayKey('2026-09-08').getMonth()).toBe(8);
  });

  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  test('startOfWeek is the Monday of the week', () => {
    expect(startOfWeek('2026-09-08')).toBe('2026-09-07'); // Tuesday → Monday
    expect(startOfWeek('2026-09-07')).toBe('2026-09-07'); // Monday
    expect(startOfWeek('2026-09-13')).toBe('2026-09-07'); // Sunday belongs to the week before
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28'); // across a year change
  });

  test('weekDays lists Monday to Sunday', () => {
    expect(weekDays('2026-09-07')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  test('weekStarts ends with the current week and goes back count − 1 weeks', () => {
    const starts = weekStarts('2026-09-08', 3);
    expect(starts).toEqual(['2026-08-24', '2026-08-31', '2026-09-07']);
  });

  test('diffDays counts calendar days in both directions', () => {
    expect(diffDays('2026-09-01', '2026-09-08')).toBe(7);
    expect(diffDays('2026-09-08', '2026-09-01')).toBe(-7);
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('month math', () => {
  test('startOfMonth is the first day of the month', () => {
    expect(startOfMonth('2026-09-09')).toBe('2026-09-01');
    expect(startOfMonth('2026-09-01')).toBe('2026-09-01');
    expect(startOfMonth('2026-12-31')).toBe('2026-12-01');
  });

  test('addMonths clamps to the last day of the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-09-01', -1)).toBe('2026-08-01');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2027-01-15', -1)).toBe('2026-12-15');
  });

  test('diffMonths counts whole months between the two months', () => {
    expect(diffMonths('2026-09-30', '2026-10-01')).toBe(1);
    expect(diffMonths('2026-09-01', '2026-09-30')).toBe(0);
    expect(diffMonths('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffMonths('2026-10-01', '2026-09-01')).toBe(-1);
  });

  test('monthGrid always has 42 cells and starts on a Monday', () => {
    for (const month of ['2026-09-01', '2026-02-01', '2026-03-01']) {
      const grid = monthGrid(month);
      expect(grid).toHaveLength(MONTH_GRID_SIZE);
      const firstDay = grid.find(cell => cell !== null) as string;
      const index = grid.indexOf(firstDay);
      // Every row starts on a Monday: index 0, 7, 14… of the grid is a Monday.
      for (let column = 0; column < 42; column += 7) {
        const cell = grid[column];
        if (cell !== null) expect(startOfWeek(cell)).toBe(cell);
      }
      expect(index).toBe((dateFromDayKey(firstDay).getDay() + 6) % 7);
    }
  });

  test('monthGrid leaves neighbouring months empty and turns the month over', () => {
    // September 2026 starts on a Tuesday and has 30 days.
    const september = monthGrid('2026-09-15');
    expect(september[0]).toBeNull();
    expect(september[1]).toBe('2026-09-01');
    expect(september[30]).toBe('2026-09-30');
    expect(september[31]).toBeNull();
    expect(september[41]).toBeNull();
    expect(september.filter(cell => cell !== null)).toHaveLength(30);

    // January 2026 starts on a Thursday; February 2026 has 28 days.
    const january = monthGrid('2026-01-10');
    expect(january[3]).toBe('2026-01-01');
    expect(january[33]).toBe('2026-01-31');
    expect(january[34]).toBeNull();
    expect(monthGrid('2026-02-01').filter(cell => cell !== null)).toHaveLength(
      28,
    );
  });

  test('the selectable range is the strip range, and no day past it', () => {
    const today = '2026-09-09'; // A Wednesday.
    const { firstDay, lastDay } = dayRange(today);
    expect(firstDay).toBe(startOfWeek(firstDay));
    expect(diffDays(firstDay, lastDay)).toBe(WEEKS_BACK * 7 - 1);
    expect(lastDay).toBe('2026-09-13'); // The Sunday that closes this week.

    const inRange = (day: string) =>
      diffDays(firstDay, day) >= 0 && diffDays(day, lastDay) >= 0;
    expect(inRange(firstDay)).toBe(true);
    expect(inRange(today)).toBe(true);
    expect(inRange(lastDay)).toBe(true);
    expect(inRange(addDays(firstDay, -1))).toBe(false);
    // The day after the end of the current week is not selectable.
    expect(inRange(addDays(lastDay, 1))).toBe(false);

    // One page per month over that range, newest first.
    const pages = diffMonths(startOfMonth(firstDay), startOfMonth(lastDay)) + 1;
    expect(pages).toBe(25);
    expect(addMonths(startOfMonth(lastDay), -(pages - 1))).toBe(
      startOfMonth(firstDay),
    );
  });
});
