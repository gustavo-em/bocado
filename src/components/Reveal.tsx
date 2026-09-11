import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  ENTRY_IN,
  ENTRY_RISE_DP,
  ONBOARDING_STAGGER_MS,
} from '../theme/motion';

export interface RevealProps {
  /**
   * Position in the sequence, from 0. It is the block's place on the screen,
   * not a duration: the delay is `index × ONBOARDING_STAGGER_MS`, so two
   * blocks that should arrive together share an index.
   */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * A block arriving once, when its screen does: opacity from zero and a 12 dp
 * rise, with `ENTRY_IN` and the first-run stagger.
 *
 * It animates on mount and never again — a block that re-runs this on every
 * state change is how a form starts flickering while it is being typed into.
 * Only `transform` and `opacity` move, which is what keeps it cheap on the
 * reference device.
 *
 * Under reduced motion the presets collapse to their end values, so the block
 * is simply there; the stagger is dropped too, because a delay with no
 * movement is a screen that appears in pieces for no reason.
 */
export function Reveal({ index = 0, style, children }: RevealProps) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withDelay(
      reduced ? 0 : index * ONBOARDING_STAGGER_MS,
      withTiming(1, ENTRY_IN),
    );
    // Mount only, on purpose: see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animated = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * ENTRY_RISE_DP }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
