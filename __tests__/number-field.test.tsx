import React, { useState } from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { NumberField } from '../src/components/NumberField';
import { parseGoalInput } from '../src/domain/diary/daySummary';
import { setLanguage } from '../src/i18n';
import { formatKcal } from '../src/i18n/format';
import { ThemeProvider } from '../src/theme';

// The jest TextInput mock has no `setSelection`; the field calls it on focus.
const setSelection = jest.fn();

function parse(text: string) {
  return parseGoalInput('kcal', text);
}

function Harness({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  return (
    <ThemeProvider>
      <NumberField
        label="Calorias"
        unit="kcal"
        value={value}
        accessibilityLabel="Meta de calorias por dia, em quilocalorias"
        maxLength={5}
        format={formatKcal}
        parse={parse}
        onCommit={setValue}
        returnKeyType="done"
        testID="goal-kcal"
      />
    </ThemeProvider>
  );
}

function render(initial: number): Renderer {
  let renderer: Renderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<Harness initial={initial} />);
  });
  if (!renderer) throw new Error('NumberField did not render');
  return renderer;
}

function input(renderer: Renderer): ReactTestInstance {
  return renderer.root.findAll(
    node =>
      typeof node.type === 'string' && node.props.testID === 'goal-kcal-input',
  )[0];
}

function type(renderer: Renderer, text: string): void {
  ReactTestRenderer.act(() => {
    input(renderer).props.onChangeText(text);
  });
}

function focus(renderer: Renderer): void {
  ReactTestRenderer.act(() => {
    input(renderer).props.onFocus();
  });
}

function blur(renderer: Renderer): void {
  ReactTestRenderer.act(() => {
    input(renderer).props.onBlur();
  });
}

beforeAll(() => {
  TextInput.prototype.setSelection = setSelection;
});

beforeEach(() => {
  setLanguage('pt-BR');
  setSelection.mockClear();
});

describe('NumberField', () => {
  test('shows the formatted value at rest and raw digits while editing', () => {
    const renderer = render(2000);
    expect(input(renderer).props.value).toBe('2.000');

    focus(renderer);
    expect(input(renderer).props.value).toBe('2000');
    expect(setSelection).toHaveBeenCalledWith(0, 4);

    type(renderer, '1800');
    blur(renderer);
    expect(input(renderer).props.value).toBe('1.800');
  });

  test('a value past the limit is clamped and shown formatted', () => {
    const renderer = render(2000);
    focus(renderer);
    type(renderer, '20000');
    blur(renderer);
    expect(input(renderer).props.value).toBe('9.999');
  });

  test('an empty entry reverts to the saved value', () => {
    const renderer = render(2000);
    focus(renderer);
    type(renderer, '');
    blur(renderer);
    expect(input(renderer).props.value).toBe('2.000');
  });
});
