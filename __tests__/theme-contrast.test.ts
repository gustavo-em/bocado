import { darkColors, lightColors, type ThemeColors } from '../src/theme/colors';

/**
 * Design system §1.1: three inks by contrast obligation. The dark theme is
 * never seen on the reference device (its shell is locked to light), so the
 * only judge it has is this test.
 */
function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(at =>
    parseInt(value.slice(at, at + 2), 16),
  ) as [number, number, number];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

const themes: readonly (readonly [string, ThemeColors])[] = [
  ['light', lightColors],
  ['dark', darkColors],
];

describe.each(themes)('%s theme', (_name, colors) => {
  test('inkSubtle clears the 3:1 of a non-text control (the "+" ring)', () => {
    expect(
      contrast(colors.inkSubtle, colors.background),
    ).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.inkSubtle, colors.surface)).toBeGreaterThanOrEqual(
      3,
    );
  });

  test('ink clears 12:1, so the "+" glyph and the subtotal read first', () => {
    expect(contrast(colors.ink, colors.background)).toBeGreaterThanOrEqual(12);
  });

  test('inkMuted clears the 4,5:1 of readable text', () => {
    expect(contrast(colors.inkMuted, colors.background)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
