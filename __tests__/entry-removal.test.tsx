import React from 'react';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import type { DiaryEntryView } from '../src/data/diary/DiaryRepository';
import {
  useEntryRemoval,
  type EntryRemoval,
} from '../src/features/diary/hooks/useEntryRemoval';
import { setLanguage } from '../src/i18n';

const mockRemoveEntry = jest.fn<Promise<void>, [string]>();
const mockRestoreEntry = jest.fn<Promise<void>, [DiaryEntryView]>();

jest.mock('../src/data/diary/DiaryRepository', () => ({
  diaryRepository: {
    removeEntry: (id: string) => mockRemoveEntry(id),
    restoreEntry: (entry: DiaryEntryView) => mockRestoreEntry(entry),
  },
}));

const arroz: DiaryEntryView = {
  id: 'e_1',
  day: '2026-09-08',
  meal: 'lunch',
  foodId: 'taco:3',
  grams: 25,
  servingLabel: 'colher de sopa cheia',
  servingCount: 1,
  kcal: 32,
  protein: 0.6,
  carbs: 7,
  fat: 0.1,
  position: 4,
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:00:00.000Z',
  foodName: 'Arroz, tipo 1, cozido',
  per100: {},
};

let removal: EntryRemoval;
let renderer: Renderer | null = null;

function Probe() {
  removal = useEntryRemoval();
  return null;
}

function mount(): void {
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<Probe />);
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

/** A promise this test decides when to resolve. */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  // The snackbar countdown is a live timer: unmounting clears it, so it
  // cannot fire into a torn-down tree after the test is over.
  if (renderer) ReactTestRenderer.act(() => renderer?.unmount());
  renderer = null;
});

beforeEach(() => {
  setLanguage('pt-BR');
  mockRemoveEntry.mockReset();
  mockRestoreEntry.mockReset();
  mockRemoveEntry.mockResolvedValue(undefined);
  mockRestoreEntry.mockResolvedValue(undefined);
});

describe('useEntryRemoval', () => {
  test('announces the removal with "Desfazer"', () => {
    mount();
    ReactTestRenderer.act(() => {
      removal.remove(arroz);
    });
    expect(mockRemoveEntry).toHaveBeenCalledWith('e_1');
    expect(removal.snackbar).toEqual({
      food: 'Arroz, tipo 1, cozido',
      meal: 'Almoço',
      kind: 'removed',
    });
  });

  test('waits for the delete to land before restoring', async () => {
    const write = deferred();
    mockRemoveEntry.mockReturnValue(write.promise);
    mount();
    ReactTestRenderer.act(() => {
      removal.remove(arroz);
    });
    ReactTestRenderer.act(() => {
      removal.undo();
    });
    // The delete is still open, so nothing may be written back yet: an
    // INSERT committing first would be erased by the DELETE behind it.
    await settle();
    expect(mockRestoreEntry).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      write.resolve();
    });
    await settle();
    expect(mockRestoreEntry).toHaveBeenCalledWith(arroz);
    expect(removal.snackbar).toBeNull();
  });

  test('still restores when the delete failed', async () => {
    mockRemoveEntry.mockRejectedValue(new Error('locked'));
    mount();
    ReactTestRenderer.act(() => {
      removal.remove(arroz);
    });
    await settle();
    ReactTestRenderer.act(() => {
      removal.undo();
    });
    await settle();
    expect(mockRestoreEntry).toHaveBeenCalledWith(arroz);
  });

  test('does nothing when there is nothing to undo', async () => {
    mount();
    ReactTestRenderer.act(() => {
      removal.undo();
    });
    await settle();
    expect(mockRestoreEntry).not.toHaveBeenCalled();
  });
});
