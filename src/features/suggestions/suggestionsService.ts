/**
 * What the screens need to suggest food (docs/specs/04): the diary of the last
 * 90 days, the memory table and the neighbouring days, read once per day and
 * ranked per meal by the pure score in `src/domain/diary/suggestions.ts`.
 *
 * The whole read is cached by day and thrown away whenever the diary changes,
 * so a screen that is already open never reorders under the finger while the
 * next one opens with fresh numbers.
 */
import {
  diaryRepository,
  type DiaryEntryView,
  type UsageMemoryRow,
  type UsageRow,
} from '../../data/diary/DiaryRepository';
import { localFoodProvider } from '../../data/providers/LocalFoodProvider';
import { importSeedIfNeeded } from '../../data/seed/importSeed';
import { getStarters } from '../../data/seed/starters';
import type { Meal } from '../../domain/diary/Meal';
import { addDays, type DayKey } from '../../domain/diary/days';
import {
  mixWithStarters,
  pickRepeatSource,
  rankSuggestions,
  SUGGESTION_HISTORY_DAYS,
  type RepeatSource,
  type SuggestionEvent,
} from '../../domain/diary/suggestions';
import type { NormalizedFood } from '../../domain/food/NormalizedFood';
import {
  portionSnapshot,
  servingFromMemory,
  type PortionSnapshot,
} from '../../domain/food/portion';
import { currentLanguage } from '../../i18n';

/** Rows in "Sugestões" (spec 04). */
export const SUGGESTION_ROWS = 6;
/** Chips per line in "Recentes" and "Favoritos". */
export const SUGGESTION_CHIPS = 8;
/** Chips offered in place of "Nada registrado ainda". */
export const EMPTY_MEAL_CHIPS = 3;

/** One food ready to be logged in a tap, with the portion that will be written. */
export interface SuggestionItem {
  food: NormalizedFood;
  /** `food_usage.last_*`, when this food has been logged before. */
  memory: UsageMemoryRow | null;
  /** The portion the "+" writes; the default serving when nothing is remembered. */
  portion: PortionSnapshot;
  /** True when `portion` comes from the memory instead of the default serving. */
  remembered: boolean;
}

export interface MealSuggestions {
  /** Up to `SUGGESTION_ROWS` foods: history first, then the seed's starters. */
  items: SuggestionItem[];
  /** "Repetir jantar de ontem", or `null` when there is nothing to repeat. */
  repeat: RepeatSource | null;
  recents: SuggestionItem[];
  favorites: SuggestionItem[];
  /** Every food the user has logged or favourited: the "Seus" section. */
  historyIds: ReadonlySet<string>;
  /** Remembered portions by food id, for foods outside the lists above. */
  memory: ReadonlyMap<string, UsageMemoryRow>;
}

interface DayData {
  events: SuggestionEvent[];
  usage: UsageRow[];
  usageById: Map<string, UsageRow>;
  recents: UsageRow[];
  favorites: UsageRow[];
  entries: DiaryEntryView[];
  yesterday: DiaryEntryView[];
  lastWeek: DiaryEntryView[];
}

let cache: { day: DayKey; data: Promise<DayData> } | null = null;

diaryRepository.subscribe(() => {
  cache = null;
});

/** Test seam, and what "Limpar sugestões" calls after emptying the table. */
export function resetSuggestionsCache(): void {
  cache = null;
}

async function readDay(day: DayKey): Promise<DayData> {
  await importSeedIfNeeded();
  const [events, usage, recents, favorites, entries, yesterday, lastWeek] =
    await Promise.all([
      diaryRepository.suggestionEvents(addDays(day, -SUGGESTION_HISTORY_DAYS)),
      diaryRepository.usageSummary(),
      diaryRepository.recentUsage(SUGGESTION_CHIPS),
      diaryRepository.favoriteUsage(SUGGESTION_CHIPS),
      diaryRepository.entriesForDay(day),
      diaryRepository.entriesForDay(addDays(day, -1)),
      diaryRepository.entriesForDay(addDays(day, -7)),
    ]);
  const usageById = new Map(usage.map(row => [row.foodId, row]));
  return {
    events,
    usage,
    usageById,
    recents,
    favorites,
    entries,
    yesterday,
    lastWeek,
  };
}

/** The day's reading, shared by every meal of that day. */
export function loadDaySuggestions(day: DayKey): Promise<DayData> {
  if (!cache || cache.day !== day) {
    cache = { day, data: readDay(day) };
  }
  return cache.data;
}

function memoryOf(row: UsageRow | undefined): UsageMemoryRow | null {
  if (!row || row.lastGrams === undefined) return null;
  return {
    lastGrams: row.lastGrams,
    lastServingLabel: row.lastServingLabel,
    lastServingCount: row.lastServingCount,
  };
}

function toItem(
  food: NormalizedFood,
  memory: UsageMemoryRow | null,
): SuggestionItem {
  const locale = currentLanguage();
  const { serving, servingCount } = servingFromMemory(food, memory, locale);
  return {
    food,
    memory,
    portion: portionSnapshot(food, serving, servingCount, locale),
    remembered: memory !== null,
  };
}

function summarise(
  entries: readonly DiaryEntryView[],
  meal: Meal,
  day: DayKey,
): { day: DayKey; itemCount: number; kcal: number } {
  const mine = entries.filter(entry => entry.meal === meal);
  return {
    day,
    itemCount: mine.length,
    kcal: mine.reduce((total, entry) => total + entry.kcal, 0),
  };
}

export interface BuildOptions {
  day: DayKey;
  meal: Meal;
  /** Local clock the ranking is made against. */
  now: Date;
  /** How many food rows to fill. */
  limit?: number;
  /** "Recentes" and "Favoritos" are only asked for by the search screen. */
  includeChips?: boolean;
}

/**
 * The ranked lists of one meal. History above the threshold first, the seed's
 * starters after it, and — when the meal is empty and a past one is worth
 * repeating — the composite "Repetir" line.
 */
export async function buildMealSuggestions(
  data: DayData,
  options: BuildOptions,
): Promise<MealSuggestions> {
  const { day, meal, now } = options;
  const limit = options.limit ?? SUGGESTION_ROWS;
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  const favorites = new Set(
    data.usage.filter(row => row.favorite).map(row => row.foodId),
  );
  const alreadyLogged = new Set(
    data.entries.filter(entry => entry.meal === meal).map(e => e.foodId),
  );
  const knownPortion = new Set(
    data.usage.filter(row => row.lastGrams !== undefined).map(r => r.foodId),
  );
  const useCount = new Map(data.usage.map(row => [row.foodId, row.useCount]));

  const ranked = rankSuggestions(data.events, {
    day,
    meal,
    minuteOfDay,
    favorites,
    alreadyLogged,
    knownPortion,
    useCount,
  });
  const starters = await getStarters(meal);
  const ids = mixWithStarters(
    ranked,
    starters.filter(id => !alreadyLogged.has(id)),
    limit,
  );

  const chipIds = options.includeChips
    ? [
        ...data.recents.map(row => row.foodId),
        ...data.favorites.map(row => row.foodId),
      ]
    : [];
  const wanted = Array.from(new Set([...ids, ...chipIds]));
  const foods = await localFoodProvider.getByIds(wanted);
  const byId = new Map(foods.map(food => [food.id, food]));

  const itemFor = (id: string): SuggestionItem | null => {
    const food = byId.get(id);
    if (!food) return null;
    return toItem(food, memoryOf(data.usageById.get(id)));
  };
  const pick = (list: readonly string[]): SuggestionItem[] =>
    list.map(itemFor).filter((item): item is SuggestionItem => item !== null);

  const repeat = pickRepeatSource({
    targetCount: alreadyLogged.size,
    yesterday: summarise(data.yesterday, meal, addDays(day, -1)),
    lastWeek: summarise(data.lastWeek, meal, addDays(day, -7)),
  });

  const memory = new Map<string, UsageMemoryRow>();
  data.usageById.forEach((row, id) => {
    const remembered = memoryOf(row);
    if (remembered) memory.set(id, remembered);
  });

  return {
    items: pick(ids),
    repeat,
    recents: options.includeChips
      ? pick(data.recents.map(row => row.foodId))
      : [],
    favorites: options.includeChips
      ? pick(data.favorites.map(row => row.foodId))
      : [],
    historyIds: new Set(data.usage.map(row => row.foodId)),
    memory,
  };
}

/** The whole thing for one meal, in one call. */
export async function loadMealSuggestions(
  options: BuildOptions,
): Promise<MealSuggestions> {
  const data = await loadDaySuggestions(options.day);
  return buildMealSuggestions(data, options);
}
