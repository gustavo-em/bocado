import { validateFood } from '../src/domain/food/NormalizedFood';
import { portionSnapshot } from '../src/domain/food/portion';
import {
  buildQuickFood,
  isQuickLog,
  quickGrams,
  QUICK_PREFIX,
} from '../src/domain/food/quickLog';

const FALLBACK = 'Registro rápido';
const options = { id: 'abc', fetchedAt: '2026-09-09T00:00:00.000Z' };

describe('quick calorie log', () => {
  it('writes a user food the diary can reference', () => {
    const food = buildQuickFood({ kcal: 300, ...options }, FALLBACK);

    expect(food.id).toBe('user:quick-abc');
    expect(food.source).toBe('user');
    expect(food.verified).toBe(false);
    expect(food.name.pt).toBe(FALLBACK);
    expect(food.name.en).toBe(FALLBACK);
    expect(isQuickLog(food.id)).toBe(true);
    expect(food.id.startsWith(QUICK_PREFIX)).toBe(true);
    expect(validateFood(food)).toEqual([]);
  });

  it('keeps the typed name when there is one', () => {
    const food = buildQuickFood(
      { kcal: 300, name: '  Pastel da feira ', ...options },
      FALLBACK,
    );

    expect(food.name.pt).toBe('Pastel da feira');
    expect(food.servings[0].label.pt).toBe('Pastel da feira');
  });

  it('stores exactly the kcal that was typed', () => {
    const food = buildQuickFood({ kcal: 300, ...options }, FALLBACK);
    const snapshot = portionSnapshot(food, food.servings[0], 1);

    expect(snapshot.kcal).toBeCloseTo(300, 6);
  });

  it('stores the optional macros and leaves the rest at zero', () => {
    const food = buildQuickFood(
      { kcal: 300, protein: 12, carbs: 30, ...options },
      FALLBACK,
    );
    const snapshot = portionSnapshot(food, food.servings[0], 1);

    expect(snapshot.protein).toBeCloseTo(12, 6);
    expect(snapshot.carbs).toBeCloseTo(30, 6);
    expect(snapshot.fat).toBe(0);
  });

  it('has one default serving and ends with the 100 g reference', () => {
    const food = buildQuickFood({ kcal: 300, ...options }, FALLBACK);

    expect(food.servings.filter(serving => serving.isDefault)).toHaveLength(1);
    expect(food.servings[0].grams).toBe(100);
    expect(food.servings[food.servings.length - 1].kind).toBe('reference');
  });

  it('stays inside the per-100 g ceilings for a big meal', () => {
    const food = buildQuickFood(
      { kcal: 1800, protein: 90, carbs: 200, fat: 70, ...options },
      FALLBACK,
    );
    const snapshot = portionSnapshot(food, food.servings[0], 1);

    expect(validateFood(food)).toEqual([]);
    expect(food.per100g.kcal).toBeLessThanOrEqual(950);
    expect(snapshot.kcal).toBeCloseTo(1800, 4);
    expect(snapshot.protein).toBeCloseTo(90, 4);
  });

  it('grows the portion only when the values demand it', () => {
    expect(quickGrams(300, 0, 0, 0)).toBe(100);
    expect(quickGrams(1800, 0, 0, 0)).toBeGreaterThan(100);
  });

  it('treats a missing or negative number as zero', () => {
    const food = buildQuickFood(
      { kcal: 300, protein: -5, fat: Number.NaN, ...options },
      FALLBACK,
    );

    expect(food.per100g.protein_g).toBe(0);
    expect(food.per100g.fat_g).toBe(0);
    expect(validateFood(food)).toEqual([]);
  });
});
