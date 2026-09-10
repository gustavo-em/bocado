import { entryServingLabel } from '../src/domain/diary/entryName';
import {
  REFERENCE_SERVING,
  type NormalizedFood,
  type Serving,
} from '../src/domain/food/NormalizedFood';
import {
  QUANTITY_LIMITS,
  clampQuantity,
  gramsFor,
  initialPortion,
  portionSnapshot,
  portionUnits,
  quantityForGrams,
  quantityForUnitChange,
  selectionForEntry,
  snapshotForGrams,
  stepQuantity,
  unitKey,
  unitLimits,
  writableServing,
  type PortionUnit,
} from '../src/domain/food/portion';

const spoon: Serving = {
  id: 'ibge:colher-de-sopa-cheia',
  label: { pt: 'colher de sopa cheia', en: 'heaped tablespoon' },
  grams: 25,
  kind: 'household',
  isDefault: true,
};

const ladle: Serving = {
  id: 'ibge:concha-media-cheia',
  label: { pt: 'concha média cheia', en: 'heaped medium ladle' },
  grams: 80,
  kind: 'household',
  isDefault: false,
};

/** "Arroz, tipo 1, cozido" as the bundled base carries it. */
const rice: NormalizedFood = {
  id: 'taco:3',
  source: 'taco',
  sourceId: '3',
  name: { pt: 'Arroz, tipo 1, cozido' },
  verified: true,
  per100g: {
    kcal: 128,
    protein_g: 2.5,
    carbs_g: 28.1,
    fat_g: 0.2,
    energySource: 'declared',
  },
  servings: [spoon, ladle, REFERENCE_SERVING],
  completeness: 1,
  lastFetchedAt: '2026-01-01',
  attribution: { license: 'TACO', text: 'TACO' },
};

/** A food with no household measure: only the reference and "g". */
const oil: NormalizedFood = {
  ...rice,
  id: 'taco:99',
  sourceId: '99',
  name: { pt: 'Óleo, soja' },
  per100g: {
    kcal: 884,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 100,
    energySource: 'declared',
  },
  servings: [{ ...REFERENCE_SERVING, isDefault: true }],
};

const spoonUnit: PortionUnit = { kind: 'serving', serving: spoon };
const ladleUnit: PortionUnit = { kind: 'serving', serving: ladle };
const gramsUnit: PortionUnit = { kind: 'grams' };

describe('portion units', () => {
  it('puts "g" first and the household measures after it, in seed order', () => {
    const units = portionUnits(rice);
    expect(units.map(unitKey)).toEqual([
      'grams',
      'ibge:colher-de-sopa-cheia',
      'ibge:concha-media-cheia',
    ]);
  });

  it('offers "g" and the 100 g reference when the food has no measure', () => {
    const units = portionUnits(oil);
    expect(units.map(unitKey)).toEqual(['grams', 'ref:100g']);
  });

  it('uses the serving limits for a measure and the gram limits for "g"', () => {
    expect(unitLimits(spoonUnit)).toBe(QUANTITY_LIMITS.serving);
    expect(unitLimits(gramsUnit)).toBe(QUANTITY_LIMITS.grams);
  });
});

describe('portion maths', () => {
  it('scales kcal and macros from the per 100 g values', () => {
    const snapshot = snapshotForGrams(rice, 25);
    expect(snapshot.grams).toBe(25);
    expect(snapshot.kcal).toBeCloseTo(32, 5);
    expect(snapshot.protein).toBeCloseTo(0.625, 5);
    expect(snapshot.carbs).toBeCloseTo(7.025, 5);
    expect(snapshot.fat).toBeCloseTo(0.05, 5);
  });

  it('turns a quantity of a measure into grams', () => {
    expect(gramsFor(1, spoonUnit)).toBe(25);
    expect(gramsFor(1.5, spoonUnit)).toBe(37.5);
    expect(gramsFor(0.25, ladleUnit)).toBe(20);
    expect(gramsFor(140, gramsUnit)).toBe(140);
  });

  it('keeps the kcal when the measure changes to grams', () => {
    const grams = gramsFor(1, spoonUnit);
    const converted = quantityForGrams(grams, gramsUnit);
    expect(converted).toBe(25);
    expect(snapshotForGrams(rice, gramsFor(converted, gramsUnit)).kcal).toBe(
      snapshotForGrams(rice, grams).kcal,
    );
  });

  it('converts between two measures through the grams', () => {
    const grams = gramsFor(2, ladleUnit);
    expect(quantityForGrams(grams, spoonUnit)).toBe(6.4);
    expect(gramsFor(6.4, spoonUnit)).toBe(160);
  });

  it('rounds a conversion to two decimals', () => {
    expect(quantityForGrams(25, ladleUnit)).toBe(0.31);
  });
});

describe('stepQuantity', () => {
  it('moves by 0,5 on a measure', () => {
    expect(stepQuantity(1, 1, QUANTITY_LIMITS.serving)).toBe(1.5);
    expect(stepQuantity(1.5, -1, QUANTITY_LIMITS.serving)).toBe(1);
  });

  it('tidies a converted quantity onto the step grid', () => {
    expect(stepQuantity(0.31, 1, QUANTITY_LIMITS.serving)).toBe(0.5);
    expect(stepQuantity(6.4, 1, QUANTITY_LIMITS.serving)).toBe(6.5);
    expect(stepQuantity(6.4, -1, QUANTITY_LIMITS.serving)).toBe(6);
  });

  it('moves by 10 in grams', () => {
    expect(stepQuantity(25, 1, QUANTITY_LIMITS.grams)).toBe(30);
    expect(stepQuantity(25, -1, QUANTITY_LIMITS.grams)).toBe(20);
    expect(stepQuantity(100, 1, QUANTITY_LIMITS.grams)).toBe(110);
  });

  it('never leaves the limits', () => {
    expect(stepQuantity(0.25, -1, QUANTITY_LIMITS.serving)).toBe(0.25);
    expect(stepQuantity(99, 1, QUANTITY_LIMITS.serving)).toBe(99);
    expect(stepQuantity(1, -1, QUANTITY_LIMITS.grams)).toBe(1);
    expect(stepQuantity(5000, 1, QUANTITY_LIMITS.grams)).toBe(5000);
  });

  it('clamps a typed quantity into the limits', () => {
    expect(clampQuantity(0, QUANTITY_LIMITS.serving)).toBe(0.25);
    expect(clampQuantity(120, QUANTITY_LIMITS.serving)).toBe(99);
    expect(clampQuantity(9000, QUANTITY_LIMITS.grams)).toBe(5000);
    expect(clampQuantity(Number.NaN, QUANTITY_LIMITS.grams)).toBe(1);
  });
});

describe('what a confirmation writes', () => {
  it('keeps the measure and its count', () => {
    const { serving, servingCount } = writableServing(spoonUnit, 1.5);
    const snapshot = portionSnapshot(rice, serving, servingCount);
    expect(snapshot.grams).toBe(37.5);
    expect(snapshot.servingLabel).toBe('colher de sopa cheia');
    expect(snapshot.servingCount).toBe(1.5);
  });

  it('writes grams through the 100 g reference, with no label', () => {
    const { serving, servingCount } = writableServing(gramsUnit, 140);
    const snapshot = portionSnapshot(rice, serving, servingCount);
    expect(snapshot.grams).toBe(140);
    expect(snapshot.servingLabel).toBeUndefined();
    expect(snapshot.servingCount).toBeUndefined();
    expect(snapshot.kcal).toBeCloseTo(179.2, 5);
  });

  it('writes the English label when the app is in English', () => {
    const { serving, servingCount } = writableServing(spoonUnit, 2);
    expect(
      portionSnapshot(rice, serving, servingCount, 'en-US').servingLabel,
    ).toBe('heaped tablespoon');
  });
});

describe('initialPortion', () => {
  // Spec 09: a food never logged before opens on "g" with 100, whatever
  // household measures it carries.
  it('falls back to 100 g on the "g" chip', () => {
    expect(initialPortion(rice, null)).toEqual({
      unit: gramsUnit,
      quantity: 100,
    });
    expect(initialPortion(oil, null)).toEqual({
      unit: gramsUnit,
      quantity: 100,
    });
  });

  it('reopens on the measure last used, with its count', () => {
    const selection = initialPortion(rice, {
      lastGrams: 160,
      lastServingLabel: 'concha média cheia',
      lastServingCount: 2,
    });
    expect(unitKey(selection.unit)).toBe('ibge:concha-media-cheia');
    expect(selection.quantity).toBe(2);
  });

  it('reopens in grams when the last entry had no measure', () => {
    const selection = initialPortion(rice, { lastGrams: 140 });
    expect(unitKey(selection.unit)).toBe('grams');
    expect(selection.quantity).toBe(140);
  });

  it('ignores a remembered measure the food no longer has', () => {
    const selection = initialPortion(rice, {
      lastGrams: 60,
      lastServingLabel: 'colher de servir cheia',
      lastServingCount: 1,
    });
    expect(unitKey(selection.unit)).toBe('grams');
    expect(selection.quantity).toBe(60);
  });
});

describe('selectionForEntry', () => {
  it('reads the measure back from the stored label', () => {
    const selection = selectionForEntry(rice, {
      grams: 50,
      servingLabel: 'colher de sopa cheia',
      servingCount: 2,
    });
    expect(unitKey(selection.unit)).toBe('ibge:colher-de-sopa-cheia');
    expect(selection.quantity).toBe(2);
  });

  it('falls back to grams for an entry written in grams', () => {
    const selection = selectionForEntry(rice, { grams: 140 });
    expect(unitKey(selection.unit)).toBe('grams');
    expect(selection.quantity).toBe(140);
  });
});

describe('quantityForUnitChange', () => {
  it('assumes one when the tap lands on a household measure', () => {
    // 100 g of rice is four heaped tablespoons; tapping the chip means one of
    // them, not "4 colher de sopa cheia" and never "1,33 unidade".
    expect(quantityForUnitChange(gramsUnit, spoonUnit, 100)).toBe(1);
  });

  it('assumes one between two household measures as well', () => {
    expect(quantityForUnitChange(spoonUnit, ladleUnit, 3)).toBe(1);
  });

  it('keeps the mass when the tap lands back on grams', () => {
    // One heaped tablespoon weighs 25 g, and that is the number "g" shows.
    expect(quantityForUnitChange(spoonUnit, gramsUnit, 1)).toBe(25);
    expect(quantityForUnitChange(ladleUnit, gramsUnit, 2)).toBe(160);
  });
});

describe('entryServingLabel', () => {
  const servings: Serving[] = [
    {
      id: 'taco:colher-de-servir-cheia',
      label: { pt: 'colher de servir cheia', en: 'heaped serving spoon' },
      grams: 45,
      kind: 'household',
      isDefault: true,
    },
    {
      id: 'taco:coio',
      label: { pt: 'coió' },
      grams: 30,
      kind: 'household',
      isDefault: false,
    },
  ];

  test('re-reads the stored label in the language on screen', () => {
    const entry = {
      servingLabel: 'colher de servir cheia',
      foodServings: servings,
    };
    expect(entryServingLabel(entry, 'en-US')).toBe('heaped serving spoon');
    expect(entryServingLabel(entry, 'pt-BR')).toBe('colher de servir cheia');
  });

  test('an entry written in English reads back in Portuguese', () => {
    const entry = {
      servingLabel: 'heaped serving spoon',
      foodServings: servings,
    };
    expect(entryServingLabel(entry, 'pt-BR')).toBe('colher de servir cheia');
  });

  test('a measure the glossary never covered keeps its Portuguese label', () => {
    const entry = { servingLabel: 'coió', foodServings: servings };
    expect(entryServingLabel(entry, 'en-US')).toBe('coió');
  });

  test('without measures, or without a label, nothing is invented', () => {
    expect(
      entryServingLabel({ servingLabel: 'colher de servir cheia' }, 'en-US'),
    ).toBe('colher de servir cheia');
    expect(
      entryServingLabel({ foodServings: servings }, 'en-US'),
    ).toBeUndefined();
  });
});
