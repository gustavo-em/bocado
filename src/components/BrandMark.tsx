import React, { useMemo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The brand mark: one ink disc with one circular bite taken out of it, on the
 * −45° axis. Same numbers as `scripts/generate-brand-assets.mjs` (docs/BRAND.md
 * §4.2) — the launcher icon, the launch window and this component have to be
 * the same shape, so the geometry is stated once there and mirrored here.
 *
 * The view box is the mark's own bounding box (the host disc, 52 × 52), so
 * `size` is the mark's width in dp and two of these stacked line up exactly.
 * The optical offset of the icon frame is not applied here: it is a correction
 * for the 108 dp icon frame, and inside the app the mark is placed on its own.
 */
const R = 26;
const BITE_R = 13;
const BITE_D = 21;
const AXIS_DEG = -45;

const VIEW = 2 * R;
/** Minimum the mark is ever drawn at (docs/BRAND.md §4.4). */
export const BRAND_MARK_MIN_DP = 20;
/** The mark inside the interface, per the design system's icon sizes. */
export const BRAND_MARK_UI_DP = 24;

const AXIS = {
  x: Math.cos((AXIS_DEG * Math.PI) / 180),
  y: Math.sin((AXIS_DEG * Math.PI) / 180),
};

const CX = R;
const CY = R;
const BX = CX + BITE_D * AXIS.x;
const BY = CY + BITE_D * AXIS.y;

const n = (value: number): string => Number(value.toFixed(3)).toString();

/** The ends of the bite's mouth: where the two circles cross. */
const ENDS = (() => {
  const dx = BX - CX;
  const dy = BY - CY;
  const d = Math.hypot(dx, dy);
  const a = (d * d + R * R - BITE_R * BITE_R) / (2 * d);
  const h = Math.sqrt(Math.max(0, R * R - a * a));
  const ux = dx / d;
  const uy = dy / d;
  const px = CX + a * ux;
  const py = CY + a * uy;
  return [
    { x: px - h * uy, y: py + h * ux },
    { x: px + h * uy, y: py - h * ux },
  ] as const;
})();

/** The rim the long way round, then back along the inside of the bite. */
const BITTEN_PATH = [
  `M${n(ENDS[0].x)} ${n(ENDS[0].y)}`,
  `A${R} ${R} 0 1 1 ${n(ENDS[1].x)} ${n(ENDS[1].y)}`,
  `A${BITE_R} ${BITE_R} 0 1 0 ${n(ENDS[0].x)} ${n(ENDS[0].y)}`,
  'Z',
].join('');

/**
 * The piece that was bitten off — exactly the lens the mark is missing, so
 * the two together tile back into the whole disc.
 */
const MORSEL_PATH = [
  `M${n(ENDS[1].x)} ${n(ENDS[1].y)}`,
  `A${R} ${R} 0 0 1 ${n(ENDS[0].x)} ${n(ENDS[0].y)}`,
  `A${BITE_R} ${BITE_R} 0 0 0 ${n(ENDS[1].x)} ${n(ENDS[1].y)}`,
  'Z',
].join('');

/**
 * The mark's own box and outline, for a drawing that has its own `Svg` root
 * and cannot nest this component inside it — the shared day and month pieces.
 */
export const BRAND_MARK_VIEW = VIEW;
export const BRAND_MARK_PATH = BITTEN_PATH;

export type BrandMarkState =
  /** The mark. What the launcher, the app and every document show. */
  | 'bitten'
  /** The disc before the bite: the launch window's first image. */
  | 'whole'
  /** Only the piece that leaves, so the opening can animate it on its own. */
  | 'morsel';

interface BrandMarkProps {
  /** The mark's width in dp; its box is square. */
  size: number;
  /** Any ink from the theme. The mark never carries the accent. */
  color: string;
  state?: BrandMarkState;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Decorative by default: the mark repeats what the screen already says, so it
 * is hidden from the screen reader unless a label is given for it.
 */
export function BrandMark({
  size,
  color,
  state = 'bitten',
  accessibilityLabel,
  testID,
}: BrandMarkProps) {
  const a11y = useMemo(
    () =>
      accessibilityLabel
        ? ({
            accessible: true,
            accessibilityRole: 'image' as const,
            accessibilityLabel,
          } as const)
        : ({
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          } as const),
    [accessibilityLabel],
  );

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      testID={testID}
      {...a11y}
    >
      {state === 'whole' ? (
        <Circle cx={CX} cy={CY} r={R} fill={color} />
      ) : (
        <Path d={state === 'morsel' ? MORSEL_PATH : BITTEN_PATH} fill={color} />
      )}
    </Svg>
  );
}
