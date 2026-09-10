import { Platform } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';

import { prefs } from '../data/prefs/prefs';

const OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
} as const;

/**
 * The same four events on both platforms, each spelled in the local dialect:
 * Android has predefined effects, iOS has the feedback generators. Anything
 * else — `Vibration.vibrate` above all — feels like a different app.
 */
const EFFECT = Platform.select({
  android: {
    selection: 'clockTick',
    added: 'effectClick',
    success: 'effectDoubleClick',
    error: 'effectHeavyClick',
  },
  default: {
    selection: 'selection',
    added: 'impactLight',
    success: 'notificationSuccess',
    error: 'notificationError',
  },
} as const);

/**
 * True once "Concluir" has been felt in this add session. A single success is
 * a full stop; repeating it on every "Concluir" would turn the calmest moment
 * of the flow into a nag.
 */
let successSpent = false;

type HapticEffect = Parameters<typeof trigger>[0];

function fire(effect: HapticEffect): void {
  if (!prefs.hapticsEnabled()) return;
  trigger(effect, OPTIONS);
}

/**
 * The one place haptics are fired, so the same event always feels the same:
 * a food added → a light click; a session concluded → one success, once.
 *
 * "Vibração ao registrar" in "Metas" turns all of it off; the preference is
 * read at the moment of the tap (a synchronous MMKV read) so a change takes
 * effect on the next tap, with no subscription to keep in sync.
 */
export const haptics = {
  /** A food landed in the diary. */
  added(): void {
    fire(EFFECT.added);
  },
  /**
   * The session ended on "Concluir". Silent if it already happened in this
   * session; `resetSuccess` opens the next one.
   */
  success(): void {
    if (successSpent) return;
    successSpent = true;
    fire(EFFECT.success);
  },
  /** A new add session begins: the success is available again. */
  resetSuccess(): void {
    successSpent = false;
  },
  /** A chip taking the selection, a stepper ticking one step. */
  selection(): void {
    fire(EFFECT.selection);
  },
  /** A value refused: the same weight as the shake that goes with it. */
  error(): void {
    fire(EFFECT.error);
  },
};
