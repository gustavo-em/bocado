import type { Locale } from './FoodProvider';
import {
  REFERENCE_SERVING,
  type NormalizedFood,
  type Serving,
  type ServingKind,
} from './NormalizedFood';
import { scaleNutrients } from './units';

/**
 * The portion written by the one-tap "+" when nothing is remembered about the
 * food (spec 09, replacing spec 02): 100 g — 100 ml for a liquid, same number.
 * The owner weighs food far more often than he reaches for "copo médio", so
 * the household measures are offered, never assumed. Memory still wins:
 * `servingFromMemory` returns the last portion used for this food.
 */
export function defaultServing(_food: NormalizedFood): Serving {
  return REFERENCE_SERVING;
}

export interface PortionSnapshot {
  grams: number;
  /** How the user expressed it, in their locale ("colher de servir cheia"). */
  servingLabel?: string;
  servingCount?: number;
  /**
   * Where the label came from. A `package` label is the one printed on the
   * wrapper ("1 porção (20 g)") and already carries its own count, so a row
   * must repeat it verbatim instead of prefixing another number.
   */
  servingKind?: ServingKind;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function servingLabel(
  serving: Serving,
  locale: Locale = 'pt-BR',
): string | undefined {
  const preferred = locale === 'en-US' ? serving.label.en : serving.label.pt;
  return preferred ?? serving.label.pt ?? serving.label.en;
}

/**
 * Nutrient snapshot for `count × serving` of `food`. The diary stores this
 * so a later dataset update never rewrites history.
 */
export function portionSnapshot(
  food: NormalizedFood,
  serving: Serving,
  count = 1,
  locale: Locale = 'pt-BR',
): PortionSnapshot {
  const grams = roundGrams(serving.grams * count);
  const nutrients = scaleNutrients(food.per100g, grams);
  return {
    grams,
    servingLabel:
      serving.kind === 'reference' ? undefined : servingLabel(serving, locale),
    servingCount: serving.kind === 'reference' ? undefined : count,
    servingKind: serving.kind === 'reference' ? undefined : serving.kind,
    ...nutrients,
  };
}

/** Snapshot of the default portion — what the "+" writes. */
export function defaultPortion(
  food: NormalizedFood,
  locale: Locale = 'pt-BR',
): PortionSnapshot {
  return portionSnapshot(food, defaultServing(food), 1, locale);
}

/* ------------------------------------------------------------------ *
 * Portion sheet (docs/specs/03)
 * ------------------------------------------------------------------ */

export interface QuantityLimits {
  min: number;
  max: number;
  step: number;
  /** Decimals kept when snapping to the step grid. */
  decimals: number;
}

/**
 * Spec 03: a household measure moves by 0,5 between 0,25 and 99; grams move
 * by 10 between 1 g and 5.000 g.
 */
export const QUANTITY_LIMITS: Record<'serving' | 'grams', QuantityLimits> = {
  serving: { min: 0.25, max: 99, step: 0.5, decimals: 2 },
  grams: { min: 1, max: 5000, step: 10, decimals: 0 },
};

/** Keeps a step from landing on 1,4999999999999998. */
const GRID_EPSILON = 1e-6;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Grams are stored with two decimals; a serving of 12,5 g never drifts. */
export function roundGrams(value: number): number {
  return roundTo(value, 2);
}

export function clampQuantity(value: number, limits: QuantityLimits): number {
  if (!Number.isFinite(value)) return limits.min;
  return roundTo(
    Math.min(Math.max(value, limits.min), limits.max),
    limits.decimals,
  );
}

/**
 * One press of "−" / "+". The next value is the neighbouring point of the
 * step grid, so a quantity that arrived from a unit conversion (0,31 colher)
 * is tidied by the first press instead of carrying its decimals forever.
 */
export function stepQuantity(
  value: number,
  direction: 1 | -1,
  limits: QuantityLimits,
): number {
  const { step } = limits;
  const next =
    direction > 0
      ? Math.ceil((value + GRID_EPSILON) / step) * step
      : Math.floor((value - GRID_EPSILON) / step) * step;
  return clampQuantity(next, limits);
}

/** A unit the portion sheet can be expressed in: a measure, or plain grams. */
export type PortionUnit =
  | { kind: 'serving'; serving: Serving }
  | { kind: 'grams' };

/** Stable key for lists and for remembering the selected chip. */
export function unitKey(unit: PortionUnit): string {
  return unit.kind === 'grams' ? 'grams' : unit.serving.id;
}

export function unitLimits(unit: PortionUnit): QuantityLimits {
  return unit.kind === 'grams'
    ? QUANTITY_LIMITS.grams
    : QUANTITY_LIMITS.serving;
}

/**
 * The chips of the sheet: "g" (or "ml") **first**, then the food's household
 * measures in seed order (spec 09, replacing spec 03's order). Weighing is the
 * common case, so it holds the head of the line and never scrolls away.
 */
export function portionUnits(food: NormalizedFood): PortionUnit[] {
  const measures: PortionUnit[] = food.servings
    .filter(serving => serving.kind !== 'reference')
    .map(serving => ({ kind: 'serving', serving }));
  if (measures.length === 0) {
    const reference =
      food.servings.find(serving => serving.kind === 'reference') ??
      REFERENCE_SERVING;
    measures.push({ kind: 'serving', serving: reference });
  }
  return [{ kind: 'grams' }, ...measures];
}

/** Grams of `quantity` in `unit`. In grams the quantity *is* the grams. */
export function gramsFor(quantity: number, unit: PortionUnit): number {
  if (unit.kind === 'grams') return roundGrams(quantity);
  return roundGrams(unit.serving.grams * quantity);
}

/**
 * How many `unit` make `grams` — what the number shows after a chip change.
 * Grams are the state, so the kcal never moves when the unit does.
 */
export function quantityForGrams(grams: number, unit: PortionUnit): number {
  const limits = unitLimits(unit);
  if (unit.kind === 'grams') return clampQuantity(grams, limits);
  if (unit.serving.grams <= 0) return limits.min;
  return clampQuantity(grams / unit.serving.grams, limits);
}

/**
 * The quantity a chip change lands on, and it depends on the direction.
 *
 * Towards a household measure the number is the intention: whoever taps
 * "unidade" means one of them, not the 1,33 units that happen to weigh the
 * 100 g the sheet opened with. Towards grams the exact mass is precisely what
 * is wanted, so it is carried over untouched — the food is never re-scaled in
 * that direction.
 */
export function quantityForUnitChange(
  from: PortionUnit,
  to: PortionUnit,
  quantity: number,
): number {
  if (to.kind === 'grams')
    return quantityForGrams(gramsFor(quantity, from), to);
  return clampQuantity(1, unitLimits(to));
}

/**
 * What a confirmation writes. Grams-mode is expressed as `quantity / 100` of
 * the reference serving, which is exactly how the diary already stores a
 * portion with no household label.
 */
export function writableServing(
  unit: PortionUnit,
  quantity: number,
): { serving: Serving; servingCount: number } {
  if (unit.kind === 'serving') {
    return { serving: unit.serving, servingCount: quantity };
  }
  return {
    serving: REFERENCE_SERVING,
    servingCount: quantity / REFERENCE_SERVING.grams,
  };
}

/** Live nutrients for the sheet: same maths the diary will store. */
export function snapshotForGrams(
  food: NormalizedFood,
  grams: number,
): PortionSnapshot {
  const rounded = roundGrams(grams);
  return { grams: rounded, ...scaleNutrients(food.per100g, rounded) };
}

/** What `food_usage` remembers about the last portion of a food. */
export interface UsageMemory {
  lastGrams?: number;
  lastServingLabel?: string;
  lastServingCount?: number;
}

/** The two numbers the sheet keeps: which chip, and how many of it. */
export interface PortionSelection {
  unit: PortionUnit;
  quantity: number;
}

function findUnit(
  units: readonly PortionUnit[],
  label: string,
  locale: Locale,
): PortionUnit | undefined {
  return units.find(
    candidate =>
      candidate.kind === 'serving' &&
      servingLabel(candidate.serving, locale) === label,
  );
}

/** The "g" / "ml" chip, found by kind — its place in the line is not a promise. */
function gramsUnit(units: readonly PortionUnit[]): PortionUnit {
  return (
    units.find(candidate => candidate.kind === 'grams') ?? { kind: 'grams' }
  );
}

/**
 * Which chip opens selected and with how much: the measure last used for this
 * food, its grams when the last entry was typed in grams, or — the first time
 * this food is opened — 100 g on the "g" chip (spec 09).
 */
export function initialPortion(
  food: NormalizedFood,
  usage: UsageMemory | null,
  locale: Locale = 'pt-BR',
): PortionSelection {
  const units = portionUnits(food);
  const fallback: PortionSelection = {
    unit: gramsUnit(units),
    quantity: clampQuantity(REFERENCE_SERVING.grams, QUANTITY_LIMITS.grams),
  };

  if (!usage) return fallback;

  if (usage.lastServingLabel !== undefined) {
    const match = findUnit(units, usage.lastServingLabel, locale);
    if (match) {
      const quantity =
        usage.lastServingCount ??
        (usage.lastGrams === undefined
          ? 1
          : quantityForGrams(usage.lastGrams, match));
      return {
        unit: match,
        quantity: clampQuantity(quantity, unitLimits(match)),
      };
    }
  }

  if (usage.lastGrams !== undefined && usage.lastGrams > 0) {
    const unit = gramsUnit(units);
    return { unit, quantity: clampQuantity(usage.lastGrams, unitLimits(unit)) };
  }

  return fallback;
}

/**
 * The portion a one-tap "+" writes for a food the user has logged before: the
 * measure and count `initialPortion` would open the sheet on, so the row, the
 * chip and the sheet all speak of the same portion. No memory means 100 g
 * (spec 09).
 */
export function servingFromMemory(
  food: NormalizedFood,
  usage: UsageMemory | null,
  locale: Locale = 'pt-BR',
): { serving: Serving; servingCount: number } {
  if (!usage) return { serving: defaultServing(food), servingCount: 1 };
  const selection = initialPortion(food, usage, locale);
  return writableServing(selection.unit, selection.quantity);
}

/** The chip and quantity an existing diary entry was written with. */
export function selectionForEntry(
  food: NormalizedFood,
  entry: { grams: number; servingLabel?: string; servingCount?: number },
  locale: Locale = 'pt-BR',
): PortionSelection {
  const units = portionUnits(food);
  if (entry.servingLabel !== undefined) {
    const match = findUnit(units, entry.servingLabel, locale);
    if (match) {
      const quantity =
        entry.servingCount ?? quantityForGrams(entry.grams, match);
      return {
        unit: match,
        quantity: clampQuantity(quantity, unitLimits(match)),
      };
    }
  }
  const unit = gramsUnit(units);
  return { unit, quantity: clampQuantity(entry.grams, unitLimits(unit)) };
}
