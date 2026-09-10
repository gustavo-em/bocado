import type Svg from 'react-native-svg';

import { CARD_HEIGHT, CARD_WIDTH } from '../../domain/share/dayCard';
import { shareError } from '../../native/share';

const SHARE_LOG_TAG = '[bocado:share]';
/**
 * `toDataURL` answers through a callback with no failure path of its own: if
 * the drawing never reaches the screen the callback simply never comes, and
 * the sheet would sit spinning. This is how long it is given before the sheet
 * says it could not make the image.
 */
const CAPTURE_TIMEOUT_MS = 8000;

/**
 * The drawing as a base64 PNG, at the piece's own 1080 × 1350 whatever size
 * the view has on screen: the bitmap is created from these numbers and the
 * view box is mapped onto it, so the PNG never depends on the phone's density.
 *
 * The time it took is logged in development, which is where the J6 numbers in
 * the task's summary come from. Nothing is written to disk here and nothing
 * leaves the process: the base64 goes straight to the native module, which
 * writes it into the app's own cache.
 */
export function captureCard(svg: Svg | null, label: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!svg) {
      reject(
        shareError('share_capture_failed', `${label}: the card is not mounted`),
      );
      return;
    }
    const started = Date.now();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        shareError(
          'share_capture_failed',
          `${label}: timed out after ${CAPTURE_TIMEOUT_MS} ms`,
        ),
      );
    }, CAPTURE_TIMEOUT_MS);

    svg.toDataURL(
      base64 => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (__DEV__) {
          const kb = Math.round((base64?.length ?? 0) * 0.75) / 1024;
          console.log(
            `${SHARE_LOG_TAG} ${label} drawn in ${
              Date.now() - started
            } ms, ${kb.toFixed(0)} KB`,
          );
        }
        if (!base64) {
          reject(
            shareError('share_capture_failed', `${label}: nothing was drawn`),
          );
          return;
        }
        resolve(base64);
      },
      { width: CARD_WIDTH, height: CARD_HEIGHT },
    );
  });
}

/** How many frames a piece is given to mount after a press. */
const MOUNT_FRAMES = 60;

/**
 * The piece, once React has put it on screen.
 *
 * The rows are live from the first frame, so a press can land before the day
 * has been read and the drawing mounted. Waiting a few frames here is what
 * lets the sheet answer that press instead of refusing it.
 */
export function waitForCard(
  get: () => Svg | null,
  label: string,
): Promise<Svg> {
  return new Promise<Svg>((resolve, reject) => {
    let left = MOUNT_FRAMES;
    const look = () => {
      const svg = get();
      if (svg) {
        resolve(svg);
        return;
      }
      left -= 1;
      if (left <= 0) {
        reject(
          shareError(
            'share_capture_failed',
            `${label}: the card never mounted`,
          ),
        );
        return;
      }
      requestAnimationFrame(look);
    };
    look();
  });
}

/** `bocado-dia-2026-09-09.png`: one file, replaced on every share. */
export function dayFileName(day: string): string {
  return `bocado-dia-${day}.png`;
}

/** `bocado-mes-2026-09.png`, from any day of that month. */
export function monthFileName(monthStart: string): string {
  return `bocado-mes-${monthStart.slice(0, 7)}.png`;
}
