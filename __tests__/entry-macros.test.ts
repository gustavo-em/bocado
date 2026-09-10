import {
  DIARY_ENTRY_ROW_HEIGHT,
  entryMacroCells,
  entryMacrosSpeech,
  portionLine,
  portionParts,
} from '../src/components/DiaryEntryRow';
import type { DiaryEntryView } from '../src/data/diary/DiaryRepository';
import { QUICK_PREFIX } from '../src/domain/food/quickLog';
import { setLanguage } from '../src/i18n';

const arroz: DiaryEntryView = {
  id: 'e_1',
  day: '2026-09-08',
  meal: 'lunch',
  foodId: 'taco:3',
  grams: 45,
  servingLabel: 'colher de servir cheia',
  servingCount: 1,
  kcal: 58,
  protein: 1.9,
  carbs: 21,
  fat: 0.2,
  position: 0,
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:00:00.000Z',
  foodName: 'Arroz, tipo 1, cozido',
  per100: {},
};

/*
  The macros are printed again, on the portion's line and abbreviated. The
  spoken ones did not change with them: these cases hold the two apart — full
  words and decimals in the audio, initials and whole grams in the pixels.
*/
describe('the macros a diary entry speaks', () => {
  afterEach(() => setLanguage('pt-BR'));

  it('reads the three macros in full, one decimal at most', () => {
    setLanguage('pt-BR');
    expect(entryMacrosSpeech(arroz)).toBe(
      'proteína 1,9 gramas, carboidratos 21 gramas, gorduras 0,2 gramas',
    );
  });

  it('speaks them in English too', () => {
    setLanguage('en-US');
    expect(entryMacrosSpeech(arroz)).toBe(
      'protein 1.9 grams, carbs 21 grams, fat 0.2 grams',
    );
  });

  it('drops a macro the source never stated instead of saying a zero', () => {
    setLanguage('pt-BR');
    expect(
      entryMacrosSpeech({ ...arroz, carbs: undefined as unknown as number }),
    ).toBe('proteína 1,9 gramas, gorduras 0,2 gramas');
  });

  it('has nothing to say about a quick entry', () => {
    expect(
      entryMacrosSpeech({ ...arroz, foodId: `${QUICK_PREFIX}1` }),
    ).toBeNull();
  });

  it('rides on a row of two lines, 64 dp tall', () => {
    expect(DIARY_ENTRY_ROW_HEIGHT).toBe(64);
  });
});

/*
  The line may overflow (household measure at 1,3×), and the split is what
  decides who loses characters. These cases hold the boundary: everything that
  is a number stays out of the shrinking Text.
*/
describe('the portion, split where the line may break', () => {
  it('keeps the grams out of the part that can be ellipsised', () => {
    expect(portionParts(arroz)).toEqual({
      measure: '1 colher de servir cheia',
      amount: '45 g',
    });
  });

  it('has no measure to shrink when the portion was typed in grams', () => {
    expect(
      portionParts({
        ...arroz,
        servingLabel: undefined,
        servingCount: undefined,
      }),
    ).toEqual({ measure: null, amount: '45 g' });
  });

  it('shows a quick entry as the calories that were typed, alone', () => {
    expect(portionParts({ ...arroz, foodId: `${QUICK_PREFIX}1` })).toEqual({
      measure: null,
      amount: '58 kcal',
    });
  });

  it('says the same as the line a screen reader hears', () => {
    const { measure, amount } = portionParts(arroz);
    expect(`${measure} · ${amount}`).toBe(portionLine(arroz));
  });
});

describe('the macros a diary entry prints', () => {
  afterEach(() => setLanguage('pt-BR'));

  it('abbreviates the three to whole grams, with no unit of its own', () => {
    setLanguage('pt-BR');
    expect(entryMacroCells(arroz)).toEqual([
      { key: 'protein', label: 'P', value: '2' },
      { key: 'carbs', label: 'C', value: '21' },
      { key: 'fat', label: 'G', value: '0' },
    ]);
  });

  it('prints them in English too, where fat is an F', () => {
    setLanguage('en-US');
    expect(entryMacroCells(arroz)?.map(cell => cell.label)).toEqual([
      'P',
      'C',
      'F',
    ]);
  });

  it('empties the cell of a macro the source never stated, keeping it', () => {
    setLanguage('pt-BR');
    expect(
      entryMacroCells({ ...arroz, carbs: undefined as unknown as number }),
    ).toEqual([
      { key: 'protein', label: 'P', value: '2' },
      { key: 'carbs', label: 'C', value: null },
      { key: 'fat', label: 'G', value: '0' },
    ]);
  });

  it('rounds a macro the sheet shows as 0,2 down to a printed 0', () => {
    setLanguage('pt-BR');
    expect(entryMacroCells({ ...arroz, protein: 0.2 })?.[0]?.value).toBe('0');
  });

  it('has nothing to print for a quick entry', () => {
    expect(
      entryMacroCells({ ...arroz, foodId: `${QUICK_PREFIX}1` }),
    ).toBeNull();
  });

  it('has no block at all when the source stated no macro', () => {
    const unknown = undefined as unknown as number;
    expect(
      entryMacroCells({
        ...arroz,
        protein: unknown,
        carbs: unknown,
        fat: unknown,
      }),
    ).toBeNull();
  });
});
