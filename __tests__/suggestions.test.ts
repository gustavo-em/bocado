import {
  mixWithStarters,
  pickRepeatSource,
  rankSuggestions,
  SUGGESTION_MIN_SCORE,
  withoutLoggedDuplicates,
  type SuggestionEvent,
} from '../src/domain/diary/suggestions';
import { addDays } from '../src/domain/diary/days';

/** Wednesday, 12:30 — the moment every case is ranked against. */
const TODAY = '2026-09-09';
const NOON = 12 * 60 + 30;

function event(
  foodId: string,
  day: string,
  minuteOfDay: number,
  meal: SuggestionEvent['meal'] = 'lunch',
): SuggestionEvent {
  return { foodId, day, minuteOfDay, meal };
}

const context = {
  day: TODAY,
  meal: 'lunch' as const,
  minuteOfDay: NOON,
};

describe('rankSuggestions', () => {
  it('puts yesterday’s lunch above a dinner from twenty days ago', () => {
    const ranked = rankSuggestions(
      [
        event('rice', addDays(TODAY, -1), NOON, 'lunch'),
        // Twice, so the old dinner clears the noise threshold and can be
        // compared instead of dropped.
        event('soup', addDays(TODAY, -20), 20 * 60, 'dinner'),
        event('soup', addDays(TODAY, -21), 20 * 60, 'dinner'),
      ],
      context,
    );

    expect(ranked.map(item => item.foodId)).toEqual(['rice', 'soup']);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('drops what is already in the meal being added to', () => {
    const events = [
      event('rice', addDays(TODAY, -1), NOON),
      event('beans', addDays(TODAY, -1), NOON),
    ];

    const ranked = rankSuggestions(events, {
      ...context,
      alreadyLogged: new Set(['rice']),
    });

    expect(ranked.map(item => item.foodId)).toEqual(['beans']);
  });

  it('breaks a tie by the favourite', () => {
    const events = [
      event('rice', addDays(TODAY, -1), NOON),
      event('beans', addDays(TODAY, -1), NOON),
    ];

    const ranked = rankSuggestions(events, {
      ...context,
      favorites: new Set(['beans']),
    });

    expect(ranked.map(item => item.foodId)).toEqual(['beans', 'rice']);
    expect(ranked[0].score).toBeCloseTo(ranked[1].score * 1.25, 10);
  });

  it('breaks an exact tie by the known portion, then by the use count', () => {
    const events = [
      event('rice', addDays(TODAY, -1), NOON),
      event('beans', addDays(TODAY, -1), NOON),
      event('corn', addDays(TODAY, -1), NOON),
    ];

    const ranked = rankSuggestions(events, {
      ...context,
      knownPortion: new Set(['beans']),
      useCount: new Map([
        ['corn', 9],
        ['rice', 1],
      ]),
    });

    expect(ranked.map(item => item.foodId)).toEqual(['beans', 'corn', 'rice']);
  });

  it('weighs the same meal, the same hour and the same weekday', () => {
    const sameEverything = rankSuggestions(
      [event('rice', addDays(TODAY, -7), NOON, 'lunch')],
      context,
    );
    const otherMeal = rankSuggestions(
      [event('rice', addDays(TODAY, -7), NOON, 'dinner')],
      context,
    );
    const otherHour = rankSuggestions(
      [event('rice', addDays(TODAY, -7), 21 * 60, 'lunch')],
      context,
    );

    // 0,4 (7 days) × 1 (same meal) × 1 (same hour) × 1,15 (same weekday).
    expect(sameEverything[0].score).toBeCloseTo(0.46, 10);
    expect(otherMeal[0].score).toBeCloseTo(0.46 * 0.35, 10);
    expect(otherHour[0].score).toBeCloseTo(0.46 * 0.4, 10);
  });

  it('ranks the same history differently for each meal', () => {
    // What "Hoje" does for every empty meal: one reading of the diary, one
    // ranking per meal. The target meal has to reach the score, or the chips
    // of the afternoon snack and of dinner would be the same two foods.
    const events = [
      event('rice', addDays(TODAY, -1), NOON, 'lunch'),
      event('soup', addDays(TODAY, -1), 19 * 60, 'dinner'),
    ];

    const lunch = rankSuggestions(events, context);
    const dinner = rankSuggestions(events, { ...context, meal: 'dinner' });

    expect(lunch[0].foodId).toBe('rice');
    expect(dinner[0].foodId).toBe('soup');
  });

  it('ranks the same meal differently as the clock moves', () => {
    const events = [
      event('oats', addDays(TODAY, -1), 8 * 60, 'lunch'),
      event('rice', addDays(TODAY, -1), 13 * 60, 'lunch'),
    ];

    const morning = rankSuggestions(events, {
      ...context,
      minuteOfDay: 8 * 60,
    });
    const midday = rankSuggestions(events, {
      ...context,
      minuteOfDay: 13 * 60,
    });

    expect(morning[0].foodId).toBe('oats');
    expect(midday[0].foodId).toBe('rice');
  });

  it('forgets anything older than ninety days', () => {
    const ranked = rankSuggestions(
      [event('rice', addDays(TODAY, -120), NOON)],
      context,
    );

    expect(ranked).toEqual([]);
  });

  it('keeps noise below the threshold out of the list', () => {
    // One logging, 20 days ago, in another meal and at another hour:
    // 0,2 × 0,35 × 0,4 = 0,028.
    const ranked = rankSuggestions(
      [event('soup', addDays(TODAY, -20), 20 * 60, 'dinner')],
      { ...context, meal: 'breakfast' },
    );

    expect(ranked).toEqual([]);
    expect(SUGGESTION_MIN_SCORE).toBe(0.05);
  });

  it('ranks 2.000 entries in under 30 ms', () => {
    const events: SuggestionEvent[] = [];
    for (let index = 0; index < 2000; index += 1) {
      events.push(
        event(
          `food-${index % 220}`,
          addDays(TODAY, -(index % 90)),
          (index * 7) % 1440,
          index % 2 === 0 ? 'lunch' : 'dinner',
        ),
      );
    }

    const started = Date.now();
    const ranked = rankSuggestions(events, context);
    const elapsed = Date.now() - started;

    expect(ranked.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(30);
  });
});

describe('mixWithStarters', () => {
  it('fills the rest of the list with starters it has not named yet', () => {
    const ids = mixWithStarters(
      [
        { foodId: 'rice', score: 2 },
        { foodId: 'beans', score: 1 },
      ],
      ['bread', 'rice', 'coffee', 'egg', 'milk', 'butter'],
      6,
    );

    expect(ids).toEqual(['rice', 'beans', 'bread', 'coffee', 'egg', 'milk']);
  });

  it('never goes past the limit', () => {
    expect(mixWithStarters([], ['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
  });
});

describe('pickRepeatSource', () => {
  const yesterday = { day: '2026-09-08', itemCount: 4, kcal: 612 };
  const lastWeek = { day: '2026-09-02', itemCount: 3, kcal: 500 };

  it('offers yesterday when the target meal is empty', () => {
    expect(pickRepeatSource({ targetCount: 0, yesterday, lastWeek })).toEqual({
      ...yesterday,
      kind: 'yesterday',
    });
  });

  it('offers nothing once the meal has something in it', () => {
    expect(
      pickRepeatSource({ targetCount: 1, yesterday, lastWeek }),
    ).toBeNull();
  });

  it('falls back to the same weekday of the week before', () => {
    expect(
      pickRepeatSource({
        targetCount: 0,
        yesterday: { day: '2026-09-08', itemCount: 1, kcal: 90 },
        lastWeek,
      }),
    ).toEqual({ ...lastWeek, kind: 'lastWeek' });
  });

  it('offers nothing when neither meal has two items', () => {
    expect(
      pickRepeatSource({
        targetCount: 0,
        yesterday: { day: '2026-09-08', itemCount: 1, kcal: 90 },
        lastWeek: null,
      }),
    ).toBeNull();
  });
});

describe('withoutLoggedDuplicates', () => {
  const chips = [
    { name: 'Banana, prata, crua' },
    { name: 'Pão, trigo, francês' },
  ];

  it('drops the chip that names what the meal already shows', () => {
    // Two sources, two ids, one food on screen: the id filter upstream never
    // catches this one.
    expect(withoutLoggedDuplicates(chips, ['Banana'])).toEqual([
      { name: 'Pão, trigo, francês' },
    ]);
  });

  it('compares without accent or case, like the search does', () => {
    expect(withoutLoggedDuplicates(chips, ['pao, forma'])).toEqual([
      { name: 'Banana, prata, crua' },
    ]);
  });

  it('keeps a food the meal does not have', () => {
    expect(withoutLoggedDuplicates(chips, ['Arroz, tipo 1, cozido'])).toEqual(
      chips,
    );
  });

  it('keeps everything when nothing is logged', () => {
    expect(withoutLoggedDuplicates(chips, [])).toEqual(chips);
  });
});
