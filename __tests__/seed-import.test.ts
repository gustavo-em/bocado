import type { Scalar, SQLBatchTuple } from '@op-engineering/op-sqlite';

import {
  FOODS_COLUMNS,
  FOODS_UPSERT,
  FTS_DELETE,
  FTS_INSERT,
  foodRow,
  seedServings,
} from '../src/data/seed/mapSeedFood';
import {
  importSeed,
  importSeedIfNeeded,
  resetSeedImportForTests,
} from '../src/data/seed/importSeed';
import type { SeedFile, SeedFood } from '../src/data/seed/seedTypes';
import { prefs } from '../src/data/prefs/prefs';
import { resetDatabaseForTests } from '../src/data/db/database';

const seed = require('../assets/data/foods.seed.json') as SeedFile;

function recorder() {
  const batches: SQLBatchTuple[][] = [];
  return {
    batches,
    executeBatch: jest.fn(async (commands: SQLBatchTuple[]) => {
      batches.push(commands);
      return { rowsAffected: 0 };
    }),
  };
}

function paramsOf(commands: SQLBatchTuple[], sql: string): Scalar[][] {
  const command = commands.find(([statement]) => statement === sql);
  if (!command || command.length < 2) throw new Error(`Missing ${sql}`);
  return command[1] as Scalar[][];
}

describe('importSeed', () => {
  test('writes more than 2000 foods and one FTS row per food in a single batch', async () => {
    const db = recorder();
    const result = await importSeed(seed, db);

    expect(db.executeBatch).toHaveBeenCalledTimes(1);
    const commands = db.batches[0];
    const foods = paramsOf(commands, FOODS_UPSERT);
    const ftsDeletes = paramsOf(commands, FTS_DELETE);
    const ftsInserts = paramsOf(commands, FTS_INSERT);

    expect(result.foods).toBeGreaterThan(2000);
    expect(foods).toHaveLength(result.foods);
    expect(ftsDeletes).toHaveLength(result.foods);
    expect(ftsInserts).toHaveLength(result.foods);
    expect(result.version).toBe(seed.version);
    for (const row of foods) expect(row).toHaveLength(FOODS_COLUMNS.length);
    const ids = new Set(foods.map(row => row[0]));
    expect(ids.size).toBe(result.foods);
  });

  test('normalizes names without diacritics for the search index', async () => {
    const db = recorder();
    await importSeed(seed, db);
    const ftsInserts = paramsOf(db.batches[0], FTS_INSERT);
    const nameNormIndex = 1;
    for (const row of ftsInserts) {
      const nameNorm = String(row[nameNormIndex]);
      expect(nameNorm).toBe(nameNorm.toLowerCase());
      expect(nameNorm).toMatch(/^[a-z0-9 ]*$/);
      expect(nameNorm.length).toBeGreaterThan(0);
    }
  });

  test('carries the English name into `name_en` and into the search index', async () => {
    const db = recorder();
    await importSeed(seed, db);
    const foods = paramsOf(db.batches[0], FOODS_UPSERT);
    const ftsInserts = paramsOf(db.batches[0], FTS_INSERT);
    const nameEn = FOODS_COLUMNS.indexOf('name_en');
    const aliasIndex = 2;

    const translated = foods.filter(row => row[nameEn] !== null);
    expect(translated.length / foods.length).toBeGreaterThan(0.9);
    for (const row of translated) {
      expect(typeof row[nameEn]).toBe('string');
      expect(String(row[nameEn]).length).toBeGreaterThan(0);
    }

    const rice = foods.find(row => row[0] === 'taco:3');
    expect(rice?.[nameEn]).toBe('Rice, type 1, cooked');
    const riceFts = ftsInserts.find(row => row[0] === 'taco:3');
    expect(String(riceFts?.[aliasIndex])).toContain('rice');
  });

  test('a food the glossary does not cover keeps `name_en` NULL', async () => {
    const db = recorder();
    await importSeed(
      { ...seed, foods: [{ ...seed.foods[0], nameEn: undefined }] },
      db,
    );
    const foods = paramsOf(db.batches[0], FOODS_UPSERT);
    expect(foods[0][FOODS_COLUMNS.indexOf('name_en')]).toBeNull();
    const ftsInserts = paramsOf(db.batches[0], FTS_INSERT);
    expect(String(ftsInserts[0][2])).not.toContain('rice');
  });

  test('every food row has finite energy and macros', async () => {
    const db = recorder();
    await importSeed(seed, db);
    const foods = paramsOf(db.batches[0], FOODS_UPSERT);
    const kcal = FOODS_COLUMNS.indexOf('kcal_100');
    const fat = FOODS_COLUMNS.indexOf('fat_100');
    for (const row of foods) {
      for (let column = kcal; column <= fat; column += 1) {
        expect(typeof row[column]).toBe('number');
        expect(Number.isFinite(row[column])).toBe(true);
      }
    }
  });
});

describe('foodRow', () => {
  const food: SeedFood = {
    id: 'taco:999',
    source: 'taco',
    sourceId: '999',
    name: 'Pão, francês',
    category: 'Cereais e derivados',
    kcal: 300,
    protein: 8,
    carbs: 58.6,
    fat: 3.1,
    fiber: 2.3,
    sodiumMg: 648,
    aliases: ['Pãozinho', 'Cacetinho'],
    measures: [
      { label: 'unidade', grams: 50 },
      { label: 'fatia', grams: 25 },
    ],
    micro: [1.4, 22, 26, 133, 0.9],
    boost: 3,
    verified: true,
  };

  test('maps names, aliases, servings and attribution', () => {
    const row = foodRow(seed, food);
    const column = (name: (typeof FOODS_COLUMNS)[number]) =>
      row[FOODS_COLUMNS.indexOf(name)];
    expect(column('name_pt')).toBe('Pão, francês');
    expect(column('name_norm')).toBe('pao frances');
    expect(column('aliases_norm')).toBe('paozinho cacetinho');
    expect(column('verified')).toBe(1);
    expect(column('boost')).toBe(3);
    expect(column('fiber_100')).toBe(2.3);
    expect(column('sugar_100')).toBeNull();
    expect(column('fetched_at')).toBe(seed.generatedAt);

    const servings = JSON.parse(String(column('servings_json')));
    expect(servings).toHaveLength(3);
    expect(servings[0]).toMatchObject({
      label: { pt: 'unidade' },
      grams: 50,
      kind: 'household',
      isDefault: true,
    });
    expect(servings[2]).toMatchObject({
      id: 'ref:100g',
      grams: 100,
      kind: 'reference',
    });

    const attribution = JSON.parse(String(column('attribution_json')));
    expect(attribution.license).toBe('TACO');
    expect(attribution.url).toBe(seed.sources.taco.url);
  });

  test('reads `micro` positionally into the five mineral columns', () => {
    const row = foodRow(seed, food);
    const column = (name: (typeof FOODS_COLUMNS)[number]) =>
      row[FOODS_COLUMNS.indexOf(name)];
    expect(column('iron_mg_100')).toBe(1.4);
    expect(column('calcium_mg_100')).toBe(22);
    expect(column('magnesium_mg_100')).toBe(26);
    expect(column('potassium_mg_100')).toBe(133);
    expect(column('zinc_mg_100')).toBe(0.9);
  });

  test('a missing position stays NULL, and so does a food without `micro`', () => {
    const column = (row: Scalar[], name: (typeof FOODS_COLUMNS)[number]) =>
      row[FOODS_COLUMNS.indexOf(name)];
    const partial = foodRow(seed, {
      ...food,
      micro: [null, 22, null, null, 0],
    });
    expect(column(partial, 'iron_mg_100')).toBeNull();
    expect(column(partial, 'calcium_mg_100')).toBe(22);
    expect(column(partial, 'magnesium_mg_100')).toBeNull();
    // A measured zero is a number, never a NULL.
    expect(column(partial, 'zinc_mg_100')).toBe(0);

    const none = foodRow(seed, { ...food, micro: undefined });
    for (const name of [
      'iron_mg_100',
      'calcium_mg_100',
      'magnesium_mg_100',
      'potassium_mg_100',
      'zinc_mg_100',
    ] as const)
      expect(column(none, name)).toBeNull();
  });

  test('the bundled seed carries minerals for most of its foods', () => {
    const withMicro = seed.foods.filter(item => item.micro !== undefined);
    expect(withMicro.length / seed.foods.length).toBeGreaterThan(0.9);
    for (const item of withMicro) expect(item.micro).toHaveLength(5);
    // No vitamin ships with the bundle: the coverage does not hold up.
    for (const key of Object.keys(seed.foods[0]))
      expect(key.toLowerCase()).not.toContain('vitamin');
  });

  test('household measures take their English label from the seed dictionary', () => {
    const servings = seedServings(food, {
      unidade: 'unit',
    });
    expect(servings[0].label).toEqual({ pt: 'unidade', en: 'unit' });
    // A label the glossary does not cover stays Portuguese, in any language.
    expect(servings[1].label).toEqual({ pt: 'fatia', en: undefined });
  });

  test('the bundled seed labels the everyday measures in English', () => {
    expect(seed.measureLabelsEn?.['colher de sopa cheia']).toBe(
      'heaped tablespoon',
    );
    const row = foodRow(seed, seed.foods[0]);
    const servings = JSON.parse(
      String(row[FOODS_COLUMNS.indexOf('servings_json')]),
    ) as { kind: string; label: { pt: string; en?: string } }[];
    for (const serving of servings)
      if (serving.kind === 'household' && serving.label.en !== undefined)
        expect(serving.label.en).toBe(seed.measureLabelsEn?.[serving.label.pt]);
  });

  test('a food without measures still gets the 100 g reference as default', () => {
    const servings = seedServings({ ...food, measures: [] });
    expect(servings).toHaveLength(1);
    expect(servings[0]).toMatchObject({ id: 'ref:100g', isDefault: true });
  });
});

describe('importSeedIfNeeded', () => {
  beforeEach(() => {
    resetSeedImportForTests();
    resetDatabaseForTests();
    prefs.setSeedVersion(0);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('imports once, records the version and skips afterwards', async () => {
    const first = await importSeedIfNeeded();
    expect(first?.foods).toBeGreaterThan(2000);
    expect(prefs.getSeedVersion()).toBe(seed.version);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[bocado:seed\] imported \d+ foods in \d+ ms/),
    );

    resetSeedImportForTests();
    const second = await importSeedIfNeeded();
    expect(second).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[bocado:seed\] skipped/),
    );
  });
});
