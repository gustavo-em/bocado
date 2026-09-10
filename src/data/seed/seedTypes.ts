import type { Meal } from '../../domain/diary/Meal';

/**
 * Shape of `assets/data/foods.seed.json`, as written by
 * `scripts/build-food-seed.mjs`. Only the bundled sources appear here.
 */
export type SeedSource = 'taco' | 'ibge';

export interface SeedSourceInfo {
  name: string;
  publisher: string;
  url: string;
  license: string;
}

export interface SeedMeasure {
  label: string;
  grams: number;
}

export interface SeedFood {
  id: string;
  source: SeedSource;
  sourceId: string;
  name: string;
  /**
   * English name from `data/glossary/pt-en.json`, written by the build only
   * when every term of the name is known (docs/research/08-nomes-em-ingles.md).
   * Absent means the app shows the whole Portuguese name, never half of each.
   */
  nameEn?: string;
  category?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodiumMg?: number;
  saturatedFat?: number;
  /**
   * Five minerals in mg per 100 g, positional:
   * `[iron, calcium, magnesium, potassium, zinc]`. `null` means the source
   * table never measured it, which is not the same as zero; the key is absent
   * when none of the five was measured.
   */
  micro?: readonly (number | null)[];
  aliases?: string[];
  measures: SeedMeasure[];
  boost?: number;
  verified: boolean;
}

export interface SeedFile {
  version: number;
  /** ISO date of the build; stored as `fetched_at` on every row. */
  generatedAt: string;
  sources: Record<SeedSource, SeedSourceInfo>;
  /** Food ids suggested when a meal is empty (task 04). */
  starters: Record<Meal, string[]>;
  /**
   * English form of each household measure label, by Portuguese label. The
   * same labels repeat across thousands of measures, so they are written once
   * here instead of on every row. A label absent from the map keeps its
   * Portuguese text in every language.
   */
  measureLabelsEn?: Record<string, string>;
  foods: SeedFood[];
}
