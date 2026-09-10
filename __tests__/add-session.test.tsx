import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import type { DiaryEntryView } from '../src/data/diary/DiaryRepository';
import type { NormalizedFood } from '../src/domain/food/NormalizedFood';
import { REFERENCE_SERVING } from '../src/domain/food/NormalizedFood';
import {
  useAddSession,
  type AddSession,
} from '../src/features/add-food/hooks/useAddSession';
import { setLanguage } from '../src/i18n';

const mockAddEntry = jest.fn<Promise<DiaryEntryView>, [unknown]>();
const mockRemoveEntry = jest.fn<Promise<void>, [string]>();

jest.mock('../src/data/diary/DiaryRepository', () => ({
  diaryRepository: {
    addEntry: (input: unknown) => mockAddEntry(input),
    removeEntry: (id: string) => mockRemoveEntry(id),
  },
}));

const pao: NormalizedFood = {
  id: 'taco:1',
  source: 'taco',
  sourceId: '1',
  name: { pt: 'Pão, trigo, francês' },
  verified: true,
  per100g: {
    kcal: 300,
    protein_g: 8,
    carbs_g: 58.6,
    fat_g: 3.1,
    energySource: 'declared',
  },
  servings: [{ ...REFERENCE_SERVING, isDefault: true }],
  completeness: 1,
  lastFetchedAt: '2025-01-01',
  attribution: { license: 'TACO', text: 'TACO' },
};

const entry: DiaryEntryView = {
  id: 'e_1',
  day: '2026-09-08',
  meal: 'breakfast',
  foodId: pao.id,
  grams: 100,
  kcal: 300,
  protein: 8,
  carbs: 58.6,
  fat: 3.1,
  position: 1,
  createdAt: '2026-09-08T12:00:00.000Z',
  updatedAt: '2026-09-08T12:00:00.000Z',
  foodName: 'Pão, trigo, francês',
  per100: {},
};

let session: AddSession;
let mounted: Renderer | undefined;

function Harness() {
  session = useAddSession('2026-09-08', 'breakfast');
  return null;
}

function mount(): Renderer {
  let renderer: Renderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  if (!renderer) throw new Error('Harness did not render');
  mounted = renderer;
  return renderer;
}

/** A write the test finishes by hand, to act between the tap and the row. */
function deferredWrite() {
  let finish: (value: DiaryEntryView) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<DiaryEntryView>((resolve, fail) => {
    finish = resolve;
    reject = fail;
  });
  return { promise, finish, reject };
}

async function settle(): Promise<void> {
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const addListener = AccessibilityInfo.addEventListener as jest.Mock;
const recommendedTimeout =
  AccessibilityInfo.getRecommendedTimeoutMillis as jest.Mock;

/** The handler the mounted session registered for an AccessibilityInfo event. */
function accessibilityListener(event: string): (enabled: boolean) => void {
  const calls = addListener.mock.calls.filter(([name]) => name === event);
  const last = calls[calls.length - 1];
  if (!last) throw new Error(`No listener for ${event}`);
  return last[1];
}

function advance(ms: number): void {
  ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  setLanguage('pt-BR');
  mockAddEntry.mockReset();
  mockRemoveEntry.mockReset();
  mockRemoveEntry.mockResolvedValue(undefined);
  addListener.mockClear();
  recommendedTimeout.mockReset();
  recommendedTimeout.mockResolvedValue(false);
});

afterEach(() => {
  ReactTestRenderer.act(() => {
    mounted?.unmount();
  });
  mounted = undefined;
  jest.useRealTimers();
});

describe('useAddSession', () => {
  test('raises the snackbar with the tap, before the write lands', () => {
    const write = deferredWrite();
    mockAddEntry.mockReturnValue(write.promise);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    expect(session.snackbar).toMatchObject({
      food: 'Pão, trigo, francês',
      meal: 'Café da manhã',
    });
    expect(session.itemCount).toBe(0);
  });

  test('the snackbar leaves by itself after 4 s', async () => {
    mockAddEntry.mockResolvedValue(entry);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    await settle();
    expect(session.snackbar).not.toBeNull();
    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(session.snackbar).toBeNull();
    expect(session.itemCount).toBe(1);
  });

  test('the ✓ and the tray wait for the write', async () => {
    const write = deferredWrite();
    mockAddEntry.mockReturnValue(write.promise);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    write.finish(entry);
    await settle();
    expect(session.added.get(pao.id)).toEqual({
      entryId: 'e_1',
      kcal: 300,
      name: 'Pão, trigo, francês',
      // The written row travels with the item: the "✓" line and the tray
      // print the portion that was actually saved, not the default one.
      entry,
    });
    expect(session.itemCount).toBe(1);
    expect(session.kcal).toBe(300);
  });

  test('"Desfazer" pressed before the write lands still removes the entry', async () => {
    const write = deferredWrite();
    mockAddEntry.mockReturnValue(write.promise);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    ReactTestRenderer.act(() => {
      session.undo();
    });
    expect(session.snackbar).toBeNull();
    expect(mockRemoveEntry).not.toHaveBeenCalled();
    write.finish(entry);
    await settle();
    expect(mockRemoveEntry).toHaveBeenCalledWith('e_1');
    expect(session.added.has(pao.id)).toBe(false);
    expect(session.itemCount).toBe(0);
  });

  test('"Desfazer" before the write lands never flashes the ✓ nor announces the addition', async () => {
    const write = deferredWrite();
    mockAddEntry.mockReturnValue(write.promise);
    const announce = AccessibilityInfo.announceForAccessibility as jest.Mock;
    announce.mockClear();
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    ReactTestRenderer.act(() => {
      session.undo();
    });
    write.finish(entry);
    await settle();
    const said = announce.mock.calls.map(([text]) => String(text));
    expect(said.some(text => text.includes('adicionado'))).toBe(false);
    expect(said).toContain('Pão, trigo, francês removido');
    expect(session.added.has(pao.id)).toBe(false);
  });

  test('a food added again after an undo gets its ✓ back', async () => {
    const first = deferredWrite();
    mockAddEntry.mockReturnValueOnce(first.promise);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    ReactTestRenderer.act(() => {
      session.undo();
    });
    first.finish(entry);
    await settle();
    mockAddEntry.mockResolvedValue({ ...entry, id: 'e_2' });
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    await settle();
    expect(session.added.get(pao.id)?.entryId).toBe('e_2');
    expect(session.itemCount).toBe(1);
  });

  test('a tap between the write and the re-render writes nothing', async () => {
    const write = deferredWrite();
    mockAddEntry.mockReturnValue(write.promise);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    write.finish(entry);
    // The write has landed and the in-flight guard is gone, but React has not
    // painted the ✓ yet — the frames a fast double tap lands in.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    session.add(pao);
    expect(mockAddEntry).toHaveBeenCalledTimes(1);
    error.mockRestore();
    await settle();
    expect(session.itemCount).toBe(1);
  });

  test('a second tap on the same food writes nothing', () => {
    const write = deferredWrite();
    mockAddEntry.mockReturnValue(write.promise);
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
      session.add(pao);
    });
    expect(mockAddEntry).toHaveBeenCalledTimes(1);
  });

  test('only the screen reader listener is registered; nothing restarts the countdown', () => {
    mount();
    const events = addListener.mock.calls.map(([name]) => name);
    expect(events).toEqual(['screenReaderChanged']);
  });

  test('with a screen reader on, the snackbar stays 10 s and still expires', async () => {
    mockAddEntry.mockResolvedValue(entry);
    mount();
    ReactTestRenderer.act(() => {
      accessibilityListener('screenReaderChanged')(true);
    });
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    await settle();
    advance(9999);
    expect(session.snackbar).not.toBeNull();
    advance(1);
    expect(session.snackbar).toBeNull();
    expect(session.itemCount).toBe(1);
  });

  test('turning the screen reader off falls back to the 4 s', async () => {
    mockAddEntry.mockResolvedValue(entry);
    mount();
    ReactTestRenderer.act(() => {
      accessibilityListener('screenReaderChanged')(true);
    });
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    await settle();
    advance(5000);
    expect(session.snackbar).not.toBeNull();
    ReactTestRenderer.act(() => {
      accessibilityListener('screenReaderChanged')(false);
    });
    advance(3999);
    expect(session.snackbar).not.toBeNull();
    advance(1);
    expect(session.snackbar).toBeNull();
  });

  test('a failed write cancels its countdown, so a later snackbar keeps its own', async () => {
    const failing = deferredWrite();
    mockAddEntry.mockReturnValueOnce(failing.promise);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    advance(3000);
    // The write fails after the snackbar has been up for 3 s.
    failing.reject(new Error('disk full'));
    await settle();
    expect(session.snackbar).toBeNull();
    // A second food, added right after, gets its whole 4 s.
    const arroz = {
      ...pao,
      id: 'taco:2',
      name: { pt: 'Arroz, tipo 1, cozido' },
    };
    mockAddEntry.mockResolvedValue({ ...entry, id: 'e_2', foodId: arroz.id });
    ReactTestRenderer.act(() => {
      session.add(arroz);
    });
    await settle();
    advance(1500);
    expect(session.snackbar).toMatchObject({ food: 'Arroz, tipo 1, cozido' });
    advance(2500);
    expect(session.snackbar).toBeNull();
    warn.mockRestore();
  });

  test('Android stretches the 4 s to the system "Time to take action"', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'android');
    recommendedTimeout.mockResolvedValue(10_000);
    try {
      mockAddEntry.mockResolvedValue(entry);
      mount();
      ReactTestRenderer.act(() => {
        session.add(pao);
      });
      await settle();
      expect(recommendedTimeout).toHaveBeenCalledWith(4000);
      advance(4000);
      expect(session.snackbar).not.toBeNull();
      advance(6000);
      expect(session.snackbar).toBeNull();
    } finally {
      os.restore();
    }
  });

  test('a failed write takes its snackbar down', async () => {
    mockAddEntry.mockRejectedValue(new Error('disk full'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mount();
    ReactTestRenderer.act(() => {
      session.add(pao);
    });
    expect(session.snackbar).not.toBeNull();
    await settle();
    expect(session.snackbar).toBeNull();
    expect(session.itemCount).toBe(0);
    warn.mockRestore();
  });
});
