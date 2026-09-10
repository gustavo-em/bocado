import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer, { type ReactTestInstance } from 'react-test-renderer';

import { KCAL_COLUMN_WIDTH } from '../src/components/DiaryEntryRow';
import { MealEmptyLine, MealHeader } from '../src/components/MealHeader';
import { setLanguage, t } from '../src/i18n';
import { ThemeProvider, lightColors } from '../src/theme';
import { fontFamily } from '../src/theme/type';

function render(subtotal: number, count: number) {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <MealHeader
          title="Café da manhã"
          subtotal={subtotal}
          count={count}
          animate={false}
          onAdd={() => undefined}
          testID="meal-breakfast"
        />
      </ThemeProvider>,
    );
  });
  if (!renderer) throw new Error('Header did not render');
  return renderer;
}

function texts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

/** The ring's own touch target, not the `AddRing` element that renders it. */
function ringTarget(root: ReactTestInstance): ReactTestInstance {
  const found = root
    .findAll(node => node.props.testID === 'meal-breakfast-add')
    .find(node => node.props.accessibilityRole === 'button');
  if (!found) throw new Error('No "+" ring in the header');
  return found;
}

beforeEach(() => {
  setLanguage('pt-BR');
});

describe('MealHeader', () => {
  test('the meal action is the "+" ring, labelled for the tester', () => {
    const tree = render(412, 3);
    const add = ringTarget(tree.root);
    expect(add.props.accessibilityLabel).toBe('Adicionar em Café da manhã');
    expect(add.props.accessibilityRole).toBe('button');
    expect(texts(tree.root)).not.toContain('Adicionar');
  });

  test('the ring target is at least 48 x 48 dp', () => {
    const tree = render(412, 3);
    const style = StyleSheet.flatten(ringTarget(tree.root).props.style);
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
  });

  test('no meal control paints itself in the accent', () => {
    const tree = render(412, 3);
    const painted = tree.root
      .findAll(node => node.props.style !== undefined)
      .map(node => StyleSheet.flatten(node.props.style) ?? {})
      .flatMap(style => [
        style.color,
        style.backgroundColor,
        style.borderColor,
      ]);
    expect(painted).not.toContain(lightColors.accent);
  });

  test('the subtotal is Inter Medium 16 tabular in a fixed right column', () => {
    const tree = render(412, 3);
    const subtotal = tree.root.findByProps({
      testID: 'meal-breakfast-subtotal',
    });
    const style = StyleSheet.flatten(subtotal.props.style);
    expect(style.fontFamily).toBe(fontFamily.bodyMedium);
    expect(style.fontSize).toBe(16);
    expect(style.fontVariant).toContain('tabular-nums');
    expect(style.color).toBe(lightColors.ink);
    expect(style.width).toBe(KCAL_COLUMN_WIDTH);
    expect(style.textAlign).toBe('right');
  });

  test('an empty meal shows no subtotal at all, never a zero', () => {
    const tree = render(0, 0);
    expect(
      tree.root.findAllByProps({ testID: 'meal-breakfast-subtotal' }),
    ).toHaveLength(0);
    expect(texts(tree.root)).not.toContain('0');
  });
});

describe('MealEmptyLine', () => {
  /*
    Decision 12: with the ring, the invitation of a meal without entries lives
    in the glyph. The line stays a sentence in `label`/`inkMuted` — text, not a
    target — in the four meals and on both screens: a second, invisible way to
    open the same search would only reward an accidental tap.
  */
  function renderEmptyLine() {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <MealEmptyLine />
        </ThemeProvider>,
      );
    });
    if (!renderer) throw new Error('Empty line did not render');
    return renderer;
  }

  test('it is a sentence in label/inkMuted, and nothing else', () => {
    const tree = renderEmptyLine();
    expect(texts(tree.root)).toEqual([t('today.emptyMeal')]);
    const style = StyleSheet.flatten(
      tree.root.findByType(Text).props.style,
    ) as { fontFamily?: string; fontSize?: number; color?: string };
    expect(style.fontFamily).toBe(fontFamily.body);
    expect(style.fontSize).toBe(13);
    expect(style.color).toBe(lightColors.inkMuted);
  });

  test('it is not a target: no button role, no press handler', () => {
    const tree = renderEmptyLine();
    expect(
      tree.root.findAll(node => node.props.accessibilityRole === 'button'),
    ).toHaveLength(0);
    expect(
      tree.root.findAll(node => typeof node.props.onPress === 'function'),
    ).toHaveLength(0);
  });
});
