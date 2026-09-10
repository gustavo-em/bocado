import type { Scalar } from '@op-engineering/op-sqlite';

import { diaryRepository } from '../src/data/diary/DiaryRepository';
import type { NormalizedFood } from '../src/domain/food/NormalizedFood';
import { REFERENCE_SERVING } from '../src/domain/food/NormalizedFood';

type Row = Record<string, Scalar>;
type Call = { sql: string; params: Scalar[] };

/**
 * A scripted database: records every statement and answers the reads the
 * repository makes (`position`, `by_meal_json`, the entry it just wrote). The
 * stored entry disappears once a DELETE lands, so the read-back after the
 * commit sees what a real database would; `ignoredDeletes` plays the failure
 * the tester caught, a delete that leaves the row standing.
 */
function fakeDatabase(
  usage: Row | undefined,
  entry: Row | undefined,
  ignoredDeletes = 0,
) {
  const calls: Call[] = [];
  let deletes = 0;
  let present = entry !== undefined;
  const execute = jest.fn(async (sql: string, params: Scalar[] = []) => {
    calls.push({ sql, params });
    if (sql.includes('DELETE FROM diary_entries')) {
      deletes += 1;
      if (deletes > ignoredDeletes) present = false;
      return { rows: [] };
    }
    if (sql.includes('AS position')) return { rows: [{ position: 1 }] };
    if (sql.includes('FROM food_usage')) return { rows: usage ? [usage] : [] };
    if (sql.includes('FROM diary_entries WHERE id = ?')) {
      return { rows: present && entry ? [entry] : [] };
    }
    if (sql.includes('FROM diary_entries e')) {
      return { rows: entry ? [entry] : [] };
    }
    return { rows: [] };
  });
  const db = {
    execute,
    transaction: async (work: (tx: { execute: typeof execute }) => unknown) =>
      work({ execute }),
  };
  return { db, calls };
}

let mockDatabase: ReturnType<typeof fakeDatabase>;

jest.mock('../src/data/db/database', () => ({
  getDatabase: () => Promise.resolve(mockDatabase.db),
}));

const arroz: NormalizedFood = {
  id: 'taco:3',
  source: 'taco',
  sourceId: '3',
  name: { pt: 'Arroz, tipo 1, cozido', en: 'Rice, white, cooked' },
  verified: true,
  per100g: {
    kcal: 128.3,
    protein_g: 2.5,
    carbs_g: 28.1,
    fat_g: 0.2,
    energySource: 'declared',
  },
  servings: [
    {
      id: 'taco:tbsp',
      label: { pt: 'colher de sopa cheia', en: 'heaping tablespoon' },
      grams: 25,
      kind: 'household',
      isDefault: true,
    },
    { ...REFERENCE_SERVING, isDefault: false },
  ],
  completeness: 1,
  lastFetchedAt: '2025-01-01',
  attribution: { license: 'TACO', text: 'TACO' },
};

const written: Row = {
  id: 'e_1',
  day: '2026-09-08',
  meal: 'lunch',
  food_id: 'taco:3',
  grams: 25,
  serving_label: 'heaping tablespoon',
  serving_count: 1,
  kcal: 32.075,
  protein: 0.625,
  carbs: 7.025,
  fat: 0.05,
  position: 1,
  created_at: '2026-09-08T12:00:00.000Z',
  updated_at: '2026-09-08T12:00:00.000Z',
  food_name: 'Arroz, tipo 1, cozido',
};

function statement(calls: Call[], fragment: string): Call {
  const call = calls.find(item => item.sql.includes(fragment));
  if (!call) throw new Error(`No statement containing ${fragment}`);
  return call;
}

describe('diaryRepository.addEntry', () => {
  test('stores the serving label in the given locale', async () => {
    mockDatabase = fakeDatabase(undefined, written);
    await diaryRepository.addEntry({
      day: '2026-09-08',
      meal: 'lunch',
      food: arroz,
      serving: arroz.servings[0],
      locale: 'en-US',
    });
    const insert = statement(mockDatabase.calls, 'INSERT INTO diary_entries');
    expect(insert.params[5]).toBe('heaping tablespoon');
    const usage = statement(mockDatabase.calls, 'INSERT INTO food_usage');
    expect(usage.params[3]).toBe('heaping tablespoon');
  });

  test('defaults the label to pt-BR', async () => {
    mockDatabase = fakeDatabase(undefined, written);
    await diaryRepository.addEntry({
      day: '2026-09-08',
      meal: 'lunch',
      food: arroz,
      serving: arroz.servings[0],
    });
    const insert = statement(mockDatabase.calls, 'INSERT INTO diary_entries');
    expect(insert.params[5]).toBe('colher de sopa cheia');
  });

  test('counts the meal in by_meal_json', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":2}' }, written);
    await diaryRepository.addEntry({
      day: '2026-09-08',
      meal: 'lunch',
      food: arroz,
      serving: arroz.servings[0],
    });
    const usage = statement(mockDatabase.calls, 'INSERT INTO food_usage');
    expect(JSON.parse(String(usage.params[5]))).toEqual({ lunch: 3 });
  });
});

describe('diaryRepository.removeEntry', () => {
  test('gives back the total and the per-meal usage counters', async () => {
    mockDatabase = fakeDatabase(
      { by_meal_json: '{"lunch":3,"dinner":1}' },
      written,
    );
    await diaryRepository.removeEntry('e_1');
    expect(
      statement(mockDatabase.calls, 'DELETE FROM diary_entries').params,
    ).toEqual(['e_1']);
    const usage = statement(mockDatabase.calls, 'use_count - 1');
    expect(usage.sql).toContain('by_meal_json = ?');
    expect(JSON.parse(String(usage.params[0]))).toEqual({
      lunch: 2,
      dinner: 1,
    });
    expect(usage.params[1]).toBe('taco:3');
  });

  test('never drives a meal counter below zero', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{}' }, written);
    await diaryRepository.removeEntry('e_1');
    const usage = statement(mockDatabase.calls, 'use_count - 1');
    expect(JSON.parse(String(usage.params[0]))).toEqual({ lunch: 0 });
  });

  test('does nothing for an unknown entry', async () => {
    mockDatabase = fakeDatabase(undefined, undefined);
    await diaryRepository.removeEntry('missing');
    expect(
      mockDatabase.calls.some(call => call.sql.includes('DELETE FROM')),
    ).toBe(false);
  });

  test('looks the entry up without joining foods', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":1}' }, written);
    await diaryRepository.removeEntry('e_1');
    const lookup = statement(
      mockDatabase.calls,
      'FROM diary_entries WHERE id = ?',
    );
    expect(lookup.sql).not.toContain('JOIN foods');
    expect(lookup.params).toEqual(['e_1']);
  });

  test('deletes again when the entry survives the transaction', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":2}' }, written, 1);
    await diaryRepository.removeEntry('e_1');
    const deletes = mockDatabase.calls.filter(call =>
      call.sql.includes('DELETE FROM diary_entries'),
    );
    expect(deletes).toHaveLength(2);
    expect(deletes[1].params).toEqual(['e_1']);
    // The meal counter is given back once per delete that took effect.
    const decrements = mockDatabase.calls.filter(call =>
      call.sql.includes('use_count - 1'),
    );
    expect(decrements).toHaveLength(2);
  });

  test('refuses to report a removal the day never got', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":1}' }, written, 5);
    await expect(diaryRepository.removeEntry('e_1')).rejects.toThrow(
      'diary entry e_1 not removed',
    );
  });
});

describe('diaryRepository.updateEntry', () => {
  test('rewrites the portion without counting a new use', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":2}' }, written);
    await diaryRepository.updateEntry({
      id: 'e_1',
      food: arroz,
      serving: arroz.servings[0],
      servingCount: 2,
    });
    const update = statement(mockDatabase.calls, 'UPDATE diary_entries SET');
    expect(update.params[0]).toBe('lunch');
    expect(update.params[1]).toBe(50);
    expect(update.params[3]).toBe(2);
    expect(update.params[10]).toBe('e_1');
    // An edit only refreshes the remembered portion.
    const usage = statement(mockDatabase.calls, 'UPDATE food_usage SET');
    expect(usage.sql).not.toContain('use_count');
    expect(usage.params[1]).toBe(50);
    expect(usage.params[2]).toBe('colher de sopa cheia');
    expect(usage.params[5]).toBe('taco:3');
  });

  test('keeps the position when the meal does not change', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":1}' }, written);
    await diaryRepository.updateEntry({
      id: 'e_1',
      food: arroz,
      serving: arroz.servings[0],
      meal: 'lunch',
    });
    expect(
      mockDatabase.calls.some(call => call.sql.includes('AS position')),
    ).toBe(false);
    const usage = statement(mockDatabase.calls, 'UPDATE food_usage SET');
    expect(JSON.parse(String(usage.params[4]))).toEqual({ lunch: 1 });
  });

  test('moves the entry to the end of the target meal', async () => {
    mockDatabase = fakeDatabase(
      { by_meal_json: '{"lunch":2,"dinner":1}' },
      written,
    );
    await diaryRepository.updateEntry({
      id: 'e_1',
      food: arroz,
      serving: arroz.servings[0],
      meal: 'dinner',
    });
    const update = statement(mockDatabase.calls, 'UPDATE diary_entries SET');
    expect(update.params[0]).toBe('dinner');
    expect(update.params[8]).toBe(1);
    const usage = statement(mockDatabase.calls, 'UPDATE food_usage SET');
    expect(JSON.parse(String(usage.params[4]))).toEqual({
      lunch: 1,
      dinner: 2,
    });
  });

  test('refuses to edit an entry that is gone', async () => {
    mockDatabase = fakeDatabase(undefined, undefined);
    await expect(
      diaryRepository.updateEntry({
        id: 'missing',
        food: arroz,
        serving: arroz.servings[0],
      }),
    ).rejects.toThrow('diary entry missing not found');
  });
});

describe('diaryRepository.restoreEntry', () => {
  test('puts the exact row back and gives the usage counters back', async () => {
    mockDatabase = fakeDatabase({ by_meal_json: '{"lunch":1}' }, written);
    await diaryRepository.restoreEntry({
      id: 'e_1',
      day: '2026-09-08',
      meal: 'lunch',
      foodId: 'taco:3',
      grams: 25,
      servingLabel: 'colher de sopa cheia',
      servingCount: 1,
      kcal: 32,
      protein: 0.6,
      carbs: 7,
      fat: 0.1,
      position: 3,
      createdAt: '2026-09-08T12:00:00.000Z',
      updatedAt: '2026-09-08T12:00:00.000Z',
    });
    const insert = statement(
      mockDatabase.calls,
      'INSERT OR REPLACE INTO diary_entries',
    );
    expect(insert.params[0]).toBe('e_1');
    expect(insert.params[11]).toBe(3);
    expect(insert.params[12]).toBe('2026-09-08T12:00:00.000Z');
    const usage = statement(mockDatabase.calls, 'INSERT INTO food_usage');
    expect(JSON.parse(String(usage.params[5]))).toEqual({ lunch: 2 });
  });
});

describe('diaryRepository.usageForFood', () => {
  test('reads the last portion back', async () => {
    mockDatabase = fakeDatabase(
      {
        last_grams: 60,
        last_serving_label: 'colher de servir cheia',
        last_serving_count: 1.5,
      },
      written,
    );
    await expect(diaryRepository.usageForFood('taco:3')).resolves.toEqual({
      lastGrams: 60,
      lastServingLabel: 'colher de servir cheia',
      lastServingCount: 1.5,
    });
  });

  test('answers null for a food nobody has logged', async () => {
    mockDatabase = fakeDatabase(undefined, written);
    await expect(diaryRepository.usageForFood('taco:9')).resolves.toBeNull();
  });
});
