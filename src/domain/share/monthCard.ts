import type { DayTotals } from '../diary/Meal';
import { monthGrid, type DayKey } from '../diary/days';

/**
 * The month piece is the same 1080 × 1350 as the day, with a seven by six
 * grid inside it. A cell is 136 px wide, which is about 68 px once WhatsApp
 * has shown the image in a bubble: enough for the day, one number and a bar,
 * and not enough for three macro labels — those are summed up in the footer
 * instead of turned into a smudge.
 */
export const MONTH_CELL = 136;
export const MONTH_CELL_GAP = 0;
export const MONTH_COLUMNS = 7;
export const MONTH_ROWS = 6;

/** How the day's macros split its energy: what the three-part bar draws. */
export interface MacroShare {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MonthCardCell {
  day: DayKey | null;
  dayOfMonth: number | null;
  /**
   * The day has entries. Not the same as `kcal > 0`: a day of black coffee
   * and water was logged, and the grid must not call it an empty day.
   */
  logged: boolean;
  kcal: number;
  share: MacroShare;
}

export interface MonthCardModel {
  monthStart: DayKey;
  /** 42 cells, Monday first; a neighbouring month's day is `null`. */
  cells: MonthCardCell[];
  total: DayTotals;
  /** Days of this month with at least one entry. */
  loggedDays: number;
  /** Rounded per-logged-day averages, or `null` when nothing was logged. */
  average: DayTotals | null;
  empty: boolean;
}

const EMPTY_SHARE: MacroShare = { protein: 0, carbs: 0, fat: 0 };

/**
 * The share of the day's energy each macro carries (4/4/9 kcal per gram).
 * Energy, not grams: a gram of fat is not a gram of carbohydrate, and the bar
 * would lie about a fatty day if it counted grams.
 */
export function macroShare(totals: DayTotals): MacroShare {
  const protein = Math.max(totals.protein, 0) * 4;
  const carbs = Math.max(totals.carbs, 0) * 4;
  const fat = Math.max(totals.fat, 0) * 9;
  const sum = protein + carbs + fat;
  if (sum <= 0) return EMPTY_SHARE;
  return { protein: protein / sum, carbs: carbs / sum, fat: fat / sum };
}

/**
 * One month, ready to draw: every cell already knows its number, its kcal and
 * its macro split, and the footer already knows the month's total and its
 * average day. A month with nothing in it still returns its 42 cells — the
 * grid is drawn, and the footer says there is nothing in it.
 */
export function buildMonthCard(
  monthStart: DayKey,
  totalsByDay: Readonly<Record<DayKey, DayTotals>>,
): MonthCardModel {
  const cells: MonthCardCell[] = monthGrid(monthStart).map(day => {
    if (day === null) {
      return {
        day: null,
        dayOfMonth: null,
        logged: false,
        kcal: 0,
        share: EMPTY_SHARE,
      };
    }
    const totals = totalsByDay[day];
    return {
      day,
      dayOfMonth: Number(day.slice(8, 10)),
      logged: totals !== undefined,
      kcal: totals ? Math.round(totals.kcal) : 0,
      share: totals ? macroShare(totals) : EMPTY_SHARE,
    };
  });

  const total: DayTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let loggedDays = 0;
  for (const cell of cells) {
    if (cell.day === null) continue;
    const totals = totalsByDay[cell.day];
    // A day counts because it was logged, not because it added up to
    // something: the range query only returns days that have entries.
    if (!totals) continue;
    total.kcal += totals.kcal;
    total.protein += totals.protein;
    total.carbs += totals.carbs;
    total.fat += totals.fat;
    loggedDays += 1;
  }

  const rounded: DayTotals = {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
  };

  return {
    monthStart,
    cells,
    total: rounded,
    loggedDays,
    average:
      loggedDays === 0
        ? null
        : {
            kcal: Math.round(total.kcal / loggedDays),
            protein: Math.round(total.protein / loggedDays),
            carbs: Math.round(total.carbs / loggedDays),
            fat: Math.round(total.fat / loggedDays),
          },
    empty: loggedDays === 0,
  };
}
