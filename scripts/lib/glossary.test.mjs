import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  loadGlossary,
  normalizeKey,
  translateCategory,
  translateLabel,
  translateName,
} from './glossary.mjs';

const bundled = loadGlossary(
  JSON.parse(
    readFileSync(path.join(process.cwd(), 'data/glossary/pt-en.json'), 'utf8'),
  ),
);

const sample = loadGlossary({
  phrases: {
    'sem pele': 'skinless',
    'agua doce': 'freshwater',
    'de qualquer sabor': ', any flavor',
  },
  adjectives: ['cozido', 'cozida', 'crua', 'light', 'fresca'],
  trailing: { 'agua de': 'water' },
  terms: {
    arroz: 'rice',
    tipo: 'type',
    cozido: 'cooked',
    cozida: 'cooked',
    crua: 'raw',
    frango: 'chicken',
    peito: 'breast',
    carne: 'meat',
    galinha: 'hen',
    massa: 'pasta',
    corvina: 'croaker',
    coco: 'coconut',
    leite: 'milk',
    iogurte: 'yogurt',
    light: 'light',
    fresca: 'fresh',
  },
  keep: { acai: 'açaí' },
  pending: { requeijao: 'no English name matches the product' },
  labels: { 'colher de sopa cheia': 'heaped tablespoon' },
  categories: { 'cereais e derivados': 'Cereals and cereal products' },
});

describe('translateName', () => {
  test('keeps the catalog form, facet by facet', () => {
    expect(translateName('Arroz, tipo 1, cozido', sample)).toEqual({
      text: 'Rice, type 1, cooked',
      missing: [],
    });
  });

  test('reads accents and case through the normalized keys', () => {
    expect(translateName('AÇAÍ', sample).text).toBe('Açaí');
    expect(translateName('Corvina de água doce, crua', sample).text).toBe(
      'Freshwater croaker, raw',
    );
  });

  test('puts the modifier of a genitive first', () => {
    expect(translateName('Carne de galinha', sample).text).toBe('Hen meat');
    expect(translateName('Frango, peito, sem pele', sample).text).toBe(
      'Chicken, breast, skinless',
    );
  });

  test('inverts a trailing qualifier with a comma, as the catalog does', () => {
    expect(translateName('Leite de coco light', sample).text).toBe(
      'Coconut milk, light',
    );
    expect(translateName('Massa fresca', sample).text).toBe('Pasta, fresh');
  });

  test('an unknown term leaves the food without an English name', () => {
    const result = translateName('Arroz, tipo 1, xyzabc', sample);
    expect(result.missing).toContain('xyzabc');
  });

  test('a pending term blocks the whole name, never half of it', () => {
    const result = translateName('Requeijão, cremoso', sample);
    expect(result.missing).toContain('requeijao');
    expect(result.text).not.toContain('Requeijão');
  });

  test('an inverted name keeps its head ("Coco, água de")', () => {
    expect(translateName('Coco, água de', sample).text).toBe('Coconut, water');
  });

  test('a phrase can carry its own comma', () => {
    expect(translateName('Iogurte de qualquer sabor light', sample).text).toBe(
      'Yogurt, any flavor, light',
    );
  });
});

describe('translateLabel and translateCategory', () => {
  test('labels are matched whole, and an unknown one stays Portuguese', () => {
    expect(translateLabel('Colher de sopa cheia', sample).text).toBe(
      'heaped tablespoon',
    );
    expect(translateLabel('coió', sample)).toEqual({
      text: '',
      missing: ['coio'],
    });
  });

  test('categories are matched whole', () => {
    expect(translateCategory('Cereais e derivados', sample).text).toBe(
      'Cereals and cereal products',
    );
  });
});

describe('the glossary shipped in the repository', () => {
  test('normalizes every key: lower case and no diacritics', () => {
    for (const section of ['phrases', 'terms', 'keep', 'labels', 'categories'])
      for (const key of bundled[section].keys())
        expect(key).toBe(normalizeKey(key));
  });

  test('translates the staples of the bundled base', () => {
    expect(translateName('Arroz, tipo 1, cozido', bundled).text).toBe(
      'Rice, type 1, cooked',
    );
    expect(
      translateName('Frango, peito, sem pele, grelhado', bundled).text,
    ).toBe('Chicken, breast, skinless, grilled');
    expect(translateName('Feijão, carioca, cozido', bundled).text).toBe(
      'Beans, carioca, cooked',
    );
  });

  test('leaves the ambiguous ones in Portuguese, on purpose', () => {
    expect(translateName('Requeijão', bundled).missing).toContain('requeijao');
    expect(
      translateName('Cuscuz, de milho, cozido', bundled).missing,
    ).toContain('cuscuz');
  });

  test('a cut nicknamed after an animal is not translated as that animal', () => {
    const jacare = translateName(
      'Jacare (carne bovina de segunda c/ osso), cozido',
      bundled,
    );
    expect(jacare.missing).toContain('jacare');
    expect(jacare.text).not.toContain('Alligator');
    expect(translateName('Mao bovina, cozido', bundled).missing).toContain(
      'mao',
    );
  });

  test('no source abbreviation is passed off as an English word', () => {
    // "c/ osso" is read as a phrase; the bare "c" is pending, like the region
    // codes of "Prato de comida N/CO/NE/SE".
    expect(bundled.phrases.get('c osso')).toBe('with bone');
    for (const fragment of ['c', 'n', 'q', 'co', 'ne', 'se'])
      expect(bundled.pending.has(fragment)).toBe(true);
    // Every short key that survives is a real word the app can print.
    const words = ['po', 'pe', 'pa', 'ou', 'e', 'em', 'ao', 'no', 'a'];
    for (const key of bundled.terms.keys())
      if (key.length <= 2) expect(words).toContain(key);
  });

  test('a term never echoes the Portuguese word from `terms`', () => {
    // Echoing belongs to `keep`, where it is a decision, or to `pending`.
    const english = new Set([
      'chicken',
      'steak',
      'mignon',
      'light',
      'diet',
      'mix',
      'mini',
      'quinoa',
      'cereal',
      'gluten',
      'polenta',
      'ravioli',
      'yakisoba',
      'tapioca',
      'brioche',
      'croissant',
      'cracker',
      'wafer',
      'crepe',
      'pizza',
      'calzone',
      'quiche',
      'nuggets',
      'chips',
      'oregano',
      'banana',
      'acerola',
      'kiwi',
      'cacao',
      'macadamia',
      'nectar',
      'provolone',
      'gorgonzola',
      'cream',
      'cheese',
      'canola',
      'egg',
      'bacon',
      'ketchup',
      'escabeche',
      'mate',
      'cappuccino',
      'chocolate',
      'milk',
      'shake',
      'cola',
      'rum',
      'vodka',
      'martini',
      'drink',
      'demerara',
      'glucose',
      'ambrosia',
      'drops',
      'mousse',
      'churro',
      'sushi',
      'granola',
      'base',
      'tofu',
      'atkins',
      'extra',
      'original',
      'pate',
      'spray',
      'fanta',
    ]);
    for (const [key, value] of bundled.terms)
      if (key === value.toLowerCase()) expect(english.has(key)).toBe(true);
  });
});
