import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { PROGRESS } from '../theme/motion';
import { tabularNumbers, textDefaults } from '../theme/type';

export const MACRO_BAR_HEIGHT = 3;

export interface MacroBarProps {
  label: string;
  /** Already formatted, e.g. `42 / 120 g`. */
  value: string;
  /** Consumed / goal, clamped to 1. Past the goal the bar is simply full. */
  ratio: number;
  color: string;
  animate: boolean;
}

/** Design system §2.9: label, value, 4 dp, then a 3 dp bar. The colour never changes. */
export function MacroBar({
  label,
  value,
  ratio,
  color,
  animate,
}: MacroBarProps) {
  const theme = useTheme();
  const fill = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(Math.max(ratio, 0), 1);
    fill.value = animate ? withTiming(target, PROGRESS) : target;
  }, [ratio, animate, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View style={styles.column}>
      <Text
        style={[
          theme.type.label,
          textDefaults,
          { color: theme.colors.inkMuted },
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <Text
        style={[
          theme.type.labelMedium,
          textDefaults,
          tabularNumbers,
          { color: theme.colors.ink },
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.colors.track,
            marginTop: theme.spacing.xs,
          },
        ]}
      >
        <Animated.View
          style={[styles.fill, { backgroundColor: color }, fillStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
  },
  track: {
    height: MACRO_BAR_HEIGHT,
    borderRadius: MACRO_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: MACRO_BAR_HEIGHT / 2,
    transformOrigin: 'left',
  },
});
