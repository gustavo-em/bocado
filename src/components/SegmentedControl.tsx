import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { SELECT } from '../theme/motion';
import { textDefaults } from '../theme/type';
import { haptics } from './haptics';

/** 48 dp overall, so every segment is a legal target on its own. */
export const SEGMENTED_HEIGHT = 48;
const TRACK_PADDING = 4;
/**
 * The pill is inset by the track's padding, which would leave each segment
 * 40 dp tall: the slop gives the finger back the 4 dp above and below without
 * moving anything that is drawn.
 */
const SEGMENT_HIT_SLOP = {
  top: TRACK_PADDING,
  bottom: TRACK_PADDING,
  left: 0,
  right: 0,
};

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** When the visible label is shorter than what should be announced. */
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  /** The group's name for a screen reader ("Sexo", "Idioma"). */
  accessibilityLabel: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * Two or three exclusive choices on one line: a `surfaceMuted` track with a
 * `surface` pill under the selected label. Never accented — the accent stays
 * with the screen's primary action — and the pill moves by `translateX` only
 * (`SELECT`, 120 ms), so nothing lays out while it slides.
 */
export function SegmentedControl<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
  testID,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(0);
  const index = Math.max(
    0,
    options.findIndex(option => option.value === value),
  );
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;

  useEffect(() => {
    const target = segmentWidth * index;
    // The first measurement places the pill without sliding it in from 0.
    offset.value =
      offset.value === 0 && index === 0 ? target : withTiming(target, SELECT);
  }, [index, segmentWidth, offset]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={[
        styles.track,
        {
          padding: TRACK_PADDING,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surfaceMuted,
        },
      ]}
      testID={testID}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.pill,
            {
              top: TRACK_PADDING,
              left: TRACK_PADDING,
              width: segmentWidth,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.surface,
            },
            pillStyle,
          ]}
        />
      ) : null}
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            hitSlop={SEGMENT_HIT_SLOP}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            style={styles.segment}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <Text
              style={[
                selected ? theme.type.bodyMedium : theme.type.body,
                textDefaults,
                { color: selected ? theme.colors.ink : theme.colors.inkMuted },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: SEGMENTED_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pill: {
    position: 'absolute',
    bottom: TRACK_PADDING,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
