import { DEFAULT_GOAL, type Meal } from '../src/domain/diary/Meal';
import { heroValue, summarizeDay } from '../src/domain/diary/daySummary';

function entry(meal: Meal, kcal: number) {
  return { meal, kcal, protein: 0, carbs: 0, fat: 0 };
}

describe('heroValue', () => {
  test('an empty day answers with the whole goal', () => {
    const summary = summarizeDay([], DEFAULT_GOAL);
    expect(heroValue(summary, DEFAULT_GOAL.kcal, 'remaining')).toEqual({
      kcal: 2000,
      line: 'available',
    });
  });

  test('a day under the goal answers with what is left', () => {
    const summary = summarizeDay([entry('lunch', 600)], DEFAULT_GOAL);
    expect(heroValue(summary, DEFAULT_GOAL.kcal, 'remaining')).toEqual({
      kcal: 1400,
      line: 'remaining',
    });
  });

  test('past the goal it answers with how far past, never negative', () => {
    const summary = summarizeDay([entry('dinner', 2300)], DEFAULT_GOAL);
    expect(heroValue(summary, DEFAULT_GOAL.kcal, 'remaining')).toEqual({
      kcal: 300,
      line: 'over',
    });
  });

  test('"consumidas" answers with the total, with or without entries', () => {
    const eaten = summarizeDay([entry('breakfast', 450)], DEFAULT_GOAL);
    expect(heroValue(eaten, DEFAULT_GOAL.kcal, 'consumed')).toEqual({
      kcal: 450,
      line: 'ofGoal',
    });
    const empty = summarizeDay([], DEFAULT_GOAL);
    expect(heroValue(empty, DEFAULT_GOAL.kcal, 'consumed')).toEqual({
      kcal: 0,
      line: 'ofGoal',
    });
  });

  test('past the goal, "consumidas" keeps reading as a total', () => {
    const summary = summarizeDay([entry('dinner', 2300)], DEFAULT_GOAL);
    expect(heroValue(summary, DEFAULT_GOAL.kcal, 'consumed')).toEqual({
      kcal: 2300,
      line: 'ofGoal',
    });
  });

  test('a day still loading shows the goal, not zero', () => {
    expect(heroValue(null, 1240, 'remaining')).toEqual({
      kcal: 1240,
      line: 'available',
    });
    expect(heroValue(null, 1240, 'consumed')).toEqual({
      kcal: 0,
      line: 'ofGoal',
    });
  });
});
