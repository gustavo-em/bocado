import { DEFAULT_GOAL, type Meal } from '../src/domain/diary/Meal';
import { parseGoalInput, summarizeDay } from '../src/domain/diary/daySummary';

function entry(meal: Meal, kcal: number, protein = 0, carbs = 0, fat = 0) {
  return { meal, kcal, protein, carbs, fat };
}

describe('summarizeDay', () => {
  test('an empty day shows the whole goal as remaining', () => {
    const summary = summarizeDay([], DEFAULT_GOAL);
    expect(summary.consumed).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    expect(summary.remaining).toBe(2000);
    expect(summary.overBy).toBe(0);
    expect(summary.isOver).toBe(false);
    expect(summary.goalRatio).toBe(0);
    expect(summary.overRatio).toBe(0);
    expect(summary.macroRatio).toEqual({ protein: 0, carbs: 0, fat: 0 });
    for (const meal of [
      'breakfast',
      'lunch',
      'afternoon_snack',
      'dinner',
    ] as const) {
      expect(summary.byMeal[meal]).toEqual({
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        count: 0,
      });
    }
  });

  test('a partial day sums entries, rounds and splits by meal', () => {
    const summary = summarizeDay(
      [
        entry('breakfast', 150.4, 5.2, 28.1, 1.6),
        entry('breakfast', 95.3, 4.9, 9.4, 3.8),
        entry('lunch', 348, 30.2, 40.3, 8.1),
        entry('dinner', 166.6, 1.7, 12.2, 6.5),
      ],
      DEFAULT_GOAL,
    );
    expect(summary.consumed).toEqual({
      kcal: 760,
      protein: 42,
      carbs: 90,
      fat: 20,
    });
    expect(summary.remaining).toBe(1240);
    expect(summary.isOver).toBe(false);
    expect(summary.goalRatio).toBeCloseTo(0.38, 5);
    expect(summary.overRatio).toBe(0);
    expect(summary.macroRatio.protein).toBeCloseTo(42 / 120, 5);
    expect(summary.macroRatio.carbs).toBeCloseTo(90 / 250, 5);
    expect(summary.macroRatio.fat).toBeCloseTo(20 / 65, 5);
    expect(summary.byMeal.breakfast).toEqual({
      kcal: 246,
      protein: 10,
      carbs: 38,
      fat: 5,
      count: 2,
    });
    expect(summary.byMeal.lunch.kcal).toBe(348);
    expect(summary.byMeal.lunch.count).toBe(1);
    expect(summary.byMeal.afternoon_snack.count).toBe(0);
    expect(summary.byMeal.dinner.kcal).toBe(167);
  });

  test('past the goal: remaining is zero, the excess is reported, bars are full', () => {
    const summary = summarizeDay(
      [entry('lunch', 1200, 70, 200, 40), entry('dinner', 920, 60, 100, 40)],
      DEFAULT_GOAL,
    );
    expect(summary.consumed.kcal).toBe(2120);
    expect(summary.remaining).toBe(0);
    expect(summary.overBy).toBe(120);
    expect(summary.isOver).toBe(true);
    expect(summary.goalRatio).toBe(1);
    expect(summary.overRatio).toBeCloseTo(120 / 2120, 5);
    expect(summary.macroRatio).toEqual({ protein: 1, carbs: 1, fat: 1 });
  });

  test('exactly at the goal is not over', () => {
    const summary = summarizeDay([entry('lunch', 2000)], DEFAULT_GOAL);
    expect(summary.remaining).toBe(0);
    expect(summary.overBy).toBe(0);
    expect(summary.isOver).toBe(false);
    expect(summary.goalRatio).toBe(1);
  });
});

describe('parseGoalInput', () => {
  test('accepts whole numbers inside the limits', () => {
    expect(parseGoalInput('kcal', '1800')).toEqual({
      kind: 'valid',
      value: 1800,
    });
    expect(parseGoalInput('protein_g', '120')).toEqual({
      kind: 'valid',
      value: 120,
    });
  });

  test('rejects empty, zero and non-numeric input', () => {
    expect(parseGoalInput('kcal', '')).toEqual({ kind: 'invalid' });
    expect(parseGoalInput('kcal', '0')).toEqual({ kind: 'invalid' });
    expect(parseGoalInput('fat_g', 'abc')).toEqual({ kind: 'invalid' });
  });

  test('clamps values above the maximum', () => {
    expect(parseGoalInput('kcal', '20000')).toEqual({
      kind: 'clamped',
      value: 9999,
    });
    expect(parseGoalInput('carbs_g', '1500')).toEqual({
      kind: 'clamped',
      value: 999,
    });
  });
});
