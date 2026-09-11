import React from 'react';
import ReactTestRenderer, { type ReactTestInstance } from 'react-test-renderer';

import { StepProgress } from '../src/components/StepProgress';
import { ONBOARDING_STEPS } from '../src/features/onboarding/finish';
import { setLanguage } from '../src/i18n';
import { ThemeProvider, darkColors, lightColors } from '../src/theme';

function render(current: number, total = ONBOARDING_STEPS) {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <StepProgress total={total} current={current} testID="progress" />
      </ThemeProvider>,
    );
  });
  if (!renderer) throw new Error('Strip did not render');
  return renderer;
}

/** The host View the strip renders, not the composite element of the same name. */
function strip(root: ReactTestInstance): ReactTestInstance {
  const found = root.findAll(
    node => typeof node.type === 'string' && node.props.testID === 'progress',
  );
  if (found.length !== 1) {
    throw new Error(`Expected one host strip, found ${found.length}`);
  }
  return found[0];
}

/** Every host node carrying a background colour, outermost first. */
function paintedViews(root: ReactTestInstance): string[] {
  return root
    .findAll(node => typeof node.type === 'string')
    .map(node => {
      const style = node.props.style;
      const flat: Record<string, unknown> = Array.isArray(style)
        ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
        : style ?? {};
      return flat.backgroundColor as string | undefined;
    })
    .filter((colour): colour is string => typeof colour === 'string');
}

describe('StepProgress', () => {
  beforeEach(() => setLanguage('pt-BR'));

  it('draws one segment per step, each over the track', () => {
    const tree = render(1);
    const painted = paintedViews(tree.root);
    // One track and one ink layer per segment, and nothing else painted.
    expect(painted).toHaveLength(ONBOARDING_STEPS * 2);
    expect(painted.filter(c => c === lightColors.track)).toHaveLength(
      ONBOARDING_STEPS,
    );
    expect(painted.filter(c => c === lightColors.ink)).toHaveLength(
      ONBOARDING_STEPS,
    );
    ReactTestRenderer.act(() => tree.unmount());
  });

  it('never paints the strip with the accent', () => {
    const tree = render(2);
    const painted = paintedViews(tree.root);
    expect(painted).not.toContain(lightColors.accent);
    expect(painted).not.toContain(darkColors.accent);
    ReactTestRenderer.act(() => tree.unmount());
  });

  it('announces the step it is on, as one node', () => {
    const tree = render(2);
    const node = strip(tree.root);
    expect(node.props.accessible).toBe(true);
    expect(node.props.accessibilityRole).toBe('progressbar');
    expect(node.props.accessibilityLabel).toBe('Passo 2 de 3');
    ReactTestRenderer.act(() => tree.unmount());
  });

  it('reads the flow length from the first-run constant', () => {
    setLanguage('en-US');
    const tree = render(ONBOARDING_STEPS);
    expect(strip(tree.root).props.accessibilityLabel).toBe('Step 3 of 3');
    ReactTestRenderer.act(() => tree.unmount());
  });
});
