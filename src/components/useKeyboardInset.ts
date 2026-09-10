import { useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
} from 'react-native';

type KeyboardFrame = Pick<KeyboardEvent, 'endCoordinates'>;

/**
 * How far the keyboard rises above the bottom safe-area inset, in dp.
 *
 * iOS reports the frame in window coordinates; the modal sheet ends at the
 * window's bottom, so the overlap is window height minus the frame's top.
 * Android already reports the height net of the navigation bar
 * (`ReactRootView.checkForKeyboardEvents`).
 */
function keyboardPadding(event: KeyboardFrame, bottomInset: number): number {
  if (Platform.OS === 'android') {
    return Math.max(0, event.endCoordinates.height);
  }
  const overlap =
    Dimensions.get('window').height - event.endCoordinates.screenY;
  return Math.max(0, overlap - bottomInset);
}

/** Runs the next layout with the keyboard's own duration and curve (iOS). */
function followKeyboard(event: KeyboardEvent): void {
  if (!event.duration || !event.easing) return;
  const duration = Math.max(event.duration, 10);
  LayoutAnimation.configureNext({
    duration,
    update: {
      duration,
      type: LayoutAnimation.Types[event.easing] ?? 'keyboard',
    },
  });
}

/**
 * Bottom padding that keeps the tray above the keyboard.
 *
 * `KeyboardAvoidingView` is not used: on iOS it measures against its own
 * frame, and inside a page-sheet modal that frame starts below the window's
 * top, so the padding falls short by that offset. On Android, RN 0.87 runs
 * edge-to-edge for targetSdk 35+ (`setDecorFitsSystemWindows(false)`), which
 * turns `adjustResize` into a no-op — the root view is never resized for the
 * IME — so the keyboard events are the only signal there too.
 */
export function useKeyboardInset(bottomInset: number): number {
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    const metrics = Keyboard.metrics();
    if (metrics) {
      setPadding(keyboardPadding({ endCoordinates: metrics }, bottomInset));
    }
    const update = (event: KeyboardEvent) => {
      if (Platform.OS === 'ios') followKeyboard(event);
      setPadding(keyboardPadding(event, bottomInset));
    };
    const subscriptions =
      Platform.OS === 'ios'
        ? [Keyboard.addListener('keyboardWillChangeFrame', update)]
        : [
            Keyboard.addListener('keyboardDidShow', update),
            Keyboard.addListener('keyboardDidHide', update),
          ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, [bottomInset]);

  return padding;
}
