import {
  REFERENCE_SERVING,
  type FoodSource,
  type NormalizedFood,
  type Serving,
} from '../src/domain/food/NormalizedFood';
import {
  defaultPortion,
  defaultServing,
  portionSnapshot,
} from '../src/domain/food/portion';
import {
  localizedName,
  rankFoods,
  sourceWeight,
  textRelevance,
} from '../src/domain/food/rank';
import {
  buildFtsMatch,
  searchKey,
  searchTerms,
} from '../src/domain/food/searchQuery';

interface Fixture {
  id: string;
  name: string;
  nameEn?: string;
  kcal?: number;
  boost?: number;
  aliases?: string[];
  measures?: [string, number][];
  brand?: string;
}

/** Mirrors the bundled seed rows (id, source, name, boost, measures). */
function food(fixture: Fixture): NormalizedFood {
  const [source, sourceId] = fixture.id.split(':') as [FoodSource, string];
  const household = (fixture.measures ?? []).map<Serving>(
    ([label, grams], index) => ({
      id: `${source}:${label.replace(/ /g, '-')}`,
      label: { pt: label },
      grams,
      kind: 'household',
      isDefault: index === 0,
    }),
  );
  return {
    id: fixture.id,
    source,
    sourceId,
    name: { pt: fixture.name, en: fixture.nameEn },
    aliases: fixture.aliases,
    brand: fixture.brand,
    verified: source !== 'off' && source !== 'user',
    per100g: {
      kcal: fixture.kcal ?? 100,
      protein_g: 2.5,
      carbs_g: 28.1,
      fat_g: 0.2,
      energySource: 'declared',
    },
    servings: [
      ...household,
      { ...REFERENCE_SERVING, isDefault: household.length === 0 },
    ],
    completeness: 1,
    boost: fixture.boost,
    lastFetchedAt: '2025-01-01',
    attribution: { license: 'TACO', text: 'TACO' },
  };
}

const SEED: NormalizedFood[] = [
  food({
    id: 'taco:3',
    name: 'Arroz, tipo 1, cozido',
    kcal: 128.3,
    boost: 3,
    measures: [
      ['colher de sopa cheia', 25],
      ['colher de servir cheia', 45],
      ['concha média cheia', 100],
    ],
  }),
  food({
    id: 'taco:1',
    name: 'Arroz, integral, cozido',
    kcal: 123.5,
    boost: 2,
    measures: [['colher de sopa cheia', 20]],
  }),
  food({ id: 'taco:4', name: 'Arroz, tipo 1, cru', kcal: 357.8 }),
  food({ id: 'taco:526', name: 'Arroz carreteiro', boost: 1 }),
  food({ id: 'ibge:6300101', name: 'Arroz integral orgânico' }),
  food({ id: 'ibge:6300201', name: 'Arroz com feijão' }),
  food({
    id: 'taco:53',
    name: 'Pão, trigo, francês',
    kcal: 299.8,
    boost: 3,
    aliases: ['Pão de sal', 'Pão nao especificado'],
    measures: [
      ['unidade', 50],
      ['porção', 50],
    ],
  }),
  food({
    id: 'taco:52',
    name: 'Pão, trigo, forma, integral',
    kcal: 253.2,
    boost: 2,
    measures: [['unidade', 25]],
  }),
  food({ id: 'ibge:8001401', name: 'Pão integral', boost: 1 }),
  food({ id: 'taco:49', name: 'Pão, de soja' }),
  food({ id: 'ibge:8501302', name: 'Café', boost: 2 }),
  food({ id: 'taco:471', name: 'Café, infusão 10%', boost: 3 }),
  food({
    id: 'ibge:8501303',
    name: 'Café com leite',
    kcal: 31.4,
    boost: 3,
    measures: [['copo de cafezinho', 50]],
  }),
  food({ id: 'taco:395', name: 'Leite, de vaca, integral', boost: 3 }),
  food({ id: 'ibge:8273902', name: 'Café com farinha' }),
  food({ id: 'taco:140', name: 'Pão, de queijo, assado', boost: 2 }),
];

/** A row that only has an English name, the way USDA foods arrive. */
function englishOnly(id: string, name: string): NormalizedFood {
  const row = food({ id, name });
  row.name = { en: name };
  return row;
}

/*
  What the bundled seed looks like once the glossary has run (task 21): the
  covered rows carry both names, the ones it could not cover carry only the
  Portuguese one.
*/
const ENGLISH_SEED = [
  food({
    id: 'taco:3',
    name: 'Arroz, tipo 1, cozido',
    nameEn: 'Rice, type 1, cooked',
    boost: 3,
  }),
  food({
    id: 'taco:408',
    name: 'Frango, peito, sem pele, grelhado',
    nameEn: 'Chicken, breast, skinless, grilled',
  }),
  food({ id: 'ibge:7903601', name: 'Requeijão' }),
  /*
    What the USDA answers for "rice": English-only rows with short names, which
    outranked the bundled staple while it had no English name of its own.
  */
  englishOnly('usda:173161', 'Rice crackers'),
  englishOnly('usda:169713', 'Rice bran, crude'),
  englishOnly('usda:168914', 'Rice noodles, cooked'),
];

const candidates = SEED.map(item => ({ food: item }));
const names = (query: string) =>
  rankFoods(candidates, query).map(item => item.food.name.pt);

describe('searchQuery', () => {
  test('searchKey folds accents, case and punctuation', () => {
    expect(searchKey('Pão, trigo, francês')).toBe('pao trigo frances');
    expect(searchKey('  Café com LEITE ')).toBe('cafe com leite');
    expect(searchKey('açaí')).toBe('acai');
    expect(searchTerms('pão   francês')).toEqual(['pao', 'frances']);
    expect(searchTerms('   ')).toEqual([]);
  });

  test('buildFtsMatch prefixes every word', () => {
    expect(buildFtsMatch('pao')).toBe('"pao"*');
    expect(buildFtsMatch('Café com leite')).toBe('"cafe"* "com"* "leite"*');
    expect(buildFtsMatch('  ,,  ')).toBeNull();
  });
});

describe('rankFoods', () => {
  test('"arroz" puts the boosted TACO staple first', () => {
    const ranked = names('arroz');
    expect(ranked[0]).toBe('Arroz, tipo 1, cozido');
    expect(ranked[1]).toBe('Arroz, integral, cozido');
    expect(ranked).not.toContain('Pão, trigo, francês');
  });

  test('"pao" finds "Pão, trigo, francês" first without accents', () => {
    const ranked = names('pao');
    expect(ranked[0]).toBe('Pão, trigo, francês');
    expect(ranked).toContain('Pão integral');
    expect(ranked).not.toContain('Café');
  });

  test('"cafe com leite" ranks the exact name first and drops partial matches', () => {
    const ranked = names('cafe com leite');
    expect(ranked[0]).toBe('Café com leite');
    expect(ranked).not.toContain('Leite, de vaca, integral');
    expect(ranked).not.toContain('Café, infusão 10%');
  });

  test('typed accents and casing do not change the result', () => {
    expect(names('PÃO')).toEqual(names('pao'));
    expect(names('Café com leite')).toEqual(names('cafe com leite'));
  });

  test('word prefix and alias prefix tiers', () => {
    const pao = SEED.find(item => item.id === 'taco:53')!;
    expect(textRelevance(pao, 'pao trigo frances')).toBe(100);
    expect(textRelevance(pao, 'pao trigo')).toBe(80);
    expect(textRelevance(pao, 'trigo')).toBe(65);
    expect(textRelevance(pao, 'pao de sal')).toBe(60);
    expect(textRelevance(pao, 'frances pao')).toBe(65);
    expect(textRelevance(pao, 'sal')).toBe(60);
    expect(textRelevance(pao, 'ranc')).toBe(50);
    expect(textRelevance(pao, 'arroz')).toBe(0);
  });

  test('usage adds to the score and blank queries return nothing', () => {
    const plain = rankFoods(candidates, 'arroz');
    const used = rankFoods(
      candidates.map(candidate =>
        candidate.food.id === 'taco:4'
          ? { ...candidate, useCount: 40 }
          : candidate,
      ),
      'arroz',
    );
    expect(plain.map(item => item.food.id)[0]).toBe('taco:3');
    expect(used.map(item => item.food.id)[0]).toBe('taco:4');
    expect(rankFoods(candidates, '   ')).toEqual([]);
  });

  test('en-US prefers the English generic table', () => {
    const usda = food({ id: 'usda:1', name: 'Rice, white, cooked' });
    usda.name = { pt: 'Arroz branco cozido', en: 'Rice, white, cooked' };
    const taco = SEED.find(item => item.id === 'taco:4')!;
    const ranked = rankFoods(
      [{ food: taco }, { food: usda }],
      'arroz',
      'en-US',
    );
    expect(ranked[0].food.id).toBe('usda:1');
  });
});

describe('rankFoods in en-US', () => {
  const english = ENGLISH_SEED.map(item => ({ food: item }));
  const search = (query: string, locale: 'pt-BR' | 'en-US') =>
    rankFoods(english, query, locale).map(item =>
      localizedName(item.food, locale),
    );

  test('"rice" puts the bundled staple above the USDA rows', () => {
    const ranked = search('rice', 'en-US');
    // The bundled base is the primary source (docs/FOOD_DATA_CONTRACT.md), and
    // with an English name it no longer sits below the USDA in an English list.
    expect(ranked.slice(0, 3)).toContain('Rice, type 1, cooked');
    expect(ranked[0]).toBe('Rice, type 1, cooked');
    expect(ranked).toContain('Rice crackers');
  });

  test('a row without an English name keeps the en-US demotion', () => {
    expect(sourceWeight('taco', 'en-US')).toBe(18);
    expect(sourceWeight('taco', 'en-US', true)).toBe(30);
    expect(sourceWeight('ibge', 'en-US', true)).toBe(25);
    // Only the bundled tables are lifted: the online sources keep their en-US
    // weights, with or without an English name.
    expect(sourceWeight('usda', 'en-US')).toBe(32);
    expect(sourceWeight('usda', 'en-US', true)).toBe(32);
    expect(sourceWeight('off', 'en-US', true)).toBe(10);
    // pt-BR never changes, with or without an English name.
    expect(sourceWeight('taco', 'pt-BR')).toBe(30);
    expect(sourceWeight('taco', 'pt-BR', true)).toBe(30);
  });

  test('pt-BR order is untouched by the English names', () => {
    expect(search('arroz', 'pt-BR')[0]).toBe('Arroz, tipo 1, cozido');
  });

  test('"rice" finds the TACO staple and prints it in English', () => {
    expect(search('rice', 'en-US')).toContain('Rice, type 1, cooked');
    expect(search('chicken breast', 'en-US')).toContain(
      'Chicken, breast, skinless, grilled',
    );
  });

  test('the Portuguese name keeps working in English', () => {
    expect(search('arroz', 'en-US')).toContain('Rice, type 1, cooked');
  });

  test('a food without an English name shows its whole Portuguese name', () => {
    expect(search('requeijao', 'en-US')).toEqual(['Requeijão']);
    expect(search('curd', 'en-US')).toEqual([]);
  });

  test('pt-BR results do not change: an English word matches nothing', () => {
    expect(search('arroz', 'pt-BR')).toContain('Arroz, tipo 1, cozido');
    /*
      The English name of a bundled row is index text, never a pt-BR result: an
      English word only brings back the online rows that have no Portuguese
      name of their own (USDA), which is how it already worked before task 21.
    */
    expect(search('rice', 'pt-BR')).not.toContain('Arroz, tipo 1, cozido');
    expect(search('rice', 'pt-BR')).toEqual([
      'Rice crackers',
      'Rice bran, crude',
      'Rice noodles, cooked',
    ]);
    expect(search('chicken breast', 'pt-BR')).toEqual([]);
  });
});

describe('portion', () => {
  const arroz = SEED.find(item => item.id === 'taco:3')!;
  const cru = SEED.find(item => item.id === 'taco:4')!;

  // Spec 09: with nothing remembered, the "+" writes 100 g for every food.
  test('default serving is the 100 g reference', () => {
    expect(defaultServing(arroz).grams).toBe(100);
    expect(defaultServing(arroz)).toEqual(REFERENCE_SERVING);
    expect(defaultServing(cru)).toEqual(REFERENCE_SERVING);
  });

  test('snapshot scales per-100 g values by grams', () => {
    const snapshot = portionSnapshot(arroz, arroz.servings[1]);
    expect(snapshot.grams).toBe(45);
    expect(snapshot.kcal).toBeCloseTo(57.735, 3);
    expect(snapshot.protein).toBeCloseTo(1.125, 3);
    expect(snapshot.carbs).toBeCloseTo(12.645, 3);
    expect(snapshot.fat).toBeCloseTo(0.09, 3);
    expect(snapshot.servingLabel).toBe('colher de servir cheia');
    expect(snapshot.servingCount).toBe(1);
  });

  test('default portion of the "+" tap is 100 g', () => {
    const snapshot = defaultPortion(arroz);
    expect(snapshot.grams).toBe(100);
    expect(snapshot.kcal).toBeCloseTo(128.3, 3);
    expect(snapshot.servingLabel).toBeUndefined();
    expect(snapshot.servingCount).toBeUndefined();

    const reference = defaultPortion(cru);
    expect(reference.grams).toBe(100);
    expect(reference.kcal).toBeCloseTo(357.8, 3);
    expect(reference.servingLabel).toBeUndefined();
    expect(reference.servingCount).toBeUndefined();
  });

  test('serving count multiplies grams', () => {
    const snapshot = portionSnapshot(arroz, arroz.servings[0], 2);
    expect(snapshot.grams).toBe(50);
    expect(snapshot.servingCount).toBe(2);
    expect(snapshot.kcal).toBeCloseTo(64.15, 3);
  });
});

describe('highlight', () => {
  const { alignedKey, matchRanges } = jest.requireActual<
    typeof import('../src/domain/food/searchQuery')
  >('../src/domain/food/searchQuery');

  test('alignedKey keeps one character per input character', () => {
    expect(alignedKey('Pão, trigo, francês')).toBe('pao  trigo  frances');
    expect(alignedKey('Açaí')).toHaveLength(4);
  });

  test('matchRanges points at the typed part of the original name', () => {
    expect(matchRanges('Pão, trigo, francês', 'pao')).toEqual([
      { start: 0, end: 3 },
    ]);
    expect(matchRanges('Café com leite', 'cafe leite')).toEqual([
      { start: 0, end: 4 },
      { start: 9, end: 14 },
    ]);
    expect(matchRanges('Arroz carreteiro', 'arr car')).toEqual([
      { start: 0, end: 3 },
      { start: 6, end: 9 },
    ]);
    expect(matchRanges('Arroz, tipo 1, cozido', '')).toEqual([]);
  });
});
