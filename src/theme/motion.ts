import { Easing, ReduceMotion } from 'react-native-reanimated';

/**
 * The app's whole motion vocabulary, in one file.
 *
 * Every animation is built from these. A screen that invents its own duration
 * is how an interface starts feeling assembled by different people.
 * `ReduceMotion.System` is set on all of them, so a phone asking for less
 * movement gets it without a single screen having to check.
 *
 * Only `transform` and `opacity` are animated: the reference device is a
 * 2 GB Galaxy J6 and layout animations are what make it stutter.
 */

/** Material 3 "emphasized" curves: slow in, fast out. */
const emphasizedDecelerate = Easing.bezier(0.05, 0.7, 0.1, 1);
const emphasizedAccelerate = Easing.bezier(0.3, 0, 0.8, 0.15);
const standard = Easing.bezier(0.2, 0, 0, 1);

/** A tap answering under the finger. Quick, barely visible, always there. */
export const PRESS = {
  duration: 100,
  easing: standard,
  reduceMotion: ReduceMotion.System,
} as const;
export const PRESSED_OPACITY = 0.85;
export const PRESSED_SCALE = 0.98;

/** A chip becoming selected, a stepper ticking. */
export const SELECT = {
  duration: 120,
  easing: standard,
  reduceMotion: ReduceMotion.System,
} as const;

/** The "+" turning into "✓". */
export const CONFIRM = {
  duration: 200,
  easing: standard,
  reduceMotion: ReduceMotion.System,
} as const;
export const CONFIRM_SCALE_FROM = 0.8;
/**
 * How long the finished "✓" stands still, once it has arrived.
 *
 * It cannot share those frames with the sheet's exit: `SHEET_FADE` takes the
 * whole surface to zero in 120 ms while the "✓" is still growing, and the two
 * opacities multiply into something nobody can see. Reduced motion needs the
 * same beat for the opposite reason — it removes the exit altogether.
 */
export const CONFIRM_HOLD_MS = 200;
/**
 * The whole of the confirmation, from the tap to the moment the sheet may
 * start leaving: the "✓" arriving, and then standing still long enough to be
 * read. Nothing about the entry waits for it — the row is written at the
 * touch and the snackbar counts from there.
 */
export const CONFIRM_SETTLED_MS = CONFIRM.duration + CONFIRM_HOLD_MS;

/** A sheet or the tray arriving: a whole surface moves, so it is slower. */
export const SHEET_IN = {
  duration: 300,
  easing: emphasizedDecelerate,
  reduceMotion: ReduceMotion.System,
} as const;
export const SHEET_OUT = {
  duration: 200,
  easing: emphasizedAccelerate,
  reduceMotion: ReduceMotion.System,
} as const;
/**
 * The sheet's opacity, and the whole of its motion when the phone asks for
 * less: `SHEET_IN`/`SHEET_OUT` stop moving under Reduce Motion, so this
 * 120 ms crossfade is what remains — hence `Never`, on purpose.
 */
export const SHEET_FADE = {
  duration: 120,
  easing: standard,
  reduceMotion: ReduceMotion.Never,
} as const;
/** How far down the sheet must be dragged, or how fast, to close. */
export const SHEET_DISMISS_DP = 96;
export const SHEET_DISMISS_VELOCITY = 800;

/** Numbers rolling to a new total. Always with tabular numerals. */
export const COUNT_UP = {
  duration: 300,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** The daily bar filling from its previous value. */
export const PROGRESS = {
  duration: 400,
  easing: standard,
  reduceMotion: ReduceMotion.System,
} as const;

/** Snackbar in and out. */
export const SNACKBAR_IN = {
  duration: 150,
  easing: emphasizedDecelerate,
  reduceMotion: ReduceMotion.System,
} as const;
export const SNACKBAR_OUT = {
  duration: 100,
  easing: emphasizedAccelerate,
  reduceMotion: ReduceMotion.System,
} as const;
export const SNACKBAR_VISIBLE_MS = 4000;
/**
 * How long the snackbar stays while a screen reader is on, so "Desfazer" can
 * be reached by focus (Android's own "Time to take action" first step).
 */
export const SNACKBAR_VISIBLE_SCREEN_READER_MS = 10_000;

/** Content swapping when the day changes. */
export const FADE = {
  duration: 180,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;
/**
 * The same crossfade when the phone asks for less movement. `FADE` would be
 * cut to nothing by `ReduceMotion.System`, and a hard cut between two days is
 * harsher than a short fade — so this one opts out on purpose, like
 * `SHEET_FADE`: shorter, still only opacity, never any travel.
 */
export const FADE_REDUCED = {
  duration: 120,
  easing: standard,
  reduceMotion: ReduceMotion.Never,
} as const;

/**
 * The opening. The launch window draws the disc whole; the app redraws it in
 * the same place and the morsel leaves, which is the whole of the animation.
 *
 * It is never a wait: the clock only starts on a frame the app has already
 * drawn, and the overlay lets every touch through while it plays. Under
 * reduced motion the morsel is not drawn at all, so the mark is simply there,
 * already bitten, with no travel.
 */
export const LAUNCH_BITE = {
  duration: 220,
  easing: emphasizedAccelerate,
  reduceMotion: ReduceMotion.System,
} as const;
/** How far the morsel travels, along the mark's own −45° bite axis. */
export const LAUNCH_BITE_TRAVEL_DP = 10;
/** It shrinks as it goes, the way something moving away does. */
export const LAUNCH_BITE_SCALE_TO = 0.85;
/**
 * The ground handing over to the first screen. `Never`, like `SHEET_FADE`:
 * both sides of this crossfade are the same colour, so what it hides is the
 * mark disappearing — cutting that hard is worse than a short fade, and it
 * costs no travel.
 */
export const LAUNCH_OUT = {
  duration: 180,
  easing: standard,
  reduceMotion: ReduceMotion.Never,
} as const;

/**
 * A logged entry landing in its meal. Slower and with more travel than a
 * search result appearing: this one is the answer to a tap the user has just
 * made, and it is the only row moving on the screen.
 */
export const ENTRY_IN = {
  duration: 260,
  easing: emphasizedDecelerate,
  reduceMotion: ReduceMotion.System,
} as const;
/** How far below its place the entry starts. Rises, settles, stops. */
export const ENTRY_RISE_DP = 12;

/** Result rows appearing: opacity + 8 dp rise, 20 ms apart, first six only. */
export const LIST_STAGGER_MS = 20;
export const LIST_STAGGER_MAX_ROWS = 6;
export const LIST_RISE_DP = 8;

/**
 * How long a row waits before it appears. The stagger is a hint that the list
 * arrived in order, not a queue to sit through: it stops after the sixth row,
 * and reduced motion removes it altogether.
 */
export function rowStaggerDelayMs(index: number, reduced: boolean): number {
  if (reduced || index < 0 || index >= LIST_STAGGER_MAX_ROWS) return 0;
  return index * LIST_STAGGER_MS;
}

/** A small, contained "no": two cycles of 4 dp. */
export const SHAKE = {
  duration: 200,
  easing: standard,
  reduceMotion: ReduceMotion.System,
} as const;
export const SHAKE_DP = 4;
/** The five legs of that shake (out, back, out, back, centre). */
export const SHAKE_STEPS = 5;
/** One leg of the shake, so no screen divides a duration on its own. */
export const SHAKE_STEP = {
  ...SHAKE,
  duration: SHAKE.duration / SHAKE_STEPS,
} as const;
