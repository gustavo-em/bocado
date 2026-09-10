/**
 * Palette "Papel": warm bone paper, near-black ink, one indigo accent.
 *
 * Chosen against the eleven competitors measured in docs/research/04-nome-e-marca.md:
 * nine of them own a saturated flat colour; nobody owns warm paper as the ground.
 * Every pair below was checked for WCAG contrast (ink 15.4:1, accent 9.1:1,
 * macros between 4.8:1 and 8.8:1 on the light ground). The full table, with
 * the rule for which tone may carry text, is in docs/DESIGN_SYSTEM.md.
 *
 * Three ink tiers, by contrast obligation, not by taste:
 * - `ink`       ≥ 12:1  everything that must be read first
 * - `inkMuted`  ≥ 4.5:1 any readable text, including placeholders and badges
 * - `inkSubtle` ≥ 3:1   control boundaries, disabled text, decorative glyphs —
 *                       never running text, never below 3:1 on any ground
 */
export type AppearanceMode = 'light' | 'dark';

/** What the user picked in "Metas": follow the device, or force one palette. */
export type AppearanceSetting = 'system' | AppearanceMode;

/** The stored values the app still understands, for `readOneOf`. */
export const APPEARANCE_SETTINGS: readonly AppearanceSetting[] = [
  'system',
  'light',
  'dark',
] as const;

export interface ThemeColors {
  /** The page. Warm paper in light, warm graphite in dark. */
  background: string;
  /** A raised surface: sheets, the tray, inputs. */
  surface: string;
  /** A quieter surface for chips and badges that must not compete with the accent. */
  surfaceMuted: string;
  /** Primary text and the only "colour" most of the screen has. */
  ink: string;
  /** Secondary text: qualifiers, units, sources. AA on both grounds. */
  inkMuted: string;
  /**
   * The 3:1 tier: control outlines (the "+" ring), disabled text, the sheet
   * handle. Not for readable text — placeholders and badges use `inkMuted`.
   */
  inkSubtle: string;
  /** The single accent: primary action, active state, the "✓". One place per screen. */
  accent: string;
  /** What is written on top of the accent. */
  onAccent: string;
  /** Accent at low opacity for selected backgrounds. */
  accentSoft: string;
  /** Hairline separators. A rule, not a border. */
  line: string;
  /** Macro data colours. Desaturated so they read as data, never as alarm. */
  protein: string;
  carbs: string;
  fat: string;
  /** Progress track behind the daily bar. */
  track: string;
  /** Portion of the daily bar beyond the goal: darker accent, never red. */
  overGoal: string;
  /** Reserved for destructive confirmation and failed requests only. */
  danger: string;
  /** Backdrop behind sheets. */
  scrim: string;
  /** The snackbar: the other theme's ground, so it reads as a note on top. */
  inverseSurface: string;
  /** Text on `inverseSurface`. */
  onInverseSurface: string;
  /** The snackbar action ("Desfazer"): the other theme's accent, AA on `inverseSurface`. */
  inverseAccent: string;
}

export const lightColors: ThemeColors = {
  background: '#F7F4EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEBE3',
  ink: '#1B1D21',
  inkMuted: '#5C5F66',
  inkSubtle: '#7E8188',
  accent: '#2F3A8C',
  onAccent: '#FFFFFF',
  accentSoft: '#E4E7F7',
  line: '#E3DFD6',
  protein: '#3F5F7C',
  carbs: '#9C5A2C',
  fat: '#6E4E76',
  track: '#E6E2DA',
  overGoal: '#1E2661',
  danger: '#9E2A2B',
  scrim: 'rgba(27, 29, 33, 0.42)',
  inverseSurface: '#1B1D21',
  onInverseSurface: '#F7F4EE',
  inverseAccent: '#93A0F2',
};

export const darkColors: ThemeColors = {
  background: '#15161A',
  surface: '#1E2026',
  surfaceMuted: '#262930',
  ink: '#ECEAE4',
  inkMuted: '#A7A6A0',
  inkSubtle: '#767A82',
  accent: '#93A0F2',
  onAccent: '#15161A',
  accentSoft: '#2A2F4F',
  line: '#2C2F37',
  protein: '#8FB6D6',
  carbs: '#EDA56E',
  fat: '#C39ACB',
  track: '#2A2D34',
  overGoal: '#C4CCFF',
  danger: '#E5757A',
  scrim: 'rgba(0, 0, 0, 0.55)',
  inverseSurface: '#ECEAE4',
  onInverseSurface: '#15161A',
  inverseAccent: '#2F3A8C',
};
