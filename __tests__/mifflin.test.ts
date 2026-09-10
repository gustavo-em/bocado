import {
  ACTIVITY_FACTORS,
  DEFAULT_PROFILE,
  DEFAULT_SKIP_GOAL,
  INTENT_DELTA_KCAL,
  KCAL_FLOOR,
  basalMetabolicRate,
  calculateGoal,
  macroPercent,
  macrosForKcal,
  type GoalProfile,
} from '../src/domain/goals/mifflin';

/** The screen's defaults: 30 years, 170 cm, 70 kg, sedentary. */
function profile(overrides: Partial<GoalProfile> = {}): GoalProfile {
  return { ...DEFAULT_PROFILE, ...overrides };
}

describe('Mifflin-St Jeor', () => {
  test('basal rate follows the formula for both sexes', () => {
    // 10·70 + 6,25·170 − 5·30 − 161
    expect(basalMetabolicRate(profile({ sex: 'female' }))).toBeCloseTo(
      1451.5,
      5,
    );
    // 10·70 + 6,25·170 − 5·30 + 5
    expect(basalMetabolicRate(profile({ sex: 'male' }))).toBeCloseTo(1617.5, 5);
  });

  test('the four activity factors multiply the basal rate', () => {
    expect(ACTIVITY_FACTORS).toEqual({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      intense: 1.725,
    });
    const bmr = basalMetabolicRate(profile({ sex: 'male' }));
    for (const level of [
      'sedentary',
      'light',
      'moderate',
      'intense',
    ] as const) {
      expect(
        calculateGoal(profile({ sex: 'male', activity: level })).expenditure,
      ).toBeCloseTo(bmr * ACTIVITY_FACTORS[level], 5);
    }
  });

  test('intent moves the goal by −500, 0 and +300', () => {
    expect(INTENT_DELTA_KCAL).toEqual({ lose: -500, maintain: 0, gain: 300 });
    const base = profile({ sex: 'male', activity: 'moderate' });
    const maintain = calculateGoal(base).goal.kcal;
    // 1617,5 × 1,55 = 2507,125 → 2510; −500 → 2010; +300 → 2810.
    expect(maintain).toBe(2510);
    expect(calculateGoal({ ...base, intent: 'lose' }).goal.kcal).toBe(2010);
    expect(calculateGoal({ ...base, intent: 'gain' }).goal.kcal).toBe(2810);
  });

  test('the goal is always a multiple of ten', () => {
    for (const weightKg of [52, 63.4, 70, 88, 101]) {
      for (const activity of [
        'sedentary',
        'light',
        'moderate',
        'intense',
      ] as const) {
        const { goal } = calculateGoal(
          profile({ weightKg, activity, intent: 'gain' }),
        );
        expect(goal.kcal % 10).toBe(0);
      }
    }
  });

  test('the defaults losing weight: 1.240 kcal for a woman, no floor', () => {
    const result = calculateGoal(profile({ sex: 'female', intent: 'lose' }));
    // 1451,5 × 1,2 = 1741,8; −500 = 1241,8 → 1240, above the 1.200 floor.
    expect(result.goal.kcal).toBe(1240);
    expect(result.floorApplied).toBe(false);
  });

  test('the same defaults for a man hit the 1.500 floor', () => {
    const result = calculateGoal(profile({ sex: 'male', intent: 'lose' }));
    // 1617,5 × 1,2 = 1941; −500 = 1441 → 1440, under the 1.500 floor.
    expect(result.goal.kcal).toBe(KCAL_FLOOR.male);
    expect(result.floorApplied).toBe(true);
  });

  test('a light woman losing weight is held at the 1.200 floor', () => {
    const result = calculateGoal(
      profile({ sex: 'female', weightKg: 45, ageYears: 55, intent: 'lose' }),
    );
    // 10·45 + 6,25·170 − 5·55 − 161 = 1026,5; × 1,2 = 1231,8; −500 = 731,8.
    expect(result.goal.kcal).toBe(KCAL_FLOOR.female);
    expect(result.floorApplied).toBe(true);
  });

  test('macros split the calculated goal: protein by weight, fat a quarter', () => {
    const { goal } = calculateGoal(profile({ sex: 'female', intent: 'lose' }));
    expect(goal).toEqual({
      kcal: 1240,
      protein_g: 112,
      fat_g: 34,
      carbs_g: 122,
    });
    expect(macrosForKcal(2000, 80)).toEqual({
      protein_g: 128,
      fat_g: 56,
      carbs_g: 246,
    });
    // Carbohydrates never go negative, however tight the calories are.
    expect(macrosForKcal(1200, 200).carbs_g).toBe(0);
  });

  test('macro percentages of a goal', () => {
    expect(macroPercent('protein', 120, 2000)).toBe(24);
    expect(macroPercent('carbs', 250, 2000)).toBe(50);
    expect(macroPercent('fat', 65, 2000)).toBe(29);
    expect(macroPercent('protein', 120, 0)).toBe(0);
  });

  test('"Pular" keeps the round default goal', () => {
    expect(DEFAULT_SKIP_GOAL).toEqual({
      kcal: 2000,
      protein_g: 120,
      carbs_g: 250,
      fat_g: 65,
    });
  });
});
