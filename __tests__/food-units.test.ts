import {
  atwaterKcal,
  kjToKcal,
  normalizeBarcode,
  normalizeText,
  num,
  saltToSodiumMg,
  scaleNutrients,
} from '../src/domain/food/units';
import {
  REFERENCE_SERVING,
  validateFood,
  type NormalizedFood,
} from '../src/domain/food/NormalizedFood';

describe('units', () => {
  test('parses the values the tables contain', () => {
    expect(num('2,5')).toBe(2.5);
    expect(num('Tr')).toBe(0);
    expect(num('NA')).toBeUndefined();
    expect(num('*')).toBeUndefined();
    expect(num('')).toBeUndefined();
    expect(num(12)).toBe(12);
  });

  test('converts energy and sodium', () => {
    expect(kjToKcal(418.4)).toBeCloseTo(100, 5);
    expect(saltToSodiumMg(2.5)).toBe(1000);
    expect(atwaterKcal(10, 20, 5)).toBe(165);
  });

  test('normalizes text without diacritics', () => {
    expect(normalizeText('Pão, trigo, francês')).toBe('pao trigo frances');
    expect(normalizeText('  AÇAÍ  ')).toBe('acai');
  });

  test('pads UPC-A to GTIN-13', () => {
    expect(normalizeBarcode('875754001562')).toBe('0875754001562');
    expect(normalizeBarcode('7891000100103')).toBe('7891000100103');
  });

  test('scales nutrients by grams', () => {
    const scaled = scaleNutrients(
      { kcal: 128, protein_g: 2.5, carbs_g: 28, fat_g: 0.2 },
      45,
    );
    expect(scaled.kcal).toBeCloseTo(57.6);
    expect(scaled.protein).toBeCloseTo(1.125);
  });
});

describe('validateFood', () => {
  const food: NormalizedFood = {
    id: 'taco:3',
    source: 'taco',
    sourceId: '3',
    name: { pt: 'Arroz, tipo 1, cozido' },
    verified: true,
    per100g: {
      kcal: 128,
      protein_g: 2.5,
      carbs_g: 28,
      fat_g: 0.2,
      energySource: 'declared',
    },
    servings: [
      {
        id: 'ibge:colher-de-sopa-cheia',
        label: { pt: 'colher de sopa cheia' },
        grams: 25,
        kind: 'household',
        isDefault: true,
      },
      REFERENCE_SERVING,
    ],
    completeness: 1,
    lastFetchedAt: '2026-09-08',
    attribution: { license: 'TACO', text: 'TACO' },
  };

  test('accepts a well-formed food', () => {
    expect(validateFood(food)).toEqual([]);
  });

  test('rejects two defaults and a missing reference', () => {
    const broken = {
      ...food,
      servings: [{ ...food.servings[0] }, { ...food.servings[0], id: 'x' }],
    };
    expect(validateFood(broken)).toEqual(
      expect.arrayContaining([
        'exactly one default serving',
        'last serving must be the 100 g reference',
      ]),
    );
  });
});
