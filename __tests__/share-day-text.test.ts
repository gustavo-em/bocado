import { buildDayText } from '../src/domain/share/dayText';
import { buildShareDay } from '../src/domain/share/shareDay';
import type { Meal } from '../src/domain/diary/Meal';
import { setLanguage } from '../src/i18n';

const GOAL_KCAL = 1240;

interface RawEntry {
  meal: Meal;
  name: string;
  grams: number;
  kcal: number;
  servingLabel?: string;
  servingCount?: number;
}

function day(entries: RawEntry[], dayKey = '2026-09-09') {
  const totals = entries.reduce(
    (sum, entry) => ({
      kcal: sum.kcal + entry.kcal,
      protein: sum.protein + entry.kcal * 0.01,
      carbs: sum.carbs + entry.kcal * 0.26,
      fat: sum.fat + entry.kcal * 0.001,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return buildShareDay(dayKey, entries, totals, GOAL_KCAL);
}

describe('buildDayText', () => {
  beforeEach(() => setLanguage('pt-BR'));
  afterAll(() => setLanguage('pt-BR'));

  it('says the day is empty instead of returning a blank message', () => {
    const text = buildDayText(day([]));
    expect(text).toBe(
      'Bocado · quarta-feira, 9 de setembro\nNada registrado neste dia.',
    );
  });

  it('keeps accents and puts one fact on each line', () => {
    const text = buildDayText(
      day([
        { meal: 'breakfast', name: 'Café', grams: 100, kcal: 1 },
        {
          meal: 'breakfast',
          name: 'Banana, prata, crua',
          grams: 100,
          kcal: 98,
        },
        { meal: 'lunch', name: 'Arroz, tipo 1, cozido', grams: 150, kcal: 192 },
      ]),
    );
    expect(text).toBe(
      [
        'Bocado · quarta-feira, 9 de setembro',
        '291 de 1.240 kcal',
        'P 3 g · C 76 g · G 0 g',
        '',
        'Café da manhã · 99 kcal',
        '• Café · 100 g · 1 kcal',
        '• Banana, prata, crua · 100 g · 98 kcal',
        '',
        'Almoço · 192 kcal',
        '• Arroz, tipo 1, cozido · 150 g · 192 kcal',
      ].join('\n'),
    );
  });

  it('never cuts a long food name and never wraps it by itself', () => {
    const name =
      'Maçã, Fuji, com casca, crua, cortada em cubos e servida com iogurte';
    const text = buildDayText(
      day([{ meal: 'afternoon_snack', name, grams: 220.5, kcal: 156 }]),
    );
    const entryLine = text.split('\n').at(-1);
    expect(entryLine).toBe(`• ${name} · 220,5 g · 156 kcal`);
    expect(text).not.toContain('…');
    // Plain text only: no emoji, no table drawing, nothing monospaced.
    expect(text).not.toMatch(/[|+\-]{3,}/);
  });

  it('names the measure when the portion was not typed in grams', () => {
    const text = buildDayText(
      day([
        {
          meal: 'dinner',
          name: 'Arroz, tipo 1, cozido',
          grams: 150,
          kcal: 192,
          servingLabel: 'colher de servir cheia',
          servingCount: 2,
        },
      ]),
    );
    expect(text).toContain(
      '• Arroz, tipo 1, cozido · 2 colher de servir cheia · 150 g · 192 kcal',
    );
  });

  it('leaves meals with nothing in them out of the message', () => {
    const text = buildDayText(
      day([{ meal: 'dinner', name: 'Sopa', grams: 300, kcal: 210 }]),
    );
    expect(text).toContain('Jantar');
    expect(text).not.toContain('Café da manhã');
    expect(text).not.toContain('Almoço');
  });

  it('translates the whole message', () => {
    setLanguage('en-US');
    const text = buildDayText(
      day([{ meal: 'lunch', name: 'Rice', grams: 100, kcal: 128 }]),
    );
    expect(text).toContain('Bocado · Wednesday, September 9');
    expect(text).toContain('128 of 1,240 kcal');
    expect(text).toContain('Lunch · 128 kcal');
  });
});
