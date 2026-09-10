import {
  DAILY_REFERENCES,
  GRID_MICRO_KEYS,
  summarizeMicros,
  type MicroContribution,
} from '../src/domain/nutrition/micronutrients';

/** 200 g of a TACO row: everything measured. */
const rice: MicroContribution = {
  grams: 200,
  per100: {
    fiber: 1.6,
    sodium: 1.2,
    iron: 0.1,
    calcium: 4,
    magnesium: 2,
    potassium: 15,
    zinc: 0.5,
  },
};

/** "Registrar só as calorias": no nutrient at all. */
const quickLog: MicroContribution = { grams: 100, per100: {} };

/** An Open Food Facts label: fibre and sodium declared, no mineral. */
const label: MicroContribution = {
  grams: 50,
  per100: {
    fiber: 3,
    sodium: 400,
    iron: null,
    calcium: null,
    magnesium: null,
    potassium: null,
    zinc: null,
  },
};

function cell(summary: ReturnType<typeof summarizeMicros>, key: string) {
  const found = [...summary.grid, ...summary.limits].find(
    item => item.key === key,
  );
  if (!found) throw new Error(`Missing ${key}`);
  return found;
}

describe('summarizeMicros', () => {
  test('scales each nutrient by the grams of the entry', () => {
    const summary = summarizeMicros([rice]);
    expect(cell(summary, 'iron').consumed).toBeCloseTo(0.2, 5);
    expect(cell(summary, 'calcium').consumed).toBeCloseTo(8, 5);
    expect(cell(summary, 'potassium').consumed).toBeCloseTo(30, 5);
    expect(cell(summary, 'fiber').consumed).toBeCloseTo(3.2, 5);
    expect(cell(summary, 'sodium').consumed).toBeCloseTo(2.4, 5);
  });

  test('a missing value is not a zero: it leaves the total alone', () => {
    const withOnlyRice = summarizeMicros([rice]);
    const withQuickLog = summarizeMicros([rice, quickLog]);
    expect(withQuickLog.grid.map(item => item.consumed)).toEqual(
      withOnlyRice.grid.map(item => item.consumed),
    );
    expect(cell(withQuickLog, 'zinc').hasData).toBe(true);
  });

  test('a nutrient no entry carried has no data and an empty track', () => {
    const summary = summarizeMicros([quickLog]);
    for (const item of [...summary.grid, ...summary.limits]) {
      expect(item.hasData).toBe(false);
      expect(item.consumed).toBe(0);
      expect(item.ratio).toBe(0);
    }
  });

  test('null and undefined both read as never measured', () => {
    const summary = summarizeMicros([label]);
    expect(cell(summary, 'fiber').hasData).toBe(true);
    expect(cell(summary, 'sodium').hasData).toBe(true);
    for (const key of ['iron', 'calcium', 'magnesium', 'potassium', 'zinc'])
      expect(cell(summary, key).hasData).toBe(false);
  });

  test('cells without a contributor sink to the end, order kept', () => {
    const summary = summarizeMicros([label]);
    expect(summary.grid.map(item => item.key)).toEqual([
      'fiber',
      'calcium',
      'iron',
      'magnesium',
      'potassium',
      'zinc',
    ]);
    const onlyMinerals = summarizeMicros([
      { grams: 100, per100: { iron: 2, zinc: 1 } },
    ]);
    expect(onlyMinerals.grid.map(item => item.key)).toEqual([
      'iron',
      'zinc',
      'fiber',
      'calcium',
      'magnesium',
      'potassium',
    ]);
  });

  test('coverage counts items, and a quick log lands in the denominator', () => {
    expect(summarizeMicros([rice, quickLog]).coverage).toEqual({
      withData: 1,
      total: 2,
    });
    expect(summarizeMicros([quickLog]).coverage).toEqual({
      withData: 0,
      total: 1,
    });
    // The label has fibre, which is a cell of the grid, so it counts.
    expect(summarizeMicros([label]).coverage).toEqual({
      withData: 1,
      total: 1,
    });
  });

  test('sodium alone is not coverage: the grid would still be empty', () => {
    /*
      A Brazilian label declares sodium and no mineral (RDC 429/2020). Counting
      it would print "1 de 1" over six cells that all say "sem dado".
    */
    const sodiumOnly: MicroContribution = {
      grams: 30,
      per100: { sodium: 600, fiber: null, iron: null },
    };
    const summary = summarizeMicros([sodiumOnly]);

    expect(summary.coverage).toEqual({ withData: 0, total: 1 });
    expect(summary.grid.every(item => !item.hasData)).toBe(true);
    // The sodium line still shows what it measured.
    expect(cell(summary, 'sodium').hasData).toBe(true);
    expect(cell(summary, 'sodium').consumed).toBeCloseTo(180, 5);
  });

  test('past the reference the bar is simply full, with no alarm', () => {
    const salty = summarizeMicros([{ grams: 100, per100: { sodium: 9000 } }]);
    expect(cell(salty, 'sodium').consumed).toBe(9000);
    expect(cell(salty, 'sodium').ratio).toBe(1);
  });

  test('references are the Brazilian IDR of RDC 269/2005', () => {
    expect(DAILY_REFERENCES).toEqual({
      fiber: { amount: 25, unit: 'g' },
      calcium: { amount: 1000, unit: 'mg' },
      iron: { amount: 14, unit: 'mg' },
      magnesium: { amount: 260, unit: 'mg' },
      potassium: { amount: 3510, unit: 'mg' },
      zinc: { amount: 7, unit: 'mg' },
      sodium: { amount: 2000, unit: 'mg' },
    });
  });

  test('the grid is the six cells the screen draws, and no vitamin', () => {
    expect(GRID_MICRO_KEYS).toHaveLength(6);
    expect(summarizeMicros([]).grid).toHaveLength(6);
    expect(Object.keys(DAILY_REFERENCES)).not.toContain('vitaminA');
  });
});
