import { MIGRATIONS } from '../src/data/db/schema';
import { rowToFood } from '../src/data/providers/LocalFoodProvider';
import { FOODS_COLUMNS, foodRow } from '../src/data/seed/mapSeedFood';
import type { SeedFood } from '../src/data/seed/seedTypes';
import { isLiquidFood } from '../src/domain/food/liquid';
import { mapOffProduct } from '../src/domain/food/mappers/offMapper';
import {
  REFERENCE_SERVING,
  type NormalizedFood,
  type Serving,
} from '../src/domain/food/NormalizedFood';
import {
  initialPortion,
  portionUnits,
  servingFromMemory,
  unitKey,
} from '../src/domain/food/portion';

const glass: Serving = {
  id: 'ibge:copo-medio',
  label: { pt: 'copo médio', en: 'medium glass' },
  grams: 200,
  kind: 'household',
  isDefault: true,
};

const milk: NormalizedFood = {
  id: 'taco:60',
  source: 'taco',
  sourceId: '60',
  name: { pt: 'Leite, integral' },
  category: { pt: 'Leite e derivados' },
  verified: true,
  per100g: {
    kcal: 61,
    protein_g: 2.9,
    carbs_g: 4.3,
    fat_g: 3.2,
    energySource: 'declared',
  },
  servings: [glass, REFERENCE_SERVING],
  completeness: 1,
  lastFetchedAt: '2026-09-09',
  attribution: { license: 'TACO', text: 'TACO' },
};

describe('isLiquidFood', () => {
  it('takes beverages, juices and liquid milk', () => {
    expect(
      isLiquidFood({ name: 'Leite, integral', category: 'Leite e derivados' }),
    ).toBe(true);
    expect(
      isLiquidFood({
        name: 'Suco de laranja',
        category: 'Bebidas (alcoólicas e não alcoólicas)',
      }),
    ).toBe(true);
    expect(
      isLiquidFood({ name: 'Refrigerante de cola', category: 'Bebidas' }),
    ).toBe(true);
    expect(isLiquidFood({ name: 'Orange juice', category: 'juices' })).toBe(
      true,
    );
  });

  it('leaves what is eaten, even inside a milk category', () => {
    expect(
      isLiquidFood({
        name: 'Queijo, minas, frescal',
        category: 'Leite e derivados',
      }),
    ).toBe(false);
    expect(
      isLiquidFood({
        name: 'Leite, pó, integral',
        category: 'Leite e derivados',
      }),
    ).toBe(false);
    expect(
      isLiquidFood({
        name: 'Leite condensado',
        category: 'Leite e derivados',
      }),
    ).toBe(false);
    expect(
      isLiquidFood({ name: 'Arroz, tipo 1, cozido', category: 'Cereais' }),
    ).toBe(false);
    expect(isLiquidFood({})).toBe(false);
  });
});

describe('the seed import', () => {
  const sources = {
    taco: { name: 'TACO', publisher: 'Unicamp', url: '', license: 'TACO' },
    ibge: { name: 'IBGE', publisher: 'IBGE', url: '', license: 'IBGE' },
  } as const;
  const seed = { sources, generatedAt: '2026-09-09' };
  const food: Omit<SeedFood, 'name' | 'category'> = {
    id: 'taco:1',
    source: 'taco',
    sourceId: '1',
    kcal: 61,
    protein: 2.9,
    carbs: 4.3,
    fat: 3.2,
    measures: [],
    verified: true,
  };

  const isLiquidOf = (name: string, category: string) =>
    foodRow(seed, { ...food, name, category })[
      FOODS_COLUMNS.indexOf('is_liquid')
    ];

  it('writes the flag from the source category and name', () => {
    expect(isLiquidOf('Leite, integral', 'Leite e derivados')).toBe(1);
    expect(isLiquidOf('Suco de maracujá', 'Bebidas')).toBe(1);
    expect(isLiquidOf('Queijo, prato', 'Leite e derivados')).toBe(0);
    expect(isLiquidOf('Arroz, tipo 1, cozido', 'Cereais')).toBe(0);
  });
});

describe('Open Food Facts liquids', () => {
  const base = {
    code: '7891000000000',
    product_name: 'Leite integral',
    nutriments: {
      'energy-kcal_100g': 61,
      proteins_100g: 2.9,
      carbohydrates_100g: 4.3,
      fat_100g: 3.2,
    },
  };

  it('marks a product whose serving is stated in millilitres', () => {
    const food = mapOffProduct(
      { ...base, serving_quantity: 200, serving_quantity_unit: 'ml' },
      { fetchedAt: '2026-09-09T00:00:00.000Z' },
    );
    expect(food?.isLiquid).toBe(true);
  });

  it('leaves a product measured in grams alone', () => {
    const food = mapOffProduct(
      { ...base, serving_quantity: 30, serving_quantity_unit: 'g' },
      { fetchedAt: '2026-09-09T00:00:00.000Z' },
    );
    expect(food?.isLiquid).toBe(false);
  });
});

describe('reading a food row back', () => {
  const row = {
    id: 'off:1',
    source: 'off',
    source_id: '1',
    name_pt: 'Chocolate ao leite',
    name_norm: 'chocolate ao leite',
    category: 'milk chocolates',
    verified: 0,
    kcal_100: 535,
    protein_100: 7.3,
    carbs_100: 59,
    fat_100: 30,
    servings_json: '[]',
    boost: 0,
    completeness: 0.5,
    attribution_json: '{"license":"ODbL-1.0+DbCL","text":"OFF"}',
    fetched_at: '2026-09-09',
    is_liquid: 0,
  };

  it('trusts the stored flag instead of guessing from the name', () => {
    // A milk chocolate whose label states grams: the row says solid, and the
    // sheet must keep saying g.
    expect(rowToFood(row).isLiquid).toBe(false);
    expect(rowToFood({ ...row, is_liquid: 1 }).isLiquid).toBe(true);
  });
});

describe('the migration that adds the flag', () => {
  /** Migration 2 (spec 09); later entries add their own columns after it. */
  const backfill = MIGRATIONS[2].find(statement =>
    statement.startsWith('UPDATE foods'),
  );

  it('back-fills only the bundled rows, and leaves what is eaten alone', () => {
    expect(backfill).toBeDefined();
    expect(backfill).toContain("source IN ('taco', 'ibge')");
    expect(backfill).toContain("NOT LIKE '%queijo%'");
    expect(backfill).toContain("NOT LIKE '% po %'");
  });
});

describe('the portion the sheet opens on', () => {
  it('offers the base unit first and the household measures after it', () => {
    expect(portionUnits(milk).map(unitKey)).toEqual([
      'grams',
      'ibge:copo-medio',
    ]);
  });

  it('opens on 100 with no history', () => {
    const selection = initialPortion(milk, null);
    expect(unitKey(selection.unit)).toBe('grams');
    expect(selection.quantity).toBe(100);
    expect(servingFromMemory(milk, null)).toEqual({
      serving: REFERENCE_SERVING,
      servingCount: 1,
    });
  });

  it('lets the last portion used beat the default', () => {
    const selection = initialPortion(milk, {
      lastGrams: 400,
      lastServingLabel: 'copo médio',
      lastServingCount: 2,
    });
    expect(unitKey(selection.unit)).toBe('ibge:copo-medio');
    expect(selection.quantity).toBe(2);
    expect(servingFromMemory(milk, { lastGrams: 250 })).toEqual({
      serving: REFERENCE_SERVING,
      servingCount: 2.5,
    });
  });
});
