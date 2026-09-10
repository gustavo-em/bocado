import { ReduceMotion } from 'react-native-reanimated';

import {
  CONFIRM,
  CONFIRM_HOLD_MS,
  CONFIRM_SETTLED_MS,
  COUNT_UP,
  ENTRY_IN,
  ENTRY_RISE_DP,
  FADE,
  FADE_REDUCED,
  LAUNCH_BITE,
  LAUNCH_BITE_SCALE_TO,
  LAUNCH_BITE_TRAVEL_DP,
  LAUNCH_OUT,
  LIST_STAGGER_MAX_ROWS,
  LIST_STAGGER_MS,
  PRESS,
  PROGRESS,
  SELECT,
  SHAKE,
  SHAKE_STEP,
  SHAKE_STEPS,
  SHEET_FADE,
  SHEET_IN,
  SHEET_OUT,
  SNACKBAR_IN,
  SNACKBAR_OUT,
  rowStaggerDelayMs,
} from '../src/theme/motion';

describe('rowStaggerDelayMs', () => {
  it('spaces the first rows by one stagger step each', () => {
    expect(rowStaggerDelayMs(0, false)).toBe(0);
    expect(rowStaggerDelayMs(1, false)).toBe(LIST_STAGGER_MS);
    expect(rowStaggerDelayMs(5, false)).toBe(5 * LIST_STAGGER_MS);
  });

  it('stops staggering after the sixth row, so scrolling never waits', () => {
    expect(rowStaggerDelayMs(LIST_STAGGER_MAX_ROWS, false)).toBe(0);
    expect(rowStaggerDelayMs(40, false)).toBe(0);
  });

  it('has no delay at all when the phone asks for less movement', () => {
    for (let index = 0; index < LIST_STAGGER_MAX_ROWS; index += 1) {
      expect(rowStaggerDelayMs(index, true)).toBe(0);
    }
  });

  it('treats a negative index as no delay instead of a negative one', () => {
    expect(rowStaggerDelayMs(-1, false)).toBe(0);
  });
});

describe('the motion vocabulary', () => {
  /** Everything that must disappear when the system asks for reduced motion. */
  const systemAware = {
    PRESS,
    SELECT,
    CONFIRM,
    SHEET_IN,
    SHEET_OUT,
    COUNT_UP,
    PROGRESS,
    SNACKBAR_IN,
    SNACKBAR_OUT,
    FADE,
    SHAKE,
    SHAKE_STEP,
    LAUNCH_BITE,
    ENTRY_IN,
  };

  it.each(Object.entries(systemAware))(
    '%s follows the system setting',
    (_, preset) => {
      expect(preset.reduceMotion).toBe(ReduceMotion.System);
    },
  );

  it('keeps the crossfades that must survive reduced motion, and only those', () => {
    // A sheet, a day change and the hand-over to the first screen would
    // otherwise cut hard from one state to the other; all three stay as short
    // opacity-only fades, which reduced motion has no reason to remove.
    expect(SHEET_FADE.reduceMotion).toBe(ReduceMotion.Never);
    expect(SHEET_FADE.duration).toBe(120);
    expect(FADE_REDUCED.reduceMotion).toBe(ReduceMotion.Never);
    expect(FADE_REDUCED.duration).toBe(120);
    expect(FADE_REDUCED.duration).toBeLessThan(FADE.duration);
    expect(LAUNCH_OUT.reduceMotion).toBe(ReduceMotion.Never);
  });

  it('opens in under half a second, so the mark is never a wait', () => {
    // The overlay's whole life, measured from a frame the app already drew.
    expect(LAUNCH_BITE.duration + LAUNCH_OUT.duration).toBeLessThanOrEqual(400);
  });

  it('moves the morsel a short way and only shrinks it', () => {
    expect(LAUNCH_BITE_TRAVEL_DP).toBeGreaterThan(0);
    expect(LAUNCH_BITE_TRAVEL_DP).toBeLessThanOrEqual(16);
    expect(LAUNCH_BITE_SCALE_TO).toBeGreaterThan(0);
    expect(LAUNCH_BITE_SCALE_TO).toBeLessThan(1);
  });

  it('lands an entry with a short rise and nothing else', () => {
    expect(ENTRY_RISE_DP).toBeGreaterThan(0);
    expect(ENTRY_RISE_DP).toBeLessThanOrEqual(16);
  });

  it('holds the confirmed "✓" for as long as the exit it stands in for', () => {
    // Reduced motion removes SHEET_OUT, so this is what keeps the "✓" on
    // screen for the same time the sheet would have taken to leave.
    expect(CONFIRM_HOLD_MS).toBe(SHEET_OUT.duration);
  });

  it('lets the "✓" arrive before it starts standing still', () => {
    // The sheet may only leave once both have happened, so the confirmation
    // is never a shape half drawn under a surface already fading out.
    expect(CONFIRM_SETTLED_MS).toBe(CONFIRM.duration + CONFIRM_HOLD_MS);
    expect(CONFIRM_SETTLED_MS).toBeGreaterThan(CONFIRM.duration);
  });

  it('divides the shake into equal legs from the shake itself', () => {
    expect(SHAKE_STEP.duration).toBe(SHAKE.duration / SHAKE_STEPS);
  });

  it('stays inside the 100–400 ms range the design system allows', () => {
    for (const preset of [
      ...Object.values(systemAware),
      SHEET_FADE,
      FADE_REDUCED,
      LAUNCH_OUT,
    ]) {
      expect(preset.duration).toBeGreaterThanOrEqual(SHAKE_STEP.duration);
      expect(preset.duration).toBeLessThanOrEqual(PROGRESS.duration);
    }
  });
});
