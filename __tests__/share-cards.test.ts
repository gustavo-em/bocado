import type { Meal } from '../src/domain/diary/Meal';
import {
  MEALS_HEIGHT,
  MEAL_ENTRY_HEIGHT,
  MEAL_GAP,
  MEAL_HEADER_HEIGHT,
  buildDayCard,
  fitText,
} from '../src/domain/share/dayCard';
import { buildMonthCard, macroShare } from '../src/domain/share/monthCard';
import { buildShareDay } from '../src/domain/share/shareDay';
import { ptBR } from '../src/i18n/pt-BR';
import { enUS } from '../src/i18n/en-US';

function entries(meal: Meal, count: number, from = 10) {
  return Array.from({ length: count }, (_, index) => ({
    meal,
    name: `Alimento ${index + 1}`,
    grams: 100,
    kcal: from + index,
  }));
}

function shareDay(rows: ReturnType<typeof entries>) {
  const kcal = rows.reduce((sum, row) => sum + row.kcal, 0);
  return buildShareDay(
    '2026-09-09',
    rows,
    { kcal, protein: 10, carbs: 20, fat: 5 },
    1240,
  );
}

function drawnHeight(blocks: ReturnType<typeof buildDayCard>['blocks']) {
  if (blocks.length === 0) return 0;
  return (
    blocks.reduce(
      (sum, block) =>
        sum +
        MEAL_HEADER_HEIGHT +
        (block.entries.length + (block.hidden > 0 ? 1 : 0)) * MEAL_ENTRY_HEIGHT,
      0,
    ) +
    MEAL_GAP * (blocks.length - 1)
  );
}

describe('buildDayCard', () => {
  it('keeps a day that fits exactly as it was logged', () => {
    const card = buildDayCard(shareDay(entries('breakfast', 3)));
    expect(card.blocks).toHaveLength(1);
    expect(card.blocks[0].entries).toHaveLength(3);
    expect(card.blocks[0].hidden).toBe(0);
    expect(card.empty).toBe(false);
  });

  it('says the day is empty rather than drawing nothing', () => {
    const card = buildDayCard(shareDay([]));
    expect(card.empty).toBe(true);
    expect(card.blocks).toHaveLength(0);
  });

  it('fits a long day inside the piece and counts what it left out', () => {
    const card = buildDayCard(
      shareDay([
        ...entries('breakfast', 8, 100),
        ...entries('lunch', 9, 200),
        ...entries('afternoon_snack', 7, 50),
        ...entries('dinner', 8, 300),
      ]),
    );
    expect(drawnHeight(card.blocks)).toBeLessThanOrEqual(MEALS_HEIGHT);
    const hidden = card.blocks.reduce((sum, block) => sum + block.hidden, 0);
    expect(hidden).toBeGreaterThan(0);
    // Every meal keeps its two entries: a big lunch cannot erase breakfast.
    for (const block of card.blocks) {
      expect(block.entries.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('drops the quietest entries first', () => {
    const card = buildDayCard(
      shareDay([
        ...entries('breakfast', 12, 500),
        ...entries('lunch', 12, 500),
        ...entries('afternoon_snack', 12, 500),
        ...entries('dinner', 12, 500),
      ]),
    );
    for (const block of card.blocks) {
      const kept = block.entries.map(entry => entry.kcal);
      expect(Math.min(...kept)).toBeGreaterThan(500);
    }
  });
});

describe('fitText', () => {
  it('leaves a name that fits untouched', () => {
    expect(fitText('Café', 952, 28)).toBe('Café');
  });

  it('cuts a name that would run past the margin and marks the cut', () => {
    const long = 'Maçã, Fuji, com casca, crua'.repeat(10);
    const fitted = fitText(long, 952, 28);
    expect(fitted.endsWith('…')).toBe(true);
    expect(fitted.length).toBeLessThan(long.length);
  });
});

describe('buildMonthCard', () => {
  it('draws six rows of seven even for an empty month', () => {
    const month = buildMonthCard('2026-09-01', {});
    expect(month.cells).toHaveLength(42);
    expect(month.empty).toBe(true);
    expect(month.average).toBeNull();
    expect(month.loggedDays).toBe(0);
    expect(month.total).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('counts only the days of this month that have something in them', () => {
    const month = buildMonthCard('2026-09-01', {
      '2026-09-09': { kcal: 1000, protein: 50, carbs: 100, fat: 30 },
      '2026-09-10': { kcal: 2000, protein: 100, carbs: 200, fat: 60 },
      // August belongs to a neighbouring month: it is not in the grid.
      '2026-08-31': { kcal: 900, protein: 40, carbs: 90, fat: 20 },
    });
    expect(month.loggedDays).toBe(2);
    expect(month.total.kcal).toBe(3000);
    expect(month.average).toEqual({
      kcal: 1500,
      protein: 75,
      carbs: 150,
      fat: 45,
    });
    const ninth = month.cells.find(cell => cell.day === '2026-09-09');
    expect(ninth?.kcal).toBe(1000);
    expect(ninth?.dayOfMonth).toBe(9);
  });

  it('counts a day of black coffee as logged, not as an empty day', () => {
    const month = buildMonthCard('2026-09-01', {
      '2026-09-09': { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    });
    const ninth = month.cells.find(cell => cell.day === '2026-09-09');
    expect(ninth?.logged).toBe(true);
    expect(ninth?.kcal).toBe(0);
    expect(month.loggedDays).toBe(1);
    expect(month.empty).toBe(false);
    expect(month.average).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('leaves a day with no entries out of the count', () => {
    const month = buildMonthCard('2026-09-01', {
      '2026-09-09': { kcal: 500, protein: 20, carbs: 60, fat: 10 },
    });
    const tenth = month.cells.find(cell => cell.day === '2026-09-10');
    expect(tenth?.logged).toBe(false);
    expect(month.loggedDays).toBe(1);
  });

  it('splits the bar by energy, not by grams', () => {
    const share = macroShare({ kcal: 0, protein: 25, carbs: 25, fat: 25 });
    expect(share.protein).toBeCloseTo(0.2353, 3);
    expect(share.carbs).toBeCloseTo(0.2353, 3);
    expect(share.fat).toBeCloseTo(0.5294, 3);
    expect(share.protein + share.carbs + share.fat).toBeCloseTo(1, 6);
  });

  it('has a singular form for a single logged day, in both languages', () => {
    // The month piece leaves the phone, so this copy is read by other people:
    // "1 dias registrados" would go out to them.
    expect(ptBR.share.monthTotalOne).toBe('{kcal} kcal em 1 dia registrado');
    expect(ptBR.share.monthTotal).toBe(
      '{kcal} kcal em {days} dias registrados',
    );
    expect(enUS.share.monthTotalOne).toBe('{kcal} kcal over 1 logged day');
    expect(enUS.share.monthTotal).toBe('{kcal} kcal over {days} logged days');
  });

  it('has no bar to draw on a day with no macros', () => {
    expect(macroShare({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});
