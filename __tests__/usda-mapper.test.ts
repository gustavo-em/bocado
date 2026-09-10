import {
  mapUsdaFood,
  mapUsdaSearch,
  usdaEnergy,
  usdaNutrients,
  USDA_ATTRIBUTION_TEXT,
  USDA_NUTRIENT,
} from '../src/domain/food/mappers/usdaMapper';
import { validateFood } from '../src/domain/food/NormalizedFood';

import abridgedRice from './fixtures/usda_food_169756_abridged_numbers.json';
import fullRice from './fixtures/usda_food_169756_full.json';
import brandedSearch from './fixtures/usda_search_branded.json';
import foundationSearch from './fixtures/usda_search_foundation.json';
import riceSearch from './fixtures/usda_search_rice.json';

const FETCHED_AT = '2026-09-09T00:00:00.000Z';
const options = { fetchedAt: FETCHED_AT };

describe('USDA nutrient payload shapes', () => {
  it('reads { nutrientId, value } from a search result', () => {
    const values = usdaNutrients(foundationSearch.foods[0].foodNutrients);

    expect(values.get(USDA_NUTRIENT.energyKj)).toBe(1580);
    expect(values.get(USDA_NUTRIENT.protein)).toBeGreaterThan(0);
  });

  it('reads { nutrient: { id }, amount } from the detail endpoint', () => {
    const values = usdaNutrients(fullRice.foodNutrients);

    expect(values.get(USDA_NUTRIENT.energyKcal)).toBe(365);
    expect(values.get(USDA_NUTRIENT.protein)).toBe(7.13);
    expect(values.get(USDA_NUTRIENT.sodium)).toBe(5);
  });

  it('reads the legacy { number, amount } of the abridged endpoint', () => {
    const values = usdaNutrients(abridgedRice.foodNutrients);

    expect(values.get(USDA_NUTRIENT.energyKcal)).toBe(365);
    expect(values.get(USDA_NUTRIENT.carbs)).toBe(80);
    expect(values.get(USDA_NUTRIENT.sodium)).toBe(5);
  });

  it('ignores entries with no value', () => {
    expect(usdaNutrients([{ nutrient: { id: 2045 } }]).size).toBe(0);
    expect(usdaNutrients('nope').size).toBe(0);
  });
});

describe('USDA food mapping', () => {
  it('maps an SR Legacy detail into the contract shape', () => {
    const food = mapUsdaFood(fullRice, options);

    expect(food).not.toBeNull();
    expect(food?.id).toBe('usda:169756');
    expect(food?.source).toBe('usda');
    expect(food?.name.en).toBe(
      'Rice, white, long-grain, regular, raw, unenriched',
    );
    expect(food?.verified).toBe(true);
    expect(food?.per100g).toMatchObject({
      kcal: 365,
      protein_g: 7.13,
      carbs_g: 79.95,
      fat_g: 0.66,
      fiber_g: 1.3,
      sodium_mg: 5,
      energySource: 'declared',
    });
    expect(validateFood(food!)).toEqual([]);
  });

  it('maps the five mineral ids, already in milligrams', () => {
    const food = mapUsdaFood(fullRice, options);

    expect(food?.per100g).toMatchObject({
      iron_mg: 0.8,
      calcium_mg: 28,
      magnesium_mg: 25,
      potassium_mg: 115,
      zinc_mg: 1.09,
    });
    expect(USDA_NUTRIENT.iron).toBe(1089);
    expect(USDA_NUTRIENT.calcium).toBe(1087);
    expect(USDA_NUTRIENT.magnesium).toBe(1090);
    expect(USDA_NUTRIENT.potassium).toBe(1092);
    expect(USDA_NUTRIENT.zinc).toBe(1095);
  });

  it('leaves a mineral the payload never declared undefined, not zero', () => {
    const food = mapUsdaFood(abridgedRice, options);

    expect(food?.per100g.iron_mg).toBeUndefined();
    expect(food?.per100g.zinc_mg).toBeUndefined();
  });

  it('turns foodPortions into household servings, 100 g last', () => {
    const food = mapUsdaFood(fullRice, options);

    expect(food?.servings[0]).toMatchObject({
      grams: 185,
      kind: 'household',
      isDefault: true,
      label: { en: '1 cup' },
    });
    expect(food?.servings[food.servings.length - 1].kind).toBe('reference');
  });

  it('cites FoodData Central under CC0', () => {
    expect(mapUsdaFood(abridgedRice, options)?.attribution).toEqual({
      license: 'CC0-1.0',
      text: USDA_ATTRIBUTION_TEXT,
      url: 'https://fdc.nal.usda.gov/food-details/169756/nutrients',
    });
  });

  it('marks Branded rows as unverified and pads their UPC-A code', () => {
    const food = mapUsdaFood(brandedSearch.foods[0], options);

    expect(food?.verified).toBe(false);
    expect(food?.brand).toBe('BAUDUCCO');
    // gtinUpc arrives with 12 digits.
    expect(food?.barcode).toBe('0875754003399');
    expect(food?.per100g.kcal).toBe(536);
  });

  it('uses the label serving of a Branded row', () => {
    const food = mapUsdaFood(brandedSearch.foods[0], options);

    expect(food?.servings[0]).toMatchObject({
      id: 'usda:serving',
      grams: 28,
      kind: 'package',
      isDefault: true,
      label: { en: '4 PIECES' },
    });
  });

  it('rejects a payload with no energy and no macros', () => {
    expect(mapUsdaFood({ fdcId: 1, description: 'Nothing' })).toBeNull();
    expect(mapUsdaFood(null)).toBeNull();
  });
});

describe('USDA energy fallbacks', () => {
  it('converts kJ when no kcal nutrient is present', () => {
    const values = usdaNutrients(foundationSearch.foods[0].foodNutrients);
    values.delete(USDA_NUTRIENT.energyKcal);
    values.delete(USDA_NUTRIENT.energyAtwaterGeneral);
    values.delete(USDA_NUTRIENT.energyAtwaterSpecific);

    // 1580 kJ / 4.184
    expect(usdaEnergy(values, 0, 0, 0)).toEqual({
      kcal: expect.closeTo(377.63, 2),
      energySource: 'kj_converted',
    });
  });

  it('falls back to Atwater over the macros', () => {
    const values = new Map([[USDA_NUTRIENT.protein, 7.13]]);

    expect(usdaEnergy(values, 7.13, 80, 0.66)).toEqual({
      kcal: expect.closeTo(354.46, 2),
      energySource: 'atwater',
    });
  });
});

describe('USDA search mapping', () => {
  it('maps every usable row of a search response', () => {
    const foods = mapUsdaSearch(riceSearch, options);

    expect(foods.length).toBeGreaterThan(0);
    expect(foods.every(food => food.source === 'usda')).toBe(true);
    expect(foods.every(food => validateFood(food).length === 0)).toBe(true);
  });

  it('survives a payload that is not a search response', () => {
    expect(mapUsdaSearch(null)).toEqual([]);
    expect(mapUsdaSearch({ foods: 'nope' })).toEqual([]);
  });
});
