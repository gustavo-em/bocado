import React from 'react';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import type { NormalizedFood } from '../src/domain/food/NormalizedFood';
import { REFERENCE_SERVING } from '../src/domain/food/NormalizedFood';
import {
  useFoodSearch,
  type FoodSearch,
} from '../src/features/add-food/hooks/useFoodSearch';
import { setLanguage } from '../src/i18n';

const mockSearch = jest.fn<Promise<NormalizedFood[]>, [string, unknown]>();
const mockGetByIds = jest.fn<Promise<NormalizedFood[]>, [string[]]>();

jest.mock('../src/data/providers/LocalFoodProvider', () => ({
  localFoodProvider: {
    search: (query: string, options: unknown) => mockSearch(query, options),
    getByIds: (ids: string[]) => mockGetByIds(ids),
  },
}));

jest.mock('../src/data/seed/importSeed', () => ({
  importSeedIfNeeded: () => Promise.resolve(),
}));

jest.mock('../src/data/seed/starters', () => ({
  getStarters: () => Promise.resolve(['taco:1', 'taco:2']),
}));

function food(id: string, name: string): NormalizedFood {
  return {
    id,
    source: 'taco',
    sourceId: id.split(':')[1] ?? id,
    name: { pt: name },
    verified: true,
    per100g: {
      kcal: 128,
      protein_g: 2.5,
      carbs_g: 28.1,
      fat_g: 0.2,
      energySource: 'declared',
    },
    servings: [{ ...REFERENCE_SERVING, isDefault: true }],
    completeness: 1,
    lastFetchedAt: '2025-01-01',
    attribution: { license: 'TACO', text: 'TACO' },
  };
}

const starters = [food('taco:1', 'Ovo de galinha'), food('taco:2', 'Banana')];
const arroz = [food('taco:9', 'Arroz, tipo 1, cozido')];

let search: FoodSearch;
let mounted: Renderer | undefined;

function Harness() {
  search = useFoodSearch('lunch');
  return null;
}

async function settle(): Promise<void> {
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mount(): Promise<void> {
  ReactTestRenderer.act(() => {
    mounted = ReactTestRenderer.create(<Harness />);
  });
  await settle();
}

/** A search the test answers by hand, to look at the list mid-flight. */
function deferredSearch() {
  let finish: (foods: NormalizedFood[]) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<NormalizedFood[]>((resolve, fail) => {
    finish = resolve;
    reject = fail;
  });
  return { promise, finish, reject };
}

function type(text: string): void {
  ReactTestRenderer.act(() => {
    search.setQuery(text);
  });
  ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(150);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  setLanguage('pt-BR');
  mockSearch.mockReset();
  mockGetByIds.mockReset();
  mockGetByIds.mockResolvedValue(starters);
});

afterEach(() => {
  ReactTestRenderer.act(() => {
    mounted?.unmount();
  });
  mounted = undefined;
  jest.useRealTimers();
});

describe('useFoodSearch', () => {
  test('keeps the suggestions on screen until the first answer arrives', async () => {
    const pending = deferredSearch();
    mockSearch.mockReturnValue(pending.promise);
    await mount();
    expect(search.status).toBe('suggestions');
    type('a');
    // The debounce has elapsed and the query is out, but nothing came back yet.
    expect(search.status).toBe('suggestions');
    expect(search.foods).toEqual(starters);
    pending.finish(arroz);
    await settle();
    expect(search.status).toBe('results');
    expect(search.foods).toEqual(arroz);
  });

  test('a failed first search leaves the suggestions up, never a blank list', async () => {
    const failing = deferredSearch();
    mockSearch.mockReturnValue(failing.promise);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await mount();
    type('arroz');
    failing.reject(new Error('database is locked'));
    await settle();
    expect(search.status).toBe('suggestions');
    expect(search.foods).toEqual(starters);
    warn.mockRestore();
  });

  test('names nothing found only for the answered term', async () => {
    mockSearch.mockResolvedValue([]);
    await mount();
    type('xyzq');
    await settle();
    expect(search.status).toBe('empty');
    expect(search.emptyQuery).toBe('xyzq');
    expect(search.foods).toEqual([]);
  });

  test('clearing the field goes back to the suggestions', async () => {
    mockSearch.mockResolvedValue(arroz);
    await mount();
    type('arroz');
    await settle();
    expect(search.status).toBe('results');
    ReactTestRenderer.act(() => {
      search.clear();
    });
    expect(search.status).toBe('suggestions');
    expect(search.foods).toEqual(starters);
  });
});
