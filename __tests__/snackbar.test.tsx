import React from 'react';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { Snackbar } from '../src/components/Snackbar';
import { setLanguage } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

const onUndo = jest.fn();

function render(food: string, meal: string): Renderer {
  let renderer: Renderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <Snackbar
          message={{ food, meal }}
          onUndo={onUndo}
          bottom={64}
          testID="snackbar"
        />
      </ThemeProvider>,
    );
  });
  if (!renderer) throw new Error('Snackbar did not render');
  return renderer;
}

function byTestID(renderer: Renderer, testID: string): ReactTestInstance {
  const nodes = renderer.root.findAll(
    node => typeof node.type === 'string' && node.props.testID === testID,
  );
  if (nodes.length === 0) throw new Error(`No host node ${testID}`);
  return nodes[0];
}

function flatStyle(node: ReactTestInstance): Record<string, unknown> {
  return Object.assign({}, ...[node.props.style].flat(Infinity));
}

/** Host ancestors of `node`, nearest first. */
function hostAncestors(node: ReactTestInstance): ReactTestInstance[] {
  const chain: ReactTestInstance[] = [];
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (typeof parent.type === 'string') chain.push(parent);
  }
  return chain;
}

beforeEach(() => {
  setLanguage('pt-BR');
  onUndo.mockClear();
});

describe('Snackbar', () => {
  test('stacks the sentence: the name on top, the meal below, both one line', () => {
    const renderer = render('Pão de forma industrializado', 'Café da manhã');
    const name = byTestID(renderer, 'snackbar-name');
    expect(name.props.children).toBe('Pão de forma industrializado');
    expect(name.props.numberOfLines).toBe(1);
    expect(name.props.ellipsizeMode).toBe('tail');
    const tail = byTestID(renderer, 'snackbar-tail');
    expect(tail.props.children).toBe('adicionado ao Café da manhã');
    expect(tail.props.numberOfLines).toBe(1);
    const sentence = byTestID(renderer, 'snackbar-text');
    expect(sentence.props.accessible).toBe(true);
    expect(sentence.props.accessibilityLabel).toBe(
      'Pão de forma industrializado adicionado ao Café da manhã',
    );
    // Column layout: the meal line never competes with the name for width.
    expect(flatStyle(sentence).flexDirection).toBe('column');
  });

  test('blocks the list under the sentence only, inside the drawn pill', () => {
    const renderer = render('Arroz, tipo 1, cozido', 'Almoço');
    const pill = byTestID(renderer, 'snackbar');
    expect(pill.props.onStartShouldSetResponder).toBeUndefined();
    expect(pill.props.onStartShouldSetResponderCapture).toBeUndefined();
    expect(pill.props.hitSlop).toBeUndefined();
    // The session announces additions itself; a live region would say it twice.
    expect(pill.props.accessibilityLiveRegion).toBeUndefined();
    expect(flatStyle(pill).zIndex).toBeGreaterThan(0);
    const sentence = byTestID(renderer, 'snackbar-text');
    expect(sentence.props.onStartShouldSetResponder()).toBe(true);
    expect(sentence.props.hitSlop).toBeUndefined();
    expect(flatStyle(sentence).alignSelf).toBe('stretch');
  });

  test('"Desfazer" is a 48 dp button with no ancestor claiming its touches', () => {
    const renderer = render('Arroz, tipo 1, cozido', 'Almoço');
    const undo = byTestID(renderer, 'snackbar-undo');
    expect(undo.props.accessibilityRole).toBe('button');
    expect(undo.props.accessibilityLabel).toBe('Desfazer');
    const style = flatStyle(undo);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    for (const ancestor of hostAncestors(undo)) {
      expect(ancestor.props.onStartShouldSetResponder).toBeUndefined();
      expect(ancestor.props.onStartShouldSetResponderCapture).toBeUndefined();
    }
    ReactTestRenderer.act(() => {
      undo.props.onClick();
    });
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test('speaks English when the language is en-US', () => {
    setLanguage('en-US');
    const renderer = render('Rice, white, cooked', 'Lunch');
    expect(byTestID(renderer, 'snackbar-tail').props.children).toBe(
      'added to Lunch',
    );
    expect(byTestID(renderer, 'snackbar-text').props.accessibilityLabel).toBe(
      'Rice, white, cooked added to Lunch',
    );
    expect(byTestID(renderer, 'snackbar-undo').props.accessibilityLabel).toBe(
      'Undo',
    );
  });
});
