import type { MineralKey } from '../../domain/nutrition/micronutrients';

/**
 * The five mineral columns of `foods`, in the same order as `MINERAL_ORDER`
 * and as `SeedFood.micro`. All nullable: NULL is "the source never measured
 * it", which must stay apart from a measured zero.
 */
export const MICRO_COLUMNS = [
  'iron_mg_100',
  'calcium_mg_100',
  'magnesium_mg_100',
  'potassium_mg_100',
  'zinc_mg_100',
] as const satisfies readonly `${MineralKey}_mg_100`[];

/**
 * SQLite schema, versioned. Add a new entry to MIGRATIONS for every change;
 * never edit an entry that has shipped.
 */
export const MIGRATIONS: readonly string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS foods (
      id            TEXT PRIMARY KEY,
      source        TEXT NOT NULL,
      source_id     TEXT NOT NULL,
      name_pt       TEXT NOT NULL,
      name_en       TEXT,
      name_norm     TEXT NOT NULL,
      aliases_norm  TEXT,
      brand         TEXT,
      category      TEXT,
      barcode       TEXT,
      verified      INTEGER NOT NULL DEFAULT 0,
      kcal_100      REAL NOT NULL,
      protein_100   REAL NOT NULL,
      carbs_100     REAL NOT NULL,
      fat_100       REAL NOT NULL,
      fiber_100     REAL,
      sugar_100     REAL,
      sodium_mg_100 REAL,
      servings_json TEXT NOT NULL,
      boost         INTEGER NOT NULL DEFAULT 0,
      completeness  REAL NOT NULL DEFAULT 1,
      attribution_json TEXT NOT NULL,
      fetched_at    TEXT NOT NULL,
      UNIQUE(source, source_id)
    )`,
    `CREATE INDEX IF NOT EXISTS foods_barcode ON foods(barcode)`,
    `CREATE VIRTUAL TABLE IF NOT EXISTS foods_fts USING fts5(
      id UNINDEXED,
      name_norm,
      aliases_norm,
      brand_norm,
      tokenize = 'unicode61 remove_diacritics 2'
    )`,
    `CREATE TABLE IF NOT EXISTS diary_entries (
      id            TEXT PRIMARY KEY,
      day           TEXT NOT NULL,
      meal          TEXT NOT NULL,
      food_id       TEXT NOT NULL REFERENCES foods(id),
      grams         REAL NOT NULL,
      serving_label TEXT,
      serving_count REAL,
      kcal          REAL NOT NULL,
      protein       REAL NOT NULL,
      carbs         REAL NOT NULL,
      fat           REAL NOT NULL,
      position      INTEGER NOT NULL,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS diary_day_meal ON diary_entries(day, meal, position)`,
    `CREATE TABLE IF NOT EXISTS food_usage (
      food_id            TEXT PRIMARY KEY REFERENCES foods(id),
      use_count          INTEGER NOT NULL DEFAULT 0,
      last_used_at       TEXT NOT NULL,
      last_grams         REAL,
      last_serving_label TEXT,
      last_serving_count REAL,
      by_meal_json       TEXT NOT NULL DEFAULT '{}',
      favorite           INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ],
  [
    /*
      What an online provider answered for one query, so the same word typed
      twice in a day does not cost a second request. Only ids: the foods
      themselves live in `foods` with their own `fetched_at`.
    */
    `CREATE TABLE IF NOT EXISTS food_search_cache (
      source     TEXT NOT NULL,
      locale     TEXT NOT NULL,
      query      TEXT NOT NULL,
      ids_json   TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (source, locale, query)
    )`,
    `CREATE INDEX IF NOT EXISTS foods_source_fetched ON foods(source, fetched_at)`,
  ],
  [
    /*
      Whether the food is drunk rather than eaten (spec 09). The portion sheet
      labels it in millilitres; the grams stored everywhere else do not change,
      because 1 ml = 1 g here (see src/domain/food/liquid.ts).
    */
    `ALTER TABLE foods ADD COLUMN is_liquid INTEGER NOT NULL DEFAULT 0`,
    /*
      Back-fill for bundled rows imported before the column existed: the seed
      is only re-imported when its version changes, so without this every food
      already on the device would read as solid. It mirrors
      `isLiquidFood` (src/domain/food/liquid.ts) over `name_norm`, which is
      already lower-case and free of accents. Rows written from here on carry
      what that predicate decided at import time, and an Open Food Facts row
      keeps the `serving_quantity_unit` of its label — hence `source`.
    */
    `UPDATE foods SET is_liquid = 1
      WHERE source IN ('taco', 'ibge')
        AND (
          lower(COALESCE(category, '')) LIKE '%bebida%'
          OR lower(COALESCE(category, '')) LIKE '%suco%'
          OR name_norm LIKE 'leite%'
          OR name_norm LIKE 'suco%'
          OR name_norm LIKE 'agua%'
          OR name_norm LIKE 'cha %'
          OR name_norm LIKE 'refrigerante%'
        )
        AND ' ' || name_norm || ' ' NOT LIKE '% po %'
        AND name_norm NOT LIKE '%queijo%'
        AND name_norm NOT LIKE '%requeij%'
        AND name_norm NOT LIKE '%iogurte%'
        AND name_norm NOT LIKE '%manteiga%'
        AND name_norm NOT LIKE '%creme%'
        AND name_norm NOT LIKE '%condensad%'
        AND name_norm NOT LIKE '%desidratad%'`,
  ],
  [
    /*
      Iron, calcium, magnesium, potassium and zinc, in mg per 100 g (task 20).
      Nullable and without DEFAULT on purpose: a row imported before the seed
      carried them, an Open Food Facts label (the RDC 429/2020 only requires
      energy, carbohydrate, sugars, protein, fat, fibre and sodium) and a
      "Registrar só as calorias" entry all read as "not measured", and the
      day's total must leave them out instead of adding a zero. The seed
      version bump re-imports the bundled rows with the values.
    */
    ...MICRO_COLUMNS.map(
      column => `ALTER TABLE foods ADD COLUMN ${column} REAL`,
    ),
  ],
];

export const SCHEMA_VERSION = MIGRATIONS.length;
