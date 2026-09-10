import { useEffect, useState } from 'react';

import type { Meal } from '../../../domain/diary/Meal';
import type { DayKey } from '../../../domain/diary/days';
import {
  loadMealSuggestions,
  type MealSuggestions,
} from '../../suggestions/suggestionsService';

const SUGGESTIONS_LOG_TAG = '[bocado:suggestions]';

/**
 * The ranked suggestions of one meal, read once when the search opens and
 * frozen for as long as it stays open: adding a food must not reorder the
 * rows under the finger — the row it was added from only gains its "✓".
 */
export function useSuggestions(
  day: DayKey,
  meal: Meal,
): MealSuggestions | null {
  const [suggestions, setSuggestions] = useState<MealSuggestions | null>(null);

  useEffect(() => {
    let active = true;
    loadMealSuggestions({ day, meal, now: new Date(), includeChips: true })
      .then(result => {
        if (active) setSuggestions(result);
      })
      .catch(error => {
        console.warn(`${SUGGESTIONS_LOG_TAG} failed: ${String(error)}`);
      });
    return () => {
      active = false;
    };
  }, [day, meal]);

  return suggestions;
}
