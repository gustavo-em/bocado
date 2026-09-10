import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { PROGRESS } from '../theme/motion';

export const PROGRESS_BAR_HEIGHT = 4;
const OVER_GAP = 2;

export interface ProgressBarProps {
  /** Consumed / goal, clamped to 1. */
  ratio: number;
  /** Portion of the bar shown in `overGoal` (overBy / consumed); 0 when not over. */
  overRatio: number;
  /** `false` on the first paint of a day so the bar does not fill from zero. */
  animate: boolean;
}

/**
 * Design system §2.8: 4 dp track, `accent` fill, and past the goal a 2 dp gap
 * followed by an `overGoal` segment so the bar always ends full. Both segments
 * are full-width views scaled on X, so nothing relayouts while animating.
 */
export function ProgressBar({ ratio, overRatio, animate }: ProgressBarProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const over = useSharedValue(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    const isOver = overRatio > 0;
    const gap = isOver && width > 0 ? OVER_GAP / width : 0;
    const fillTarget = isOver
      ? Math.max(1 - overRatio - gap, 0)
      : Math.min(Math.max(ratio, 0), 1);
    const overTarget = Math.min(Math.max(overRatio, 0), 1);
    if (animate) {
      fill.value = withTiming(fillTarget, PROGRESS);
      over.value = withTiming(overTarget, PROGRESS);
    } else {
      fill.value = fillTarget;
      over.value = overTarget;
    }
  }, [ratio, overRatio, animate, width, fill, over]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));
  const overStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: over.value }],
  }));

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.track,
        {
          backgroundColor: theme.colors.track,
          borderRadius: PROGRESS_BAR_HEIGHT / 2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          styles.fromLeft,
          { backgroundColor: theme.colors.accent },
          fillStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.fill,
          styles.fromRight,
          { backgroundColor: theme.colors.overGoal },
          overStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: PROGRESS_BAR_HEIGHT,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  fromLeft: {
    transformOrigin: 'left',
  },
  fromRight: {
    transformOrigin: 'right',
  },
});
