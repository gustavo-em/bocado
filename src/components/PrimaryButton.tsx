import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { CONFIRM, CONFIRM_SCALE_FROM } from '../theme/motion';
import { textDefaults } from '../theme/type';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

/** Design system §2.1: text sits 20 dp from each end. */
const PADDING_HORIZONTAL = 20;

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  /**
   * Nothing to confirm yet. The button keeps its place and its words — it
   * just stops being the accent and stops answering, so the missing value is
   * what the eye goes back to.
   */
  disabled?: boolean;
  /**
   * The action is done. The button keeps its box, its colour and its place —
   * only its content changes: the words leave and the "✓" arrives, right
   * where the finger already is. It answers no further taps.
   */
  confirmed?: boolean;
  testID?: string;
}

/**
 * Design system §2.1: the one filled button — 48 dp, `accent` on `onAccent`,
 * radius `md`. Its width is its content; the tray decides where it goes.
 *
 * `confirmed` is the same button saying the thing is done: no colour change —
 * green and red are spoken for (DECISIONS §7) and a success colour is not an
 * accent — just the label fading out and the "✓" fading and growing in over
 * it, in `CONFIRM`, the same 200 ms the "+" already spends becoming a "✓".
 */
export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  confirmed = false,
  testID,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const press = usePressAnimation(true);
  const inert = disabled || confirmed;

  const confirm = useSharedValue(confirmed ? 1 : 0);
  useEffect(() => {
    confirm.value = withTiming(confirmed ? 1 : 0, CONFIRM);
  }, [confirmed, confirm]);
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - confirm.value }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: confirm.value,
    transform: [
      {
        scale: CONFIRM_SCALE_FROM + (1 - CONFIRM_SCALE_FROM) * confirm.value,
      },
    ],
  }));

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      onPressIn={inert ? undefined : press.onPressIn}
      onPressOut={inert ? undefined : press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.button,
          {
            minHeight: theme.touchTarget,
            backgroundColor: disabled
              ? theme.colors.surfaceMuted
              : theme.colors.accent,
            borderRadius: theme.radii.md,
          },
          disabled ? null : press.style,
        ]}
      >
        <Animated.Text
          style={[
            theme.type.bodyMedium,
            textDefaults,
            {
              color: disabled ? theme.colors.inkSubtle : theme.colors.onAccent,
            },
            labelStyle,
          ]}
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
        {/*
          Laid over the label instead of replacing it: the button must not
          change width or height on a phone that cannot afford a re-layout.
          Decorative — the entry itself is announced by the snackbar — so a
          screen reader hears the button's own label and nothing twice.
        */}
        <View
          style={styles.check}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Animated.View style={checkStyle}>
            <Icon name="check" size="action" color={theme.colors.onAccent} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: PADDING_HORIZONTAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  check: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
