import React from 'react';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import App from '../src/app/App';
import { prefs } from '../src/data/prefs/prefs';
import { DEFAULT_GOAL } from '../src/domain/diary/Meal';
import { setLanguage } from '../src/i18n';

type TodayListener = (day: string) => void;

// A controllable "today": the real hook reads the clock on focus and on
// AppState changes, which this test drives directly instead.
jest.mock('../src/features/diary/hooks/useToday', () => {
  const ReactModule = require('react') as typeof React;
  const listeners = new Set<TodayListener>();
  let current = '2026-09-08';
  return {
    useToday: () => {
      const [day, setDay] = ReactModule.useState(current);
      ReactModule.useEffect(() => {
        listeners.add(setDay);
        return () => {
          listeners.delete(setDay);
        };
      }, []);
      return day;
    },
    __setToday: (next: string) => {
      current = next;
      listeners.forEach(listener => listener(next));
    },
  };
});

const { __setToday } = jest.requireMock(
  '../src/features/diary/hooks/useToday',
) as { __setToday: (next: string) => void };

/**
 * The title is the button that opens the month sheet, so it carries the role
 * and the label, and the text inside it is what is read on screen.
 */
function header(renderer: Renderer): ReactTestInstance {
  return renderer.root.findAll(
    node =>
      typeof node.type === 'string' &&
      node.props.testID === 'open-day-picker' &&
      node.props.accessibilityRole === 'button',
  )[0];
}

function headerTitle(renderer: Renderer): string {
  const text = header(renderer).findAll(
    node => typeof node.type === 'string' && node.props.numberOfLines === 1,
  )[0];
  return String(text.props.children);
}

function headerA11y(renderer: Renderer): string | undefined {
  return header(renderer).props.accessibilityLabel;
}

function hasLabel(renderer: Renderer, label: string): boolean {
  return (
    renderer.root.findAll(
      node =>
        typeof node.type === 'string' &&
        node.props.accessibilityLabel === label,
    ).length > 0
  );
}

// The chip's Pressable, found by its props: memo/forwardRef wrappers are not
// test instances, so the imported `Pressable` type never matches directly.
function chip(renderer: Renderer, label: string): ReactTestInstance {
  const matches = renderer.root.findAll(
    node =>
      typeof node.type !== 'string' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
  expect(matches.length).toBeGreaterThan(0);
  return matches[0];
}

async function mountApp(): Promise<Renderer> {
  let renderer: Renderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(async () => {
    jest.runOnlyPendingTimers();
  });
  if (!renderer) throw new Error('App did not render');
  return renderer;
}

beforeEach(() => {
  jest.useFakeTimers();
  prefs.setLanguage('pt-BR');
  setLanguage('pt-BR');
  prefs.setGoal(DEFAULT_GOAL);
  // These screens are the app after the first run; the calculator has its own
  // tests and must not stand in front of "Hoje" here.
  prefs.setOnboardingDone(true);
  __setToday('2026-09-08');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('day rollover on "Hoje"', () => {
  test('a diary left on today follows the new today', async () => {
    const renderer = await mountApp();
    expect(headerTitle(renderer)).toBe('Hoje');
    expect(
      hasLabel(renderer, 'terça-feira, 8 de setembro, hoje, selecionado'),
    ).toBe(true);

    await ReactTestRenderer.act(async () => {
      __setToday('2026-09-09');
    });

    expect(headerTitle(renderer)).toBe('Hoje');
    expect(hasLabel(renderer, 'Voltar para hoje')).toBe(false);
    expect(
      hasLabel(renderer, 'quarta-feira, 9 de setembro, hoje, selecionado'),
    ).toBe(true);
    // The old today is a plain day again.
    expect(hasLabel(renderer, 'terça-feira, 8 de setembro')).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  test('a day picked on purpose stays selected', async () => {
    const renderer = await mountApp();
    await ReactTestRenderer.act(async () => {
      chip(renderer, 'segunda-feira, 7 de setembro').props.onPress();
    });
    expect(headerTitle(renderer)).toBe('7 de set');
    expect(headerA11y(renderer)).toBe('segunda-feira, 7 de setembro');

    await ReactTestRenderer.act(async () => {
      __setToday('2026-09-09');
    });

    expect(headerTitle(renderer)).toBe('7 de set');
    expect(hasLabel(renderer, 'Voltar para hoje')).toBe(true);
    expect(
      hasLabel(renderer, 'segunda-feira, 7 de setembro, selecionado'),
    ).toBe(true);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
