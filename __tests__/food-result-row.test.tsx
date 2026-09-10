import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer, { type ReactTestInstance } from 'react-test-renderer';

import { FoodResultRow } from '../src/components/FoodResultRow';
import type { NormalizedFood } from '../src/domain/food/NormalizedFood';
import { REFERENCE_SERVING } from '../src/domain/food/NormalizedFood';
import { setLanguage } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

const ovo: NormalizedFood = {
  id: 'taco:490',
  source: 'taco',
  sourceId: '490',
  name: { pt: 'Ovo, de galinha, inteiro, frito' },
  verified: true,
  per100g: {
    kcal: 240,
    protein_g: 15.6,
    carbs_g: 1.2,
    fat_g: 18.6,
    energySource: 'declared',
  },
  servings: [
    {
      id: 'taco:unit',
      label: { pt: 'unidade média' },
      grams: 50,
      kind: 'household',
      isDefault: true,
    },
    { ...REFERENCE_SERVING, isDefault: false },
  ],
  completeness: 1,
  lastFetchedAt: '2025-01-01',
  attribution: { license: 'TACO', text: 'TACO' },
};

function render(): ReactTestRenderer.ReactTestRenderer {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <FoodResultRow
          food={ovo}
          added={false}
          query="ovo"
          onAdd={() => undefined}
          onOpen={() => undefined}
          testID="row"
        />
      </ThemeProvider>,
    );
  });
  if (!renderer) throw new Error('Row did not render');
  return renderer;
}

/** The first Text whose flattened content starts with `start`. */
function textStartingWith(
  root: ReactTestInstance,
  start: string,
): ReactTestInstance {
  const found = root.findAllByType(Text).find(node => {
    const children = node.props.children;
    return typeof children === 'string' && children.startsWith(start);
  });
  if (!found) throw new Error(`No Text starting with ${start}`);
  return found;
}

beforeEach(() => {
  setLanguage('pt-BR');
});

describe('FoodResultRow', () => {
  test('cuts the name in the middle so the last facet survives', () => {
    const tree = render();
    const name = tree.root
      .findAllByType(Text)
      .find(node => node.props.ellipsizeMode !== undefined);
    expect(name?.props.ellipsizeMode).toBe('middle');
    expect(name?.props.numberOfLines).toBe(1);
  });

  test('kcal per 100 g is pushed to the right-hand column', () => {
    const tree = render();
    const kcal = textStartingWith(tree.root, '240 kcal');
    const style = StyleSheet.flatten(kcal.props.style);
    expect(style.textAlign).toBe('right');
    expect(style.flexGrow).toBe(1);
    expect(style.flexShrink).toBe(0);
  });

  test('the source badge sits in that same right-hand column', () => {
    const tree = render();
    const badge = textStartingWith(tree.root, 'TACO');
    const pushed = tree.root
      .findAllByType(View)
      .filter(
        node => StyleSheet.flatten(node.props.style)?.marginLeft === 'auto',
      );
    expect(pushed).toHaveLength(1);
    expect(pushed[0].findAllByType(Text)).toContain(badge);
  });
});
