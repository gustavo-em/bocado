/** A 4 pt grid. Screens compose these; they never invent a number. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  /** Source badge only. */
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Minimum touch target on both platforms. */
export const touchTarget = 48;

/** Fixed height of a search result row, so FlashList can recycle without measuring. */
export const resultRowHeight = 64;
