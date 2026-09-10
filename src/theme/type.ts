import { Platform, type TextStyle } from 'react-native';

/**
 * Two families, bundled from assets/fonts (OFL):
 *
 * - Fraunces 144 Soft — the editorial serif for the one number that answers a
 *   screen (decision 11). Static instances at optical size 144, SOFT 100.
 * - Inter — everything else. Tabular numerals wherever a number can change.
 *
 * Android resolves fonts by file name; iOS by PostScript name. Both match.
 */
export const fontFamily = {
  display: 'Fraunces144Soft-Regular',
  displayMedium: 'Fraunces144Soft-Medium',
  displaySemiBold: 'Fraunces144Soft-SemiBold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
} as const;

/** Numbers that change (totals, kcal in a row) must not jitter. */
export const tabularNumbers: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/**
 * Sizes named after their job. A screen picks a role, never a number.
 * Values in sp (Android) / pt (iOS).
 */
export const typeScale = {
  /** The day's remaining kcal. */
  hero: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
  },
  /** The quantity in the portion sheet ("1,5"). */
  display: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  /** Screen title. */
  title: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  /** Section header, meal name. */
  heading: { fontFamily: fontFamily.bodyMedium, fontSize: 17, lineHeight: 22 },
  /** Food name in a row. */
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 22 },
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  /** Portion, kcal per 100 g, secondary line. */
  label: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  labelMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  /** Source badge, tiny caps. Never smaller than this. */
  caption: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
} as const satisfies Record<string, TextStyle>;

export type TypeRole = keyof typeof typeScale;

/** Android draws extra padding around text unless told otherwise. */
export const textDefaults: TextStyle = Platform.select({
  android: { includeFontPadding: false },
  default: {},
}) as TextStyle;
