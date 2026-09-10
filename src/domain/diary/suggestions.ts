/**
 * Frecency with context (docs/specs/04): what the user is about to log, ranked
 * from what they logged before. Pure — no SQLite, no `Date.now()`, no i18n:
 * "now" and the day of every event arrive as parameters, so the same input
 * always ranks the same way and the whole thing is unit-testable.
 */
import { searchKey } from '../food/searchQuery';
import { dateFromDayKey, diffDays, type DayKey } from './days';
import type { Meal } from './Meal';

/** How far back the diary is read for the ranking. */
export const SUGGESTION_HISTORY_DAYS = 90;
/** Below this a food is noise — one old log in another meal — and is dropped. */
export const SUGGESTION_MIN_SCORE = 0.05;
/** "Repetir" needs a meal worth repeating. */
export const MIN_REPEAT_ITEMS = 2;
/** What a food already in the target meal is penalised by. */
const ALREADY_LOGGED_PENALTY = 100;
const MINUTES_PER_DAY = 1440;

/** One past logging of a food, as the score reads it. */
export interface SuggestionEvent {
  foodId: string;
  meal: Meal;
  /** The civil day the entry belongs to (not when the row was written). */
  day: DayKey;
  /** Local clock of the logging, in minutes past midnight. */
  minuteOfDay: number;
}

export interface SuggestionContext {
  /** The day the suggestions are for. */
  day: DayKey;
  meal: Meal;
  /** Local clock of "now", in minutes past midnight. */
  minuteOfDay: number;
  /** `food_usage.favorite = 1`. */
  favorites?: ReadonlySet<string>;
  /** Foods already logged in `meal` on `day`: never suggested again. */
  alreadyLogged?: ReadonlySet<string>;
  /** Foods with a remembered portion; first tie-break. */
  knownPortion?: ReadonlySet<string>;
  /** `food_usage.use_count`; second tie-break. */
  useCount?: ReadonlyMap<string, number>;
  /** Names for the last tie-break; ids are compared when absent. */
  names?: ReadonlyMap<string, string>;
}

export interface RankedSuggestion {
  foodId: string;
  score: number;
}

/** 1,0 (≤ 4 h) · 0,8 (≤ 1 d) · 0,6 (≤ 3 d) · 0,4 (≤ 7 d) · 0,2 (≤ 30 d) · 0,1 (≤ 90 d). */
function recencyWeight(hoursAgo: number): number {
  if (hoursAgo <= 4) return 1;
  if (hoursAgo <= 24) return 0.8;
  if (hoursAgo <= 72) return 0.6;
  if (hoursAgo <= 168) return 0.4;
  if (hoursAgo <= 720) return 0.2;
  if (hoursAgo <= 2160) return 0.1;
  return 0;
}

/** 1,0 within an hour of the same clock time, 0,7 within three, else 0,4. */
function hourWeight(minutesApart: number): number {
  if (minutesApart <= 60) return 1;
  if (minutesApart <= 180) return 0.7;
  return 0.4;
}

/** The clock is a circle: 23h and 1h are two hours apart, not twenty-two. */
function clockDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, MINUTES_PER_DAY - raw);
}

function weekdayOf(day: DayKey, cache: Map<DayKey, number>): number {
  const known = cache.get(day);
  if (known !== undefined) return known;
  const weekday = dateFromDayKey(day).getDay();
  cache.set(day, weekday);
  return weekday;
}

function daysBetween(
  from: DayKey,
  to: DayKey,
  cache: Map<DayKey, number>,
): number {
  const known = cache.get(from);
  if (known !== undefined) return known;
  const days = diffDays(from, to);
  cache.set(from, days);
  return days;
}

/**
 * The score of docs/specs/04, summed over every event of a food:
 *
 *   w_recência × w_refeição × w_hora × w_semana, × 1,25 when favourite,
 *   − 100 when the food is already in the target meal.
 *
 * One pass over the events (O(n)), with the calendar maths memoised per day,
 * so 2.000 entries stay well inside the 30 ms budget of the J6.
 */
export function rankSuggestions(
  events: readonly SuggestionEvent[],
  context: SuggestionContext,
): RankedSuggestion[] {
  const {
    day,
    meal,
    minuteOfDay,
    favorites,
    alreadyLogged,
    knownPortion,
    useCount,
    names,
  } = context;
  const scores = new Map<string, number>();
  const weekdayCache = new Map<DayKey, number>();
  const daysCache = new Map<DayKey, number>();
  const nowWeekday = weekdayOf(day, weekdayCache);

  for (const event of events) {
    const daysAgo = daysBetween(event.day, day, daysCache);
    // A later clock time on the same day (or a day still ahead) is "now".
    const hoursAgo = Math.max(
      0,
      daysAgo * 24 + (minuteOfDay - event.minuteOfDay) / 60,
    );
    const recency = recencyWeight(hoursAgo);
    if (recency === 0) continue;
    const mealWeight = event.meal === meal ? 1 : 0.35;
    const hour = hourWeight(clockDistance(event.minuteOfDay, minuteOfDay));
    const weekday =
      weekdayOf(event.day, weekdayCache) === nowWeekday ? 1.15 : 1;
    const previous = scores.get(event.foodId) ?? 0;
    scores.set(event.foodId, previous + recency * mealWeight * hour * weekday);
  }

  const ranked: RankedSuggestion[] = [];
  scores.forEach((raw, foodId) => {
    let score = raw * (favorites?.has(foodId) ? 1.25 : 1);
    if (alreadyLogged?.has(foodId)) score -= ALREADY_LOGGED_PENALTY;
    if (score >= SUGGESTION_MIN_SCORE) ranked.push({ foodId, score });
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const portionA = knownPortion?.has(a.foodId) ? 1 : 0;
    const portionB = knownPortion?.has(b.foodId) ? 1 : 0;
    if (portionA !== portionB) return portionB - portionA;
    const countA = useCount?.get(a.foodId) ?? 0;
    const countB = useCount?.get(b.foodId) ?? 0;
    if (countA !== countB) return countB - countA;
    const nameA = names?.get(a.foodId) ?? a.foodId;
    const nameB = names?.get(b.foodId) ?? b.foodId;
    return nameA.localeCompare(nameB);
  });
  return ranked;
}

/**
 * Mixes the ranked history with the seed's starters: history first, then the
 * starters it has not already named, up to `limit` rows.
 */
export function mixWithStarters(
  ranked: readonly RankedSuggestion[],
  starters: readonly string[],
  limit: number,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    if (ids.length >= limit) return ids;
    if (seen.has(item.foodId)) continue;
    seen.add(item.foodId);
    ids.push(item.foodId);
  }
  for (const id of starters) {
    if (ids.length >= limit) return ids;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export type RepeatSourceKind = 'yesterday' | 'lastWeek';

/** A meal that could be copied over, as the composite row prints it. */
export interface RepeatCandidate {
  day: DayKey;
  itemCount: number;
  kcal: number;
}

export interface RepeatSource extends RepeatCandidate {
  kind: RepeatSourceKind;
}

/**
 * "Repetir almoço de ontem": offered only when the target meal is empty and
 * the source has at least two items. Yesterday wins; the same weekday of the
 * week before is the fallback.
 */
export function pickRepeatSource(input: {
  /** Items already in the target meal of the day being added to. */
  targetCount: number;
  yesterday: RepeatCandidate | null;
  lastWeek: RepeatCandidate | null;
}): RepeatSource | null {
  if (input.targetCount > 0) return null;
  const { yesterday, lastWeek } = input;
  if (yesterday && yesterday.itemCount >= MIN_REPEAT_ITEMS) {
    return { ...yesterday, kind: 'yesterday' };
  }
  if (lastWeek && lastWeek.itemCount >= MIN_REPEAT_ITEMS) {
    return { ...lastWeek, kind: 'lastWeek' };
  }
  return null;
}

/**
 * The head of a food name — "Banana" out of "Banana, prata, crua" — in the
 * same normalized form both sides of a search meet in.
 */
function headKey(name: string): string {
  return searchKey(name.split(',')[0] ?? name);
}

/**
 * Drops from a chip line the suggestions that say again what the meal already
 * has. The id filter upstream only catches the very same food; two sources of
 * the same thing ("Banana, prata, crua" from TACO and "Banana" from the
 * starters) reach the row as different ids, and a chip offering what is one
 * line above it is noise. Compared by the first facet of the name, which is
 * what the eye reads.
 */
export function withoutLoggedDuplicates<T extends { name: string }>(
  items: readonly T[],
  loggedNames: readonly string[],
): T[] {
  if (loggedNames.length === 0) return items.slice();
  const logged = new Set(loggedNames.map(headKey));
  return items.filter(item => !logged.has(headKey(item.name)));
}
