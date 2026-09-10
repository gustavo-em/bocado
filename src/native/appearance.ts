import { NativeModules, Platform } from 'react-native';

import type { AppearanceSetting } from '../theme/colors';

/**
 * The Android side of the appearance choice.
 *
 * `setNightMode` is what makes a cold start open on the right colour: the
 * module mirrors the choice in `SharedPreferences` and `MainApplication` reads
 * that mirror before React is loaded, so `values-night/` and the splash window
 * resolve by the choice instead of by the device.
 *
 * `setLightNavigationBars` and `setBarColors` are needed for the live switch:
 * the bar icons are fixed when edge-to-edge is configured and the bar grounds
 * come from the activity's theme, which is never inflated again because
 * `uiMode` is declared in `configChanges`.
 *
 * The module is optional on purpose. If it is missing — another platform, or a
 * JS-only test — every call is a silent no-op and the JavaScript theme still
 * works on its own.
 */
interface NavigationBarModule {
  setNightMode(mode: string): void;
  setLightNavigationBars(light: boolean): void;
  setBarColors(color: string): void;
  releaseLaunchBackground(): void;
}

/**
 * Asked on every call, never once at import time: this module is pulled in by
 * the theme before the first render, and under the TurboModule interop the
 * registry can answer later than that. A value cached here would freeze the
 * wrapper into a no-op for the whole session.
 */
function mod(): NavigationBarModule | undefined {
  if (Platform.OS !== 'android') return undefined;
  return NativeModules.BocadoNavigationBar as NavigationBarModule | undefined;
}

/** True when the native module answers: the choice reaches Android. */
export function hasNativeAppearance(): boolean {
  return mod() != null;
}

export function setNightMode(setting: AppearanceSetting): void {
  mod()?.setNightMode(setting);
}

export function setLightNavigationBars(light: boolean): void {
  mod()?.setLightNavigationBars(light);
}

export function setBarColors(color: string): void {
  mod()?.setBarColors(color);
}

/**
 * Called once, when the opening is over. The launch window carries the disc
 * until React Native has drawn, and this lets Android drop that drawable for
 * the flat ground of the same colour — same surface, nothing left to compose
 * behind every frame. A no-op without the module, which only means the window
 * keeps a bitmap the user cannot see.
 */
export function releaseLaunchBackground(): void {
  mod()?.releaseLaunchBackground();
}
