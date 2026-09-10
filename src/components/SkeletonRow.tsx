import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radii, resultRowHeight, useTheme } from '../theme';
import { FADE } from '../theme/motion';

/** Bars of the same weight as the two lines of a result row (§2.4). */
const TITLE_HEIGHT = 14;
const SUBTITLE_HEIGHT = 12;
const TITLE_WIDTH = '60%';
const SUBTITLE_WIDTH = '40%';
/** The right-hand kcal column of the row, kept as a block. */
const KCAL_WIDTH = 44;

/**
 * The shape of a result row while the online half of the search is still out:
 * the same height, the same two lines, the same right-hand column — so when
 * the real rows land, nothing on screen moves.
 *
 * No shimmer and no spinner on purpose: this is the calmest way to say "more
 * is coming" without anything blinking on a 2 GB phone.
 */
export function SkeletonRow() {
  const theme = useTheme();
  const bar = { backgroundColor: theme.colors.track };
  return (
    <View
      style={[
        styles.row,
        {
          height: resultRowHeight,
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
        },
      ]}
    >
      <View style={styles.body}>
        <View style={[styles.title, bar]} />
        <View style={[styles.subtitle, bar, { marginTop: theme.spacing.sm }]} />
      </View>
      <View style={[styles.kcal, bar, { marginLeft: theme.spacing.sm }]} />
    </View>
  );
}

export interface SkeletonRowsProps {
  /** How many rows to hold the place of. */
  count: number;
  accessibilityLabel: string;
  testID?: string;
}

/** A short run of skeleton rows, fading in as one block. */
export function SkeletonRows({
  count,
  accessibilityLabel,
  testID,
}: SkeletonRowsProps) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, FADE);
  }, [enter]);
  const style = useAnimatedStyle(() => ({ opacity: enter.value }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={style}
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    height: TITLE_HEIGHT,
    width: TITLE_WIDTH,
    borderRadius: radii.xs,
  },
  subtitle: {
    height: SUBTITLE_HEIGHT,
    width: SUBTITLE_WIDTH,
    borderRadius: radii.xs,
  },
  kcal: {
    height: TITLE_HEIGHT,
    width: KCAL_WIDTH,
    borderRadius: radii.xs,
  },
});
