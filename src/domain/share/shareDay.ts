import { MEALS, type DayTotals, type Meal } from '../diary/Meal';
import type { DayKey } from '../diary/days';

/**
 * What a shared day is made of, independent of how it is drawn or worded.
 *
 * Both outputs — the PNG and the plain text — read the same shape, so the
 * image and the message a person pastes next to it can never disagree.
 */
export interface ShareEntry {
  /** The food as the diary prints it, already in the reader's language. */
  name: string;
  grams: number;
  /** "colher de servir cheia" when the portion was expressed as a measure. */
  servingLabel?: string;
  servingCount?: number;
  kcal: number;
}

export interface ShareMealBlock {
  meal: Meal;
  kcal: number;
  entries: ShareEntry[];
}

export interface ShareDay {
  day: DayKey;
  totals: DayTotals;
  goalKcal: number;
  /** Only the meals that have something in them, in the day's fixed order. */
  blocks: ShareMealBlock[];
  /** Nothing was logged: the piece and the text say so instead of going blank. */
  empty: boolean;
}

type EntrySource = ShareEntry & { meal: Meal };

/**
 * Groups the day's entries by meal, keeping the four meals in their fixed
 * order and dropping the empty ones: a meal with nothing in it is noise in a
 * message and a hole in a picture.
 */
export function buildShareDay(
  day: DayKey,
  entries: readonly EntrySource[],
  totals: DayTotals,
  goalKcal: number,
): ShareDay {
  const blocks: ShareMealBlock[] = [];
  for (const meal of MEALS) {
    const own = entries.filter(entry => entry.meal === meal);
    if (own.length === 0) continue;
    blocks.push({
      meal,
      kcal: Math.round(own.reduce((sum, entry) => sum + entry.kcal, 0)),
      entries: own.map(entry => ({
        name: entry.name,
        grams: entry.grams,
        servingLabel: entry.servingLabel,
        servingCount: entry.servingCount,
        kcal: Math.round(entry.kcal),
      })),
    });
  }
  return {
    day,
    totals: {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    goalKcal: Math.round(goalKcal),
    blocks,
    empty: blocks.length === 0,
  };
}
