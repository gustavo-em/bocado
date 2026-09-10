import {
  dedupeAgainstLocal,
  dedupeKey,
  mergeFoods,
  mergeServings,
  preferredFood,
} from '../src/domain/food/dedupe';
import {
  REFERENCE_SERVING,
  type NormalizedFood,
  type Serving,
} from '../src/domain/food/NormalizedFood';

function serving(id: string, grams: number, isDefault = false): Serving {
  return {
    id,
    label: { pt: id },
    grams,
    kind: 'household',
    isDefault,
  };
}

function food(
  partial: Partial<NormalizedFood> & { id: string },
): NormalizedFood {
  const [source, sourceId] = partial.id.split(':');
  return {
    source: source as NormalizedFood['source'],
    sourceId,
    name: { pt: 'Arroz' },
    verified: false,
    per100g: {
      kcal: 128,
      protein_g: 2.5,
      carbs_g: 28,
      fat_g: 0.2,
      energySource: 'declared',
    },
    servings: [{ ...REFERENCE_SERVING, isDefault: true }],
    completeness: 1,
    lastFetchedAt: '2026-09-09T00:00:00.000Z',
    attribution: { license: 'TACO', text: '' },
    ...partial,
  };
}

describe('dedupe key', () => {
  it('uses the barcode when the food has one', () => {
    expect(dedupeKey(food({ id: 'off:789', barcode: '789' }))).toBe(
      'barcode:789',
    );
  });

  it('falls back to the normalized name and brand', () => {
    const a = food({
      id: 'off:1',
      name: { pt: 'Leite Condensado MOÇA' },
      brand: 'Nestlé',
    });
    const b = food({
      id: 'usda:2',
      name: { pt: 'leite  condensado moca' },
      brand: 'nestle',
    });

    expect(dedupeKey(a)).toBe(dedupeKey(b));
  });

  it('keeps different brands of the same name apart', () => {
    const a = food({ id: 'off:1', name: { pt: 'Wafer' }, brand: 'Bauducco' });
    const b = food({ id: 'off:2', name: { pt: 'Wafer' }, brand: 'Nestlé' });

    expect(dedupeKey(a)).not.toBe(dedupeKey(b));
  });
});

describe('choosing the winner', () => {
  it('prefers the verified record', () => {
    const table = food({ id: 'taco:3', verified: true });
    const label = food({ id: 'off:789', completeness: 1 });

    expect(preferredFood(label, table)).toBe(table);
  });

  it('prefers the heavier source when both are unverified', () => {
    // user 35 > taco 30 > ibge 25 > usda 20 > off 10
    const label = food({ id: 'off:789' });
    const usda = food({ id: 'usda:1' });

    expect(preferredFood(label, usda)).toBe(usda);
  });

  it('breaks a tie on completeness', () => {
    const poor = food({ id: 'off:1', completeness: 0.2 });
    const rich = food({ id: 'off:2', completeness: 0.9 });

    expect(preferredFood(poor, rich)).toBe(rich);
  });
});

describe('merging servings', () => {
  it('adds a measure the winner does not know', () => {
    const merged = mergeServings(
      [serving('a', 25, true), REFERENCE_SERVING],
      [serving('b', 45), REFERENCE_SERVING],
    );

    expect(merged.map(item => item.grams)).toEqual([25, 45, 100]);
    expect(merged.filter(item => item.isDefault)).toHaveLength(1);
    expect(merged[merged.length - 1].kind).toBe('reference');
  });

  it('does not repeat a weight the winner already has', () => {
    const merged = mergeServings(
      [serving('a', 25, true), REFERENCE_SERVING],
      [serving('b', 25), REFERENCE_SERVING],
    );

    expect(merged).toHaveLength(2);
  });

  it('keeps the product link of the loser', () => {
    const table = food({ id: 'taco:3', verified: true });
    const label = food({
      id: 'off:789',
      barcode: '789',
      attribution: { license: 'ODbL-1.0+DbCL', text: 'off', url: 'https://x' },
    });

    expect(mergeFoods(table, label).attribution.url).toBe('https://x');
  });
});

describe('dedupe against the local table', () => {
  it('keeps an online product that is not on screen', () => {
    const local = [food({ id: 'taco:3', verified: true })];
    const online = [
      food({ id: 'off:789', barcode: '789', name: { pt: 'Nutella' } }),
    ];

    const { base, products } = dedupeAgainstLocal(local, online);

    expect(base).toHaveLength(1);
    expect(products.map(item => item.id)).toEqual(['off:789']);
  });

  it('folds a duplicate into the local row instead of listing it twice', () => {
    const local = [
      food({
        id: 'taco:3',
        verified: true,
        barcode: '789',
        servings: [serving('a', 25, true), REFERENCE_SERVING],
      }),
    ];
    const online = [
      food({
        id: 'off:789',
        barcode: '789',
        servings: [serving('off:serving', 20, true), REFERENCE_SERVING],
      }),
    ];

    const { base, products } = dedupeAgainstLocal(local, online);

    expect(products).toEqual([]);
    // The row on screen keeps its id and gains the label's 20 g measure.
    expect(base[0].id).toBe('taco:3');
    expect(base[0].servings.map(item => item.grams)).toEqual([25, 20, 100]);
  });

  it('merges two online records of the same product', () => {
    const online = [
      food({ id: 'off:789', barcode: '789', completeness: 0.2 }),
      food({
        id: 'usda:1',
        barcode: '789',
        servings: [serving('cup', 185, true), REFERENCE_SERVING],
      }),
    ];

    const { products } = dedupeAgainstLocal([], online);

    expect(products).toHaveLength(1);
    // usda (20) outweighs off (10).
    expect(products[0].id).toBe('usda:1');
  });

  it('keeps the order the providers answered in', () => {
    const online = [
      food({ id: 'off:1', barcode: '1' }),
      food({ id: 'off:2', barcode: '2' }),
      food({ id: 'off:3', barcode: '3' }),
    ];

    expect(
      dedupeAgainstLocal([], online).products.map(item => item.id),
    ).toEqual(['off:1', 'off:2', 'off:3']);
  });
});
