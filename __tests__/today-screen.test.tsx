import React from 'react';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import App from '../src/app/App';
import { DiaryEntryRow } from '../src/components/DiaryEntryRow';
import { HeroBlock } from '../src/components/HeroBlock';
import type { DiaryEntryView } from '../src/data/diary/DiaryRepository';
import { prefs } from '../src/data/prefs/prefs';
import { DEFAULT_GOAL } from '../src/domain/diary/Meal';
import { summarizeDay } from '../src/domain/diary/daySummary';
import { setLanguage } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

function textOf(instance: ReactTestInstance): string {
  const parts: string[] = [];
  const collect = (children: unknown) => {
    if (typeof children === 'string' || typeof children === 'number') {
      parts.push(String(children));
    } else if (Array.isArray(children)) {
      children.forEach(collect);
    }
  };
  // `findAll` includes the instance itself when it matches.
  for (const host of instance.findAll(node => typeof node.type === 'string')) {
    collect(host.props.children);
  }
  return parts.join('');
}

function byTestId(renderer: Renderer, testID: string): ReactTestInstance {
  const matches = renderer.root.findAll(
    node => node.props.testID === testID && typeof node.type === 'string',
  );
  expect(matches.length).toBeGreaterThan(0);
  return matches[0];
}

function byLabel(renderer: Renderer, label: string): ReactTestInstance[] {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label && typeof node.type === 'string',
  );
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

async function unmount(renderer: Renderer): Promise<void> {
  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  prefs.setLanguage('pt-BR');
  setLanguage('pt-BR');
  prefs.setGoal(DEFAULT_GOAL);
  // These screens are the app after the first run; the calculator has its own
  // tests and must not stand in front of "Hoje" here.
  prefs.setOnboardingDone(true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Hoje', () => {
  test('an empty day shows the whole goal, four meals and their add actions', async () => {
    const renderer = await mountApp();

    expect(textOf(byTestId(renderer, 'hero-number'))).toBe('2.000');
    expect(textOf(byTestId(renderer, 'hero-subtitle'))).toBe(
      'disponíveis hoje',
    );
    expect(byTestId(renderer, 'hero-block').props.accessibilityValue).toEqual({
      text: '0 de 2.000 quilocalorias, 2.000 restantes',
    });

    for (const meal of ['Café da manhã', 'Almoço', 'Café da tarde', 'Jantar']) {
      expect(byLabel(renderer, `Adicionar em ${meal}`)).toHaveLength(1);
    }
    expect(byLabel(renderer, 'Metas')).toHaveLength(1);
    expect(byLabel(renderer, 'Voltar para hoje')).toHaveLength(0);
    expect(
      renderer.root.findAll(
        node =>
          typeof node.type === 'string' &&
          node.props.children === 'Nada registrado ainda',
      ),
    ).toHaveLength(4);

    await unmount(renderer);
  });

  test('the hero reads the goal saved in Metas', async () => {
    prefs.setGoal({ ...DEFAULT_GOAL, kcal: 1850 });
    const renderer = await mountApp();
    expect(textOf(byTestId(renderer, 'hero-number'))).toBe('1.850');
    await unmount(renderer);
  });
});

/*
  The printed macros became columns, and the columns must not have changed
  what the entry says out loud: the pixels abbreviate, the screen reader keeps
  the whole words and the decimal, after the calories.
*/
describe('a diary entry in "Hoje"', () => {
  const arroz: DiaryEntryView = {
    id: 'e_1',
    day: '2026-09-08',
    meal: 'lunch',
    foodId: 'taco:3',
    grams: 45,
    servingLabel: 'colher de servir',
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

  function render(): Renderer {
    let renderer: Renderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <DiaryEntryRow entry={arroz} />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('the entry did not render');
    return renderer;
  }

  test('speaks the three macros in full, after the calories', () => {
    const renderer = render();
    expect(
      byLabel(
        renderer,
        'Arroz, tipo 1, cozido, 1 colher de servir · 45 g, 58 kcal, ' +
          'proteína 1,9 gramas, carboidratos 21 gramas, gorduras 0,2 gramas',
      ),
    ).toHaveLength(1);
  });

  test('prints the macros as columns, with no dot joining them', () => {
    const printed = textOf(render().root);
    expect(printed).toContain('P2');
    expect(printed).not.toContain('· P');
    expect(printed).toContain('1 colher de servir · 45 g');
  });
});

describe('HeroBlock', () => {
  function render(kcal: number) {
    const summary = summarizeDay(
      [{ meal: 'lunch', kcal, protein: 40, carbs: 90, fat: 20 }],
      DEFAULT_GOAL,
    );
    let renderer: Renderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <HeroBlock
            summary={summary}
            goal={DEFAULT_GOAL}
            isToday
            animate={false}
            mode="remaining"
          />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('HeroBlock did not render');
    return renderer;
  }

  test('under the goal: remaining kcal and the consumed line', () => {
    const renderer = render(760);
    expect(textOf(byTestId(renderer, 'hero-number'))).toBe('1.240');
    expect(textOf(byTestId(renderer, 'hero-subtitle'))).toBe(
      'restantes · 760 de 2.000 kcal',
    );
    expect(byTestId(renderer, 'hero-block').props.accessibilityValue.text).toBe(
      '760 de 2.000 quilocalorias, 1.240 restantes',
    );
  });

  test('over the goal: the excess in the same ink, never a colour change', () => {
    const renderer = render(2120);
    expect(textOf(byTestId(renderer, 'hero-number'))).toBe('120');
    expect(textOf(byTestId(renderer, 'hero-subtitle'))).toBe(
      'acima da meta · 2.120 de 2.000 kcal',
    );
    expect(byTestId(renderer, 'hero-block').props.accessibilityValue.text).toBe(
      '2.120 de 2.000 quilocalorias, 120 acima da meta',
    );
  });
});
