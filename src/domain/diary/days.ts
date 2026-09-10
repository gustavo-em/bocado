/**
 * Calendar math on day keys (`YYYY-MM-DD`, local civil day). Pure: no
 * locale, no React. Formatting for humans lives in `src/i18n/format.ts`.
 */
export type DayKey = string;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayKeyFromDate(date: Date): DayKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local midnight of the given key. Throws on a malformed key: it is a programming error. */
export function dateFromDayKey(key: DayKey): Date {
  const match = DAY_KEY.exec(key);
  if (!match) throw new Error(`Invalid day key: ${key}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = dateFromDayKey(key);
  date.setDate(date.getDate() + days);
  return dayKeyFromDate(date);
}

/** The Monday that starts the week containing `key`. */
export function startOfWeek(key: DayKey): DayKey {
  const date = dateFromDayKey(key);
  // getDay(): 0 = Sunday … 6 = Saturday. Monday-first weeks, as in pt-BR.
  const offset = (date.getDay() + 6) % 7;
  return addDays(key, -offset);
}

/** Monday … Sunday of the week that starts at `weekStart`. */
export function weekDays(weekStart: DayKey): DayKey[] {
  const days: DayKey[] = [];
  for (let index = 0; index < 7; index += 1)
    days.push(addDays(weekStart, index));
  return days;
}

/**
 * Week starts from `count - 1` weeks before the week of `lastDay` up to and
 * including that week, oldest first. The strip pages over this list.
 */
export function weekStarts(lastDay: DayKey, count: number): DayKey[] {
  const last = startOfWeek(lastDay);
  const starts: DayKey[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    starts.push(addDays(last, -7 * index));
  }
  return starts;
}

/** The first day of the month containing `key`. */
export function startOfMonth(key: DayKey): DayKey {
  const date = dateFromDayKey(key);
  return dayKeyFromDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * `key` moved by whole months, clamped to the last day of the target month:
 * 31 January + 1 month is 28 (or 29) February, never 3 March.
 */
export function addMonths(key: DayKey, months: number): DayKey {
  const date = dateFromDayKey(key);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTarget = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(date.getDate(), lastDayOfTarget));
  return dayKeyFromDate(target);
}

/** Whole months from the month of `from` to the month of `to`. */
export function diffMonths(from: DayKey, to: DayKey): number {
  const a = dateFromDayKey(from);
  const b = dateFromDayKey(to);
  return (
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
}

/** Number of cells in a month grid: six rows of seven, always. */
export const MONTH_GRID_SIZE = 42;

/**
 * The 42 cells of one month, Monday first. A cell is the day key when it
 * belongs to `monthStart`'s month and `null` when it belongs to a neighbour:
 * the grid keeps its six rows in every month, and neighbours stay empty.
 */
export function monthGrid(monthStart: DayKey): (DayKey | null)[] {
  const first = startOfMonth(monthStart);
  const date = dateFromDayKey(first);
  const lead = (date.getDay() + 6) % 7; // Monday-first offset of the 1st.
  const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (DayKey | null)[] = [];
  for (let index = 0; index < MONTH_GRID_SIZE; index += 1) {
    const dayOfMonth = index - lead + 1;
    cells.push(
      dayOfMonth >= 1 && dayOfMonth <= length
        ? addDays(first, dayOfMonth - 1)
        : null,
    );
  }
  return cells;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: DayKey, to: DayKey): number {
  const a = dateFromDayKey(from);
  const b = dateFromDayKey(to);
  // Round to absorb DST shifts: the difference is 23 or 25 hours across a change.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
