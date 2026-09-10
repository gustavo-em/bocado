import {
  firstBrand,
  mapOffProduct,
  mapOffProductResponse,
  mapOffSearch,
  offEnergy,
  offSodiumMg,
  OFF_ATTRIBUTION_TEXT,
} from '../src/domain/food/mappers/offMapper';
import { validateFood } from '../src/domain/food/NormalizedFood';

import condensedMilk from './fixtures/off_product_7891000100103.json';
import instantCoffee from './fixtures/off_product_7891000315507.json';
import arrozSearch from './fixtures/off_search_arroz_sal.json';
import bauduccoSearch from './fixtures/sal_bauducco.json';

const FETCHED_AT = '2026-09-09T00:00:00.000Z';
const options = { fetchedAt: FETCHED_AT };

/** The condensed milk fixture, with some nutriments dropped. */
function withoutNutriments(...keys: string[]) {
  const raw = condensedMilk.product as unknown as Record<string, unknown>;
  const nutriments = { ...(raw.nutriments as Record<string, unknown>) };
  for (const key of keys) delete nutriments[key];
  return { ...raw, nutriments };
}

describe('Open Food Facts product mapping', () => {
  it('maps a Brazilian product into the contract shape', () => {
    const food = mapOffProductResponse(condensedMilk, options);

    expect(food).not.toBeNull();
    expect(food?.id).toBe('off:7891000100103');
    expect(food?.source).toBe('off');
    expect(food?.sourceId).toBe('7891000100103');
    expect(food?.barcode).toBe('7891000100103');
    expect(food?.name.pt).toBe('Leite Condensado Integral moça');
    expect(food?.verified).toBe(false);
    expect(food?.per100g).toMatchObject({
      kcal: 325,
      protein_g: 7,
      carbs_g: 55,
      fat_g: 8,
      fiber_g: 0,
      sugar_g: 55,
      saturated_fat_g: 5,
      energySource: 'declared',
    });
    expect(validateFood(food!)).toEqual([]);
  });

  /*
    A Brazilian label declares no mineral but sodium (RDC 429/2020), so the
    fixture carries none and every one of the five has to stay undefined —
    a zero there would quietly pull the day's total down.
  */
  it('leaves the five minerals undefined when the label has none', () => {
    const food = mapOffProductResponse(condensedMilk, options);

    expect(food?.per100g.iron_mg).toBeUndefined();
    expect(food?.per100g.calcium_mg).toBeUndefined();
    expect(food?.per100g.magnesium_mg).toBeUndefined();
    expect(food?.per100g.potassium_mg).toBeUndefined();
    expect(food?.per100g.zinc_mg).toBeUndefined();
  });

  it('reads the minerals of a label that has them, in grams, as milligrams', () => {
    const raw = condensedMilk.product as unknown as Record<string, unknown>;
    const product = {
      ...raw,
      nutriments: {
        ...(raw.nutriments as Record<string, unknown>),
        iron_100g: 0.0021,
        calcium_100g: 0.284,
        magnesium_100g: 0.025,
        potassium_100g: 0.371,
        zinc_100g: 0.0091,
      },
    };
    const food = mapOffProduct(product, options);

    expect(food?.per100g).toMatchObject({
      iron_mg: 2.1,
      calcium_mg: 284,
      magnesium_mg: 25,
      potassium_mg: 371,
      zinc_mg: 9.1,
    });
  });

  it('keeps only the first brand', () => {
    expect(mapOffProductResponse(condensedMilk, options)?.brand).toBe('Nestlé');
    expect(firstBrand('Nestlé, Moça')).toBe('Nestlé');
    expect(firstBrand(['Arroz Brilhante'])).toBe('Arroz Brilhante');
    expect(firstBrand(undefined)).toBeUndefined();
  });

  it('turns the label serving into the default one, 100 g last', () => {
    const food = mapOffProductResponse(condensedMilk, options);

    expect(food?.servings[0]).toMatchObject({
      id: 'off:serving',
      grams: 20,
      kind: 'package',
      isDefault: true,
      label: { pt: '20 g' },
    });
    expect(food?.servings[food.servings.length - 1].kind).toBe('reference');
  });

  it('links to the product page and cites the ODbL', () => {
    const food = mapOffProductResponse(condensedMilk, options);

    expect(food?.attribution).toEqual({
      license: 'ODbL-1.0+DbCL',
      text: OFF_ATTRIBUTION_TEXT,
      url: 'https://br.openfoodfacts.org/produto/7891000100103',
    });
    expect(food?.lastFetchedAt).toBe(FETCHED_AT);
  });

  it('clamps completeness into 0..1', () => {
    // The fixture declares 1.1.
    expect(mapOffProductResponse(condensedMilk, options)?.completeness).toBe(1);
  });

  it('ignores nutriments_estimated and drops the product', () => {
    // The coffee only has guessed values, which are not label data.
    expect(mapOffProductResponse(instantCoffee, options)).toBeNull();
  });
});

describe('Open Food Facts energy', () => {
  it('converts kJ when kcal is missing', () => {
    const food = mapOffProduct(withoutNutriments('energy-kcal_100g'), options);

    // 1365 kJ / 4.184
    expect(food?.per100g.kcal).toBeCloseTo(326.24, 2);
    expect(food?.per100g.energySource).toBe('kj_converted');
  });

  it('falls back to energy_100g, which is always kJ', () => {
    const food = mapOffProduct(
      withoutNutriments('energy-kcal_100g', 'energy-kj_100g'),
      options,
    );

    expect(food?.per100g.kcal).toBeCloseTo(326.24, 2);
    expect(food?.per100g.energySource).toBe('kj_converted');
  });

  it('falls back to Atwater over the macros', () => {
    const food = mapOffProduct(
      withoutNutriments('energy-kcal_100g', 'energy-kj_100g', 'energy_100g'),
      options,
    );

    // 4 × 7 + 4 × 55 + 9 × 8
    expect(food?.per100g.kcal).toBe(320);
    expect(food?.per100g.energySource).toBe('atwater');
  });

  it('has no energy at all without macros', () => {
    expect(offEnergy({}, 0, 0, 0)).toBeNull();
  });
});

describe('Open Food Facts sodium', () => {
  it('reads sodium in grams and stores milligrams', () => {
    expect(offSodiumMg({ sodium_100g: 0.0072 })).toBeCloseTo(7.2, 6);
  });

  it('derives sodium from salt when it is missing', () => {
    // 0,018 g salt / 2,5 × 1000
    expect(offSodiumMg({ salt_100g: 0.018 })).toBeCloseTo(7.2, 6);
  });

  it('parses the string values the API also sends', () => {
    expect(offSodiumMg({ sodium_100g: '0,0072' })).toBeCloseTo(7.2, 6);
  });

  it('leaves sodium out when neither is declared', () => {
    expect(offSodiumMg({})).toBeUndefined();
  });
});

describe('Open Food Facts search', () => {
  it('maps every usable hit of a search-a-licious response', () => {
    const foods = mapOffSearch(arrozSearch, options);

    expect(foods).toHaveLength(3);
    expect(foods[0]).toMatchObject({
      id: 'off:7896800777715',
      brand: 'Arroz Brilhante',
      name: { pt: 'Arroz Integral' },
    });
    expect(foods[0].per100g.kcal).toBe(350);
    expect(foods[0].per100g.sodium_mg).toBeCloseTo(7.2, 6);
    // No serving_quantity in a search hit: 100 g is the default.
    expect(foods[0].servings).toHaveLength(1);
    expect(foods[0].servings[0].kind).toBe('reference');
  });

  it('drops hits with no nutriments at all', () => {
    expect(mapOffSearch(bauduccoSearch, options)).toEqual([]);
  });

  it('survives a payload that is not a search response', () => {
    expect(mapOffSearch(null)).toEqual([]);
    expect(mapOffSearch({ hits: 'nope' })).toEqual([]);
    expect(mapOffProduct(null)).toBeNull();
  });
});

describe('Open Food Facts barcodes', () => {
  it('pads a UPC-A code to GTIN-13', () => {
    const food = mapOffProduct(
      { ...withoutNutriments(), code: '875754003399' },
      options,
    );

    expect(food?.barcode).toBe('0875754003399');
    expect(food?.id).toBe('off:0875754003399');
    expect(food?.attribution.url).toBe(
      'https://br.openfoodfacts.org/produto/0875754003399',
    );
  });
});
