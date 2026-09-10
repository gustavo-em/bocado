import {
  groupBySource,
  isPackagedProduct,
  mergeProductGroups,
} from '../src/domain/food/grouping';
import {
  REFERENCE_SERVING,
  type FoodSource,
  type NormalizedFood,
} from '../src/domain/food/NormalizedFood';

function food(id: string, extra: Partial<NormalizedFood> = {}): NormalizedFood {
  const [source, sourceId] = id.split(':');
  return {
    id,
    source: source as FoodSource,
    sourceId,
    name: { pt: id },
    verified: false,
    per100g: {
      kcal: 100,
      protein_g: 1,
      carbs_g: 10,
      fat_g: 1,
      energySource: 'declared',
    },
    servings: [{ ...REFERENCE_SERVING, isDefault: true }],
    completeness: 1,
    lastFetchedAt: '2026-09-09T00:00:00.000Z',
    attribution: { license: 'TACO', text: '' },
    ...extra,
  };
}

describe('which group a food belongs to', () => {
  it('sends every Open Food Facts row to "Produtos"', () => {
    expect(isPackagedProduct(food('off:789'))).toBe(true);
  });

  it('sends USDA Branded to "Produtos" and the analysed tables to "Base"', () => {
    expect(isPackagedProduct(food('usda:1'))).toBe(true);
    expect(isPackagedProduct(food('usda:2', { verified: true }))).toBe(false);
  });

  it('keeps the Brazilian tables and the user’s own foods in "Base"', () => {
    expect(isPackagedProduct(food('taco:3', { verified: true }))).toBe(false);
    expect(isPackagedProduct(food('ibge:8501303', { verified: true }))).toBe(
      false,
    );
    expect(isPackagedProduct(food('user:quick-abc'))).toBe(false);
  });
});

describe('grouping the local answer', () => {
  it('splits by origin, not by the road the row took', () => {
    // Exactly the second search of "nutella": the label is now cached, so the
    // local provider returns it — and it still belongs to "Produtos".
    const foods = [
      food('taco:3', { verified: true }),
      food('off:789'),
      food('ibge:1', { verified: true }),
    ];

    const groups = groupBySource(foods);

    expect(groups.base.map(item => item.id)).toEqual(['taco:3', 'ibge:1']);
    expect(groups.products.map(item => item.id)).toEqual(['off:789']);
  });

  it('preserves the ranking order inside each group', () => {
    const foods = [food('off:1'), food('off:2'), food('taco:3')];

    const groups = groupBySource(foods);

    expect(groups.products.map(item => item.id)).toEqual(['off:1', 'off:2']);
  });

  it('gives an empty pair for an empty list', () => {
    expect(groupBySource([])).toEqual({ base: [], products: [] });
  });
});

describe('the "Produtos" group on screen', () => {
  it('leads with the cached labels and appends the fresh ones', () => {
    const cached = [food('off:1')];
    const online = [food('off:2')];

    expect(mergeProductGroups(cached, online).map(item => item.id)).toEqual([
      'off:1',
      'off:2',
    ]);
  });

  it('never lists the same product twice', () => {
    const cached = [food('off:1')];
    const online = [food('off:1'), food('off:2')];

    expect(mergeProductGroups(cached, online).map(item => item.id)).toEqual([
      'off:1',
      'off:2',
    ]);
  });
});
