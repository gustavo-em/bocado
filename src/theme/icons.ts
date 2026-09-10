/**
 * Icon contract for `lucide-react-native`.
 *
 * One stroke weight for the whole app: 1.75 sits between Lucide's default 2
 * (too heavy next to Inter Regular at 16) and 1.5 (breaks up on the J6's
 * 720p panel). Sizes are named after where the icon lives, not how big it is.
 */
export const iconStroke = 1.75;

export const iconSize = {
  /** Inside a list row or a chip: search, calendar, source glyphs. */
  row: 20,
  /** A standalone action: the "+"/"✓", close, back, stepper. */
  action: 24,
} as const;

/** The only icons the app may use. Adding one is a design-system change. */
export const iconNames = [
  'search',
  'plus',
  'check',
  'x',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chevron-down',
  'calendar',
  'settings-2',
  'heart',
  'trash-2',
  'minus',
  'undo-2',
  'info',
  /** The quiet offline strip over the results list (spec 05). */
  'cloud-off',
  /** "Ver no Open Food Facts": this link leaves the app. */
  'external-link',
  /** The share action in the "Hoje" header, and its sheet's three outputs. */
  'share-2',
  'image',
  'file-text',
  'calendar-days',
] as const;

export type IconName = (typeof iconNames)[number];
