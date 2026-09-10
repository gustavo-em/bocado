import type { Meal } from '../diary/Meal';
import type { ShareDay, ShareEntry } from './shareDay';

/**
 * The day piece is a fixed 1080 × 1350 (4:5) drawing, so what has to be
 * decided before drawing is how much of the day fits in it. Everything here is
 * in the piece's own pixels, which is also its view box.
 */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const CARD_MARGIN = 64;
export const CARD_CONTENT_WIDTH = CARD_WIDTH - CARD_MARGIN * 2;

/**
 * Where the list of meals starts and ends, under the totals and above the
 * mark. The four fixed meals, each with two entries and a "+N mais" line —
 * the worst case the truncation below promises to draw — measure 704 px, so
 * the room given here is 708.
 */
export const MEALS_TOP = 548;
export const MEALS_BOTTOM = 1256;
export const MEALS_HEIGHT = MEALS_BOTTOM - MEALS_TOP;

export const MEAL_HEADER_HEIGHT = 56;
export const MEAL_ENTRY_HEIGHT = 36;
export const MEAL_GAP = 16;
/** A truncated meal keeps at least this many entries while there is room. */
export const MEAL_MIN_ENTRIES = 2;

/**
 * Average glyph width of Inter as a share of its size. SVG text has no
 * ellipsis of its own, so a line that would run past the margin is cut here
 * instead — measured on the widest copy the app ships (a food name in
 * Portuguese with its accents and commas).
 */
export const GLYPH_RATIO = 0.52;

/**
 * `text` shortened until it fits `maxWidth` at `fontSize`, ending in an
 * ellipsis when anything was cut. A name that does not fit is cut, never
 * scaled down: the piece has one type size per role.
 */
export function fitText(
  text: string,
  maxWidth: number,
  fontSize: number,
): string {
  const perGlyph = fontSize * GLYPH_RATIO;
  const room = Math.floor(maxWidth / perGlyph);
  if (room <= 0) return '';
  if (text.length <= room) return text;
  if (room === 1) return '…';
  return `${text.slice(0, room - 1).trimEnd()}…`;
}

export interface DayCardBlock {
  meal: Meal;
  kcal: number;
  entries: ShareEntry[];
  /** How many entries did not fit; drawn as one "+N mais" line. */
  hidden: number;
}

export interface DayCardModel {
  blocks: DayCardBlock[];
  empty: boolean;
}

function blockHeight(block: DayCardBlock): number {
  const lines = block.entries.length + (block.hidden > 0 ? 1 : 0);
  return MEAL_HEADER_HEIGHT + lines * MEAL_ENTRY_HEIGHT;
}

function totalHeight(blocks: DayCardBlock[]): number {
  if (blocks.length === 0) return 0;
  return (
    blocks.reduce((sum, block) => sum + blockHeight(block), 0) +
    MEAL_GAP * (blocks.length - 1)
  );
}

/** The meal that can still give a line away, the fullest one first. */
function fullestBlock(blocks: DayCardBlock[], floor: number): number {
  let index = -1;
  let most = floor;
  blocks.forEach((block, at) => {
    if (block.entries.length > most) {
      most = block.entries.length;
      index = at;
    }
  });
  return index;
}

/**
 * What the piece can show of the day.
 *
 * Nothing is squeezed: the type sizes are fixed, so when a day has more
 * entries than the piece has room for, the quietest entries — the ones with
 * the fewest kcal — step aside and are counted in a "+N mais" line. Every meal
 * keeps two entries while there is any room at all, so a big lunch cannot
 * erase a small breakfast; only when that is still too much does a meal go
 * down to a single line, and then to its header alone.
 */
export function buildDayCard(day: ShareDay): DayCardModel {
  const blocks: DayCardBlock[] = day.blocks.map(block => ({
    meal: block.meal,
    kcal: block.kcal,
    entries: [...block.entries],
    hidden: 0,
  }));

  for (const floor of [MEAL_MIN_ENTRIES, 0]) {
    while (totalHeight(blocks) > MEALS_HEIGHT) {
      const index = fullestBlock(blocks, floor);
      if (index < 0) break;
      const block = blocks[index];
      // The smallest entry of the fullest meal leaves first, and it leaves
      // from the end of the meal, so the order the day was eaten in survives.
      let smallest = 0;
      block.entries.forEach((entry, at) => {
        if (entry.kcal <= block.entries[smallest].kcal) smallest = at;
      });
      block.entries.splice(smallest, 1);
      block.hidden += 1;
    }
  }

  return { blocks, empty: day.empty };
}
