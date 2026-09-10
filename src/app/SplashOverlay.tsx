import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BrandMark } from '../components/BrandMark';
import { releaseLaunchBackground } from '../native/appearance';
import { useTheme } from '../theme';
import {
  LAUNCH_BITE,
  LAUNCH_BITE_SCALE_TO,
  LAUNCH_BITE_TRAVEL_DP,
  LAUNCH_OUT,
} from '../theme/motion';

/**
 * How wide the mark is drawn on the launch window, in dp.
 *
 * This is the same number as `SPLASH_MARK_DP` in
 * `scripts/generate-brand-assets.mjs`, and it is the whole reason the two
 * launch-window assets are authored the way they are: `splash_icon` at 96 dp
 * for the pre-31 layer list, which honours intrinsic size, and
 * `splash_icon_v31` on a 240 dp canvas for the SplashScreen API, which scales
 * the drawable to its own canvas. Both put the disc on screen at this size, so
 * it does not resize when JavaScript takes over. Changing it here without
 * changing it there is what would make the disc jump.
 */
const MARK_DP = 56;

/** The travel split over the mark's −45° axis, so it leaves up and right. */
const TRAVEL = LAUNCH_BITE_TRAVEL_DP / Math.SQRT2;

const TOTAL_MS = LAUNCH_BITE.duration + LAUNCH_OUT.duration;

/**
 * The opening: the bite the mark is named after, taken.
 *
 * The Android launch window (`drawable/splash_background.xml`) already drew
 * the disc whole on the app's own ground. This redraws it at the same size in
 * the same place, lets the morsel leave, then fades the ground away onto the
 * first screen — which by then has been mounted and drawn underneath for the
 * whole time, because this is a sibling of the navigator and never a gate.
 *
 * Three rules it exists to keep:
 *
 *  - it can never be a wait: the clock starts on a frame that was already
 *    drawn, so the app is never held back to let an animation finish;
 *  - it can never swallow a touch: `pointerEvents="none"` means a finger that
 *    lands on "Adicionar" during these 400 ms reaches "Adicionar";
 *  - it can never flash: the ground is `background`, the same value the
 *    window, the navigator and the first screen are painted with, in both
 *    themes.
 *
 * Only `transform` and `opacity` move. Nothing here changes layout.
 */
export function SplashOverlay() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);

  const bite = useSharedValue(0);
  const ground = useSharedValue(1);

  useEffect(() => {
    // requestAnimationFrame, not an effect on its own: the effect runs before
    // the first frame is on screen, and starting there would animate over a
    // ground the user has not seen settle yet.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const frame = requestAnimationFrame(() => {
      if (!reduced) bite.value = withTiming(1, LAUNCH_BITE);
      ground.value = withDelay(LAUNCH_BITE.duration, withTiming(0, LAUNCH_OUT));
      timer = setTimeout(() => {
        // The launch window has no more to show: "Hoje" is painted and the
        // overlay is spent. Hand its drawable back before unmounting, so the
        // bitmap is not composed behind every frame for the rest of the run.
        releaseLaunchBackground();
        setDone(true);
      }, TOTAL_MS);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== null) clearTimeout(timer);
    };
  }, [bite, ground, reduced]);

  const groundStyle = useAnimatedStyle(() => ({ opacity: ground.value }));
  const morselStyle = useAnimatedStyle(() => ({
    opacity: 1 - bite.value,
    transform: [
      { translateX: bite.value * TRAVEL },
      { translateY: bite.value * -TRAVEL },
      { scale: 1 - bite.value * (1 - LAUNCH_BITE_SCALE_TO) },
    ],
  }));

  if (done) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.ground,
        groundStyle,
        { backgroundColor: theme.colors.background },
      ]}
      testID="splash-overlay"
    >
      <View style={[StyleSheet.absoluteFill, styles.centre]}>
        <BrandMark size={MARK_DP} color={theme.colors.ink} state="bitten" />
      </View>
      {/*
        The morsel rides its own centred layer, so it sits exactly in the notch
        it came from and can leave without the mark moving with it. Under
        reduced motion it is never drawn: the mark is simply already bitten.
      */}
      {reduced ? null : (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.centre, morselStyle]}
        >
          <BrandMark size={MARK_DP} color={theme.colors.ink} state="morsel" />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /** Above the navigator it covers; it is painted after it either way. */
  ground: { zIndex: 1 },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
