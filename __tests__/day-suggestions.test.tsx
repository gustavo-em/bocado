import React from 'react';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { MEALS, type Meal } from '../src/domain/diary/Meal';
import { dayKeyFromDate, type DayKey } from '../src/domain/diary/days';
import { buildQuickFood } from '../src/domain/food/quickLog';
import {
  useDaySuggestions,
  type DaySuggestions,
} from '../src/features/diary/hooks/useDaySuggestions';
import {
  useQuickLog,
  type QuickLog,
} from '../src/features/diary/hooks/useQuickLog';
import { setLanguage } from '../src/i18n';

/** A day the user is filling in after the fact — never the current date. */
const PAST_DAY: DayKey = '2026-06-15';

interface AddEntryArgs {
  day: DayKey;
  meal: Meal;
}

const mockAddEntry = jest.fn<
  Promise<{ id: string; kcal: number }>,
  [AddEntryArgs]
>();
const mockSubscribe = jest.fn<() => void, [() => void]>();

jest.mock('../src/data/diary/DiaryRepository', () => ({
  diaryRepository: {
    addEntry: (args: AddEntryArgs) => mockAddEntry(args),
    removeEntries: () => Promise.resolve(),
    copyMealEntries: () => Promise.resolve([]),
    subscribe: (listener: () => void) => mockSubscribe(listener),
  },
}));

const mockLoadDaySuggestions = jest.fn<Promise<unknown>, [DayKey]>();

jest.mock('../src/features/suggestions/suggestionsService', () => ({
  EMPTY_MEAL_CHIPS: 3,
  loadDaySuggestions: (day: DayKey) => mockLoadDaySuggestions(day),
  buildMealSuggestions: (_data: unknown, options: { meal: Meal }) =>
    Promise.resolve({
      items: [{ food: { id: `food:${options.meal}` } }],
      repeat: null,
    }),
}));

const food = buildQuickFood(
  {
    kcal: 300,
    name: 'Pastel da feira',
    id: 'x',
    fetchedAt: '2026-06-15T12:00:00.000Z',
  },
  'Registro rápido',
);

let renderer: Renderer | null = null;

function mount(element: React.ReactElement): void {
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
}

/** Lets every already-resolved promise run its continuations. */
async function settle(): Promise<void> {
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  setLanguage('pt-BR');
  mockAddEntry.mockReset();
  mockAddEntry.mockResolvedValue({ id: 'e_1', kcal: 300 });
  mockSubscribe.mockReset();
  mockSubscribe.mockReturnValue(() => undefined);
  mockLoadDaySuggestions.mockReset();
  mockLoadDaySuggestions.mockResolvedValue({});
});

afterEach(() => {
  // The snackbar countdown is a live timer: unmounting clears it.
  if (renderer) ReactTestRenderer.act(() => renderer?.unmount());
  renderer = null;
});

describe('a suggestion tapped on a day that is not today', () => {
  test('writes into the day on screen, never into today', async () => {
    let quick: QuickLog | undefined;
    function Probe() {
      quick = useQuickLog(PAST_DAY);
      return null;
    }
    mount(<Probe />);

    ReactTestRenderer.act(() => {
      quick?.log(food, null, 'dinner');
    });
    await settle();

    expect(mockAddEntry).toHaveBeenCalledTimes(1);
    const written = mockAddEntry.mock.calls[0][0];
    expect(written.day).toBe(PAST_DAY);
    expect(written.meal).toBe('dinner');
    expect(written.day).not.toBe(dayKeyFromDate(new Date()));
  });
});

describe('useDaySuggestions', () => {
  test('reads the chips of the day on screen, today or not', async () => {
    let chips: DaySuggestions = {};
    function Probe() {
      chips = useDaySuggestions(PAST_DAY);
      return null;
    }
    mount(<Probe />);
    await settle();

    expect(mockLoadDaySuggestions).toHaveBeenCalledWith(PAST_DAY);
    expect(mockLoadDaySuggestions).not.toHaveBeenCalledWith(
      dayKeyFromDate(new Date()),
    );
    for (const meal of MEALS) {
      expect(chips[meal]?.items).toHaveLength(1);
    }
  });
});
