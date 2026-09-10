import type { Scalar } from '@op-engineering/op-sqlite';

import {
  REFERENCE_SERVING,
  type Attribution,
  type LicenseId,
  type Serving,
} from '../../domain/food/NormalizedFood';
import { isLiquidFood } from '../../domain/food/liquid';
import { normalizeText } from '../../domain/food/units';
import { MINERAL_ORDER } from '../../domain/nutrition/micronutrients';
import { MICRO_COLUMNS } from '../db/schema';
import type { SeedFile, SeedFood, SeedSource } from './seedTypes';

const LICENSE_BY_SOURCE: Record<SeedSource, LicenseId> = {
  taco: 'TACO',
  ibge: 'IBGE-open-data',
};

/** Column order of `FOODS_UPSERT`; `foodRow` must produce values in this order. */
export const FOODS_COLUMNS = [
  'id',
  'source',
  'source_id',
  'name_pt',
  'name_en',
  'name_norm',
  'aliases_norm',
  'brand',
  'category',
  'barcode',
  'verified',
  'kcal_100',
  'protein_100',
  'carbs_100',
  'fat_100',
  'fiber_100',
  'sugar_100',
  'sodium_mg_100',
  'servings_json',
  'boost',
  'completeness',
  'attribution_json',
  'fetched_at',
  'is_liquid',
  ...MICRO_COLUMNS,
] as const;

const placeholders = FOODS_COLUMNS.map(() => '?').join(', ');
const updates = FOODS_COLUMNS.filter(column => column !== 'id')
  .map(column => `${column} = excluded.${column}`)
  .join(', ');

/**
 * Upsert, not REPLACE: `diary_entries.food_id` references `foods.id`, and
 * REPLACE deletes the old row first, which the foreign key would reject.
 */
export const FOODS_UPSERT = `INSERT INTO foods (${FOODS_COLUMNS.join(
  ', ',
)}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;

export const FTS_DELETE = 'DELETE FROM foods_fts WHERE id = ?';
export const FTS_INSERT =
  'INSERT INTO foods_fts (id, name_norm, aliases_norm, brand_norm) VALUES (?, ?, ?, ?)';

export function seedServings(
  food: SeedFood,
  labelsEn: Record<string, string> = {},
): Serving[] {
  const household = food.measures.map<Serving>((measure, index) => ({
    id: `${food.source}:${normalizeText(measure.label).replace(/ /g, '-')}`,
    // No English form means the label stays Portuguese, in any language.
    label: { pt: measure.label, en: labelsEn[measure.label] },
    grams: measure.grams,
    kind: 'household',
    isDefault: index === 0,
  }));
  return [
    ...household,
    { ...REFERENCE_SERVING, isDefault: household.length === 0 },
  ];
}

export function seedAttribution(
  seed: Pick<SeedFile, 'sources'>,
  source: SeedSource,
): Attribution {
  const info = seed.sources[source];
  return {
    license: LICENSE_BY_SOURCE[source],
    text: `${info.name} — ${info.publisher}`,
    url: info.url,
  };
}

/** One seed food → the parameter list of `FOODS_UPSERT`. */
export function foodRow(
  seed: Pick<SeedFile, 'sources' | 'generatedAt' | 'measureLabelsEn'>,
  food: SeedFood,
): Scalar[] {
  const aliasesNorm = food.aliases?.length
    ? food.aliases.map(normalizeText).join(' ')
    : null;
  return [
    food.id,
    food.source,
    food.sourceId,
    food.name,
    food.nameEn ?? null,
    normalizeText(food.name),
    aliasesNorm,
    null,
    food.category ?? null,
    null,
    food.verified ? 1 : 0,
    food.kcal,
    food.protein,
    food.carbs,
    food.fat,
    food.fiber ?? null,
    null,
    food.sodiumMg ?? null,
    JSON.stringify(seedServings(food, seed.measureLabelsEn)),
    food.boost ?? 0,
    1,
    JSON.stringify(seedAttribution(seed, food.source)),
    seed.generatedAt,
    // The bundle has no such flag, so it is decided here, on import, from the
    // source category and name (spec 09).
    isLiquidFood({ name: food.name, category: food.category }) ? 1 : 0,
    ...seedMinerals(food),
  ];
}

/**
 * `SeedFood.micro` is positional; a missing position stays NULL so the day's
 * total can tell "not measured" from a measured zero.
 */
function seedMinerals(food: SeedFood): Scalar[] {
  return MINERAL_ORDER.map((_key, index) => {
    const value = food.micro?.[index];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
}

/**
 * One seed food → the parameter list of `FTS_INSERT`.
 *
 * The English name rides in the alias column: it is search text, not a display
 * alias, so `foods.aliases_norm` (what the UI and the ranking read) keeps only
 * the Portuguese aliases. This is what makes "rice" find the TACO rice with
 * the app in English, without touching the index definition.
 */
export function ftsRow(food: SeedFood): Scalar[] {
  const aliases = food.aliases?.length
    ? food.aliases.map(normalizeText)
    : [];
  if (food.nameEn) aliases.push(normalizeText(food.nameEn));
  return [food.id, normalizeText(food.name), aliases.join(' '), ''];
}
