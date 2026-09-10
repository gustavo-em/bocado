import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PRESS, PRESSED_OPACITY, PRESSED_SCALE } from '../theme/motion';

/**
 * The `PRESS` preset for any Pressable: opacity 0.85, optional 0.98 scale,
 * 100 ms, only `transform`/`opacity`. Reduced motion is handled by the preset.
 */
export function usePressAnimation(scale = false) {
  const pressed = useSharedValue(0);

  const onPressIn = useCallback(() => {
    pressed.value = withTiming(1, PRESS);
  }, [pressed]);

  const onPressOut = useCallback(() => {
    pressed.value = withTiming(0, PRESS);
  }, [pressed]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * (1 - PRESSED_OPACITY),
    transform: [{ scale: scale ? 1 - pressed.value * (1 - PRESSED_SCALE) : 1 }],
  }));

  return { style, onPressIn, onPressOut };
}
