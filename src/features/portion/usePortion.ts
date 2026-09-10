import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  diaryRepository,
  type DiaryEntryView,
} from '../../data/diary/DiaryRepository';
import { localFoodProvider } from '../../data/providers/LocalFoodProvider';
import type { Meal } from '../../domain/diary/Meal';
import type { NormalizedFood } from '../../domain/food/NormalizedFood';
import {
  clampQuantity,
  gramsFor,
  initialPortion,
  portionUnits,
  quantityForUnitChange,
  selectionForEntry,
  snapshotForGrams,
  stepQuantity,
  unitKey,
  unitLimits,
  writableServing,
  type PortionSnapshot,
  type PortionUnit,
} from '../../domain/food/portion';
import { currentLanguage } from '../../i18n';
import { cachedFood, emitPortionResult } from './portionSheet';

const PORTION_LOG_TAG = '[bocado:portion]';

export interface PortionParams {
  day: string;
  meal: Meal;
  foodId: string;
  /** Present when the sheet is editing an entry that already exists. */
  entryId?: string;
}

export interface Portion {
  food: NormalizedFood | null;
  /** The entry being edited; `null` while adding. */
  entry: DiaryEntryView | null;
  editing: boolean;
  units: PortionUnit[];
  unit: PortionUnit | null;
  quantity: number;
  /** kcal and macros of the current quantity, live. */
  snapshot: PortionSnapshot | null;
  /** Where the entry will land; only the edit sheet can change it. */
  targetMeal: Meal;
  /**
   * The sheet was opened on an entry that no longer exists (removed from
   * another screen, or its "Desfazer" window ran out). Nothing can be saved,
   * so the screen closes instead of writing a second row.
   */
  gone: boolean;
  /** True while the write is in flight, so a double tap writes once. */
  saving: boolean;
  selectUnit: (unit: PortionUnit) => void;
  step: (direction: 1 | -1) => void;
  typeQuantity: (text: string) => void;
  selectMeal: (meal: Meal) => void;
  confirm: () => Promise<void>;
}

/** "1,5" and "1.5" both mean one and a half; anything else is ignored. */
function parseQuantity(text: string): number {
  return Number(text.replace(/\s/g, '').replace(',', '.'));
}

/**
 * Everything the portion sheet holds: the food, the chip in effect and how
 * many of it. The quantity is the state and the grams follow from it, so the
 * number on screen, the kcal in the button and the row written to the diary
 * can never disagree.
 */
export function usePortion(params: PortionParams): Portion {
  const { day, meal, foodId, entryId } = params;
  const [food, setFood] = useState<NormalizedFood | null>(
    () => cachedFood(foodId) ?? null,
  );
  const [entry, setEntry] = useState<DiaryEntryView | null>(null);
  const [unit, setUnit] = useState<PortionUnit | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [targetMeal, setTargetMeal] = useState<Meal>(meal);
  const [gone, setGone] = useState(false);
  const [saving, setSaving] = useState(false);
  /** The first portion is chosen once; a later re-render never resets it. */
  const seeded = useRef(false);

  useEffect(() => {
    let alive = true;
    const locale = currentLanguage();
    const loadFood = cachedFood(foodId)
      ? Promise.resolve(cachedFood(foodId) ?? null)
      : localFoodProvider.getById(foodId);
    const loadEntry = entryId
      ? diaryRepository.entryById(entryId)
      : Promise.resolve(null);
    const loadUsage = entryId
      ? Promise.resolve(null)
      : diaryRepository.usageForFood(foodId);

    Promise.all([loadFood, loadEntry, loadUsage])
      .then(([loadedFood, loadedEntry, usage]) => {
        if (!alive || !loadedFood) return;
        // Editing an entry that is no longer in the diary: saving it would
        // write a brand new row, so the sheet gives up instead.
        if (entryId !== undefined && !loadedEntry) {
          setGone(true);
          return;
        }
        setFood(loadedFood);
        if (loadedEntry) {
          setEntry(loadedEntry);
          setTargetMeal(loadedEntry.meal);
        }
        if (seeded.current) return;
        seeded.current = true;
        const selection = loadedEntry
          ? selectionForEntry(loadedFood, loadedEntry, locale)
          : initialPortion(loadedFood, usage, locale);
        setUnit(selection.unit);
        setQuantity(selection.quantity);
      })
      .catch(error => {
        console.warn(`${PORTION_LOG_TAG} load failed: ${String(error)}`);
      });

    return () => {
      alive = false;
    };
  }, [foodId, entryId]);

  const units = useMemo(() => (food ? portionUnits(food) : []), [food]);

  const snapshot = useMemo(() => {
    if (!food || !unit) return null;
    return snapshotForGrams(food, gramsFor(quantity, unit));
  }, [food, unit, quantity]);

  const selectUnit = useCallback(
    (next: PortionUnit) => {
      if (unit && unitKey(unit) !== unitKey(next)) {
        // Towards grams the mass is preserved; towards a household measure the
        // number restarts at one, which is what the tap meant.
        setQuantity(quantityForUnitChange(unit, next, quantity));
      }
      setUnit(next);
    },
    [unit, quantity],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      if (!unit) return;
      setQuantity(current =>
        stepQuantity(current, direction, unitLimits(unit)),
      );
    },
    [unit],
  );

  const typeQuantity = useCallback(
    (text: string) => {
      if (!unit) return;
      const parsed = parseQuantity(text);
      if (!Number.isFinite(parsed)) return;
      setQuantity(clampQuantity(parsed, unitLimits(unit)));
    },
    [unit],
  );

  const confirm = useCallback(async () => {
    if (!food || !unit || saving || gone) return;
    // "Salvar" only ever updates: an edit whose row was not read back has
    // nothing to save, and must not fall through to writing a new entry.
    if (entryId !== undefined && !entry) return;
    setSaving(true);
    const locale = currentLanguage();
    const { serving, servingCount } = writableServing(unit, quantity);
    try {
      const written = entry
        ? await diaryRepository.updateEntry({
            id: entry.id,
            food,
            serving,
            servingCount,
            meal: targetMeal,
            locale,
          })
        : await diaryRepository.addEntry({
            day,
            meal: targetMeal,
            food,
            serving,
            servingCount,
            locale,
          });
      emitPortionResult({ kind: entry ? 'saved' : 'added', entry: written });
    } catch (error) {
      console.warn(`${PORTION_LOG_TAG} write failed: ${String(error)}`);
      setSaving(false);
      throw error;
    }
  }, [food, unit, quantity, entry, entryId, targetMeal, day, saving, gone]);

  return {
    food,
    entry,
    editing: entryId !== undefined,
    units,
    unit,
    quantity,
    snapshot,
    targetMeal,
    gone,
    saving,
    selectUnit,
    step,
    typeQuantity,
    selectMeal: setTargetMeal,
    confirm,
  };
}
