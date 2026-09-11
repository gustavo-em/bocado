import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { t } from '../i18n';
import { useTheme } from '../theme';
import { PROGRESS } from '../theme/motion';

/**
 * The spine of the first run: one segment per step, 3 dp tall.
 *
 * Thin on purpose. It answers "how much of this is left" — which is the only
 * reason a first run needs a progress indicator at all — and then gets out of
 * the way. A taller bar, a number, or a label would make the setup look longer
 * than it is.
 */
const SEGMENT_HEIGHT = 3;

export interface StepProgressProps {
  /** How many steps the flow has. */
  total: number;
  /** Which one is on screen, from 1. */
  current: number;
  testID?: string;
}

interface SegmentProps {
  filled: boolean;
  radius: number;
  trackColor: string;
  fillColor: string;
}

function Segment({ filled, radius, trackColor, fillColor }: SegmentProps) {
  const animated = useAnimatedStyle(() => ({
    opacity: withTiming(filled ? 1 : 0, PROGRESS),
  }));

  return (
    <View
      style={[
        styles.segment,
        {
          height: SEGMENT_HEIGHT,
          borderRadius: radius,
          backgroundColor: trackColor,
        },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: fillColor },
          animated,
        ]}
      />
    </View>
  );
}

/**
 * Ink over `track`, never the accent: the accent is the one thing per screen
 * that means "do this", and the step you are on is not an action. The segment
 * that fills does it by crossfading an ink layer over the track — opacity
 * only, so nothing here measures or lays out, and a segment cannot slide in
 * from a side it never had.
 *
 * The whole strip is one accessibility node reading "Passo 2 de 3"; three
 * nodes announcing nothing each is worse than one that says where you are.
 */
export function StepProgress({ total, current, testID }: StepProgressProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.row, { columnGap: theme.spacing.xs }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('onboarding.stepA11y', { step: current, total })}
      testID={testID}
    >
      {Array.from({ length: total }, (_, index) => (
        <Segment
          key={index}
          filled={index < current}
          radius={theme.radii.pill}
          trackColor={theme.colors.track}
          fillColor={theme.colors.ink}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    overflow: 'hidden',
  },
});
