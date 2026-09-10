import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import ReactTestRenderer, { type ReactTestInstance } from 'react-test-renderer';

import {
  DiaryEntryRow,
  MACRO_BLOCK_WIDTH,
  MACRO_CELL_WIDTH,
  MACRO_LABEL_WIDTH,
  MACRO_VALUE_WIDTH,
  macroCellMetrics,
} from '../src/components/DiaryEntryRow';
import type { DiaryEntryView } from '../src/data/diary/DiaryRepository';
import { setLanguage } from '../src/i18n';
import { ThemeProvider } from '../src/theme';

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

function render(entry: DiaryEntryView): ReactTestRenderer.ReactTestRenderer {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <DiaryEntryRow entry={entry} />
      </ThemeProvider>,
    );
  });
  if (!renderer) throw new Error('the row did not render');
  return renderer;
}

function width(node: ReactTestInstance): number | undefined {
  const flat = StyleSheet.flatten(node.props.style) as
    | { width?: number }
    | undefined;
  return flat?.width;
}

/**
 * The cell as it is drawn here: 10/4/26 dp at the normal text size, and the
 * same boxes grown by the text size the environment reports (the test renderer
 * reports a large one, which is exactly the case worth checking).
 */
const drawn = macroCellMetrics(Dimensions.get('window').fontScale);

/** Everything the cell prints, in order, as one string. */
function textOf(node: ReactTestInstance): string {
  return node
    .findAllByType(Text)
    .map(text => String(text.props.children ?? ''))
    .join('');
}

/*
  The macros stopped being a sentence and became three columns, so what the
  test holds is no longer a string: it is the cell — a box that is the same
  width on every row, printing nothing when the source stated nothing, so that
  the protein of one food lands right above the protein of the next.
*/
describe('the macro cells of a diary entry', () => {
  afterEach(() => setLanguage('pt-BR'));

  it('gives every cell the same width: 10 dp of label and 26 of value', () => {
    const cells = render(arroz)
      .root.findAllByType(View)
      .filter(node => String(node.props.testID ?? '').startsWith('macro-'));
    expect(cells.map(cell => cell.props.testID)).toEqual([
      'macro-protein',
      'macro-carbs',
      'macro-fat',
    ]);
    for (const cell of cells) {
      expect(width(cell)).toBe(drawn.label + drawn.gap + drawn.value);
      const [label, value] = cell.findAllByType(Text);
      expect(width(label!)).toBe(drawn.label);
      expect(width(value!)).toBe(drawn.value);
      expect(
        (StyleSheet.flatten(value!.props.style) as { textAlign?: string })
          .textAlign,
      ).toBe('right');
    }
    expect([MACRO_LABEL_WIDTH, MACRO_VALUE_WIDTH]).toEqual([10, 26]);
    expect(MACRO_CELL_WIDTH).toBe(40);
    expect(MACRO_BLOCK_WIDTH).toBe(152);
  });

  it('empties the cell of an unknown macro and keeps its width', () => {
    const renderer = render({
      ...arroz,
      carbs: undefined as unknown as number,
    });
    const carbs = renderer.root.findByProps({ testID: 'macro-carbs' });
    expect(width(carbs)).toBe(drawn.label + drawn.gap + drawn.value);
    expect(carbs.findAllByType(Text)).toHaveLength(0);
    expect(textOf(renderer.root.findByProps({ testID: 'macro-protein' }))).toBe(
      'P2',
    );
  });

  it('prints no separator inside the block: the columns do the joining', () => {
    const renderer = render(arroz);
    const block = renderer.root.findByProps({
      testID: 'diary-entry-e_1-macros',
    });
    expect(textOf(block)).toBe('P2C21G0');
    // The dot survives where it still means something: measure and grams.
    expect(
      renderer.root
        .findAllByType(Text)
        .some(text => String(text.props.children ?? '').includes(' · 45 g')),
    ).toBe(true);
  });

  it('pins the block to the right margin, whatever the portion measures', () => {
    // "100 g" (36,8 dp) and a household measure (146,7): if the block followed
    // the portion, these two rows would start their columns 110 dp apart.
    for (const entry of [
      arroz,
      { ...arroz, servingLabel: undefined, servingCount: undefined },
    ]) {
      const renderer = render(entry);
      const portionBox = renderer.root.findByProps({
        testID: 'diary-entry-e_1-portion',
      });
      const portionStyle = StyleSheet.flatten(portionBox.props.style) as {
        flex?: number;
        flexShrink?: number;
      };
      // The portion takes every dp the block does not: that is the anchor.
      expect(portionStyle.flex).toBe(1);
      expect(portionStyle.flexShrink).toBe(1);

      const block = renderer.root.findByProps({
        testID: 'diary-entry-e_1-macros',
      });
      const blockStyle = StyleSheet.flatten(block.props.style) as {
        flexShrink?: number;
        marginLeft?: number;
      };
      expect(blockStyle.flexShrink).toBe(0);
      expect(blockStyle.marginLeft).toBe(12);

      // Portion first, block last, on the one line they share.
      const line = portionBox.parent;
      const ids = (line?.children ?? [])
        .filter(
          (child): child is ReactTestInstance => typeof child !== 'string',
        )
        .map(child => child.props.testID);
      expect(ids).toEqual([
        'diary-entry-e_1-portion',
        'diary-entry-e_1-macros',
      ]);
    }
  });

  it('has no block for a portion whose macros are all unknown', () => {
    const unknown = undefined as unknown as number;
    const renderer = render({
      ...arroz,
      protein: unknown,
      carbs: unknown,
      fat: unknown,
    });
    expect(
      renderer.root.findAllByProps({ testID: 'diary-entry-e_1-macros' }),
    ).toHaveLength(0);
  });

  it('grows the block with the text, up to the 1,3× the row honours', () => {
    expect(macroCellMetrics(1).block).toBe(152);
    expect(macroCellMetrics(1.3).block).toBeCloseTo(197.6, 5);
    expect(macroCellMetrics(2).block).toBeCloseTo(197.6, 5);
    expect(macroCellMetrics(0.85).block).toBe(152);
  });

  it('separates two cells more than the value and its own label', () => {
    // Right-aligning a single digit leaves up to 22 dp inside the cell; if the
    // cells were closer than that, "P 3 C 28" would read as "3 C".
    const { gap, value, spacing } = macroCellMetrics(1);
    expect(spacing).toBeGreaterThan(gap);
    expect(spacing).toBeGreaterThanOrEqual(value / 2);
  });
});
