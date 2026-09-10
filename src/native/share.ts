import { NativeModules, Platform } from 'react-native';

/**
 * The Android side of sharing: a file in the app's cache handed to
 * `Intent.createChooser`. Nothing here talks to a network, and there is no
 * destination to pick — the chooser is the destination.
 *
 * The module is optional in the same way the appearance bridge is: without it
 * (another platform, a JS-only test) `isShareAvailable` is false and the sheet
 * says it could not share instead of throwing.
 */
interface ShareNativeModule {
  shareText(text: string, title: string): Promise<void>;
  shareImage(base64Png: string, fileName: string, title: string): Promise<void>;
}

/**
 * What went wrong, so the sheet can say the right sentence: an image that
 * could not be made is not the same as a phone with nothing to share to, and
 * neither is the same as the bridge not answering — which happens to the
 * plain text too, where "the image could not be created" would be nonsense.
 */
export type ShareErrorCode =
  /** The drawing never became a PNG (see `captureCard`). */
  | 'share_capture_failed'
  /** The PNG could not be written into the cache or exposed. */
  | 'share_write_failed'
  /** Nothing on the phone can receive it. */
  | 'share_no_app'
  /** The native module is not there at all. */
  | 'share_unavailable'
  | 'unknown';

const CODES: readonly ShareErrorCode[] = [
  'share_capture_failed',
  'share_write_failed',
  'share_no_app',
  'share_unavailable',
];

export function shareErrorCode(error: unknown): ShareErrorCode {
  const code = (error as { code?: string } | null)?.code;
  const known = CODES.find(candidate => candidate === code);
  return known ?? 'unknown';
}

/** An error the sheet can read the code of, whatever threw it. */
export function shareError(code: ShareErrorCode, message: string): Error {
  return Object.assign(new Error(message), { code });
}

// Asked on every call, never cached: under the TurboModule interop the
// registry can answer later than the first import (see native/appearance.ts).
function mod(): ShareNativeModule | undefined {
  if (Platform.OS !== 'android') return undefined;
  return NativeModules.BocadoShare as ShareNativeModule | undefined;
}

export function isShareAvailable(): boolean {
  return mod() != null;
}

export async function shareText(text: string, title: string): Promise<void> {
  const native = mod();
  if (!native) {
    throw shareError('share_unavailable', 'BocadoShare is not available');
  }
  await native.shareText(text, title);
}

/** `base64Png` is the raw base64 the SVG produced, with no data: prefix. */
export async function shareImage(
  base64Png: string,
  fileName: string,
  title: string,
): Promise<void> {
  const native = mod();
  if (!native) {
    throw shareError('share_unavailable', 'BocadoShare is not available');
  }
  await native.shareImage(base64Png, fileName, title);
}
