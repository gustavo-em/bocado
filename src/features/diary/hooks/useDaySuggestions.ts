import { useEffect, useState } from 'react';

import { diaryRepository } from '../../../data/diary/DiaryRepository';
import { MEALS, type Meal } from '../../../domain/diary/Meal';
import type { DayKey } from '../../../domain/diary/days';
import type { RepeatSource } from '../../../domain/diary/suggestions';
import {
  buildMealSuggestions,
  EMPTY_MEAL_CHIPS,
  loadDaySuggestions,
  type SuggestionItem,
} from '../../suggestions/suggestionsService';

const DAY_SUGGESTIONS_LOG_TAG = '[bocado:day-suggestions]';

export interface MealChips {
  items: SuggestionItem[];
  repeat: RepeatSource | null;
}

export type DaySuggestions = Partial<Record<Meal, MealChips>>;

/**
 * The chips an empty meal shows instead of "Nada registrado ainda", for the day
 * on screen — today or any other one: the two best foods of the score plus
 * "Repetir" when there is a meal worth repeating. Read once per day and again
 * whenever the diary changes, off the same cached reading the search screen
 * uses.
 */
export function useDaySuggestions(day: DayKey): DaySuggestions {
  const [suggestions, setSuggestions] = useState<DaySuggestions>({});
  const [version, setVersion] = useState(0);

  useEffect(() => diaryRepository.subscribe(() => setVersion(n => n + 1)), []);

  useEffect(() => {
    // A reading that lands after the day changed belongs to the day that was
    // left behind, and must not be shown against the new one.
    let active = true;
    const now = new Date();
    loadDaySuggestions(day)
      .then(data =>
        Promise.all(
          MEALS.map(meal =>
            buildMealSuggestions(data, {
              day,
              meal,
              now,
              limit: EMPTY_MEAL_CHIPS,
            }).then(result => [meal, result] as const),
          ),
        ),
      )
      .then(entries => {
        if (!active) return;
        const next: DaySuggestions = {};
        for (const [meal, result] of entries) {
          next[meal] = { items: result.items, repeat: result.repeat };
        }
        setSuggestions(next);
      })
      .catch(error => {
        console.warn(`${DAY_SUGGESTIONS_LOG_TAG} failed: ${String(error)}`);
      });
    return () => {
      active = false;
    };
  }, [day, version]);

  return suggestions;
}
