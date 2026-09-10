import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { t } from '../i18n';
import { useTheme } from '../theme';
import { SNACKBAR_IN, SNACKBAR_OUT } from '../theme/motion';
import { textDefaults } from '../theme/type';
import { usePressAnimation } from './usePressAnimation';

/** The rise the snackbar makes while fading in (design system §2.11). */
const RISE_DP = 8;
/** Keeps the snackbar above the list in draw and touch order. */
const ABOVE_LIST = 1;

/**
 * The sentence half of the pill owns every touch inside it, so the list row
 * underneath never gets one. It is a sibling of "Desfazer", not an ancestor:
 * the button negotiates its own taps and nothing above it claims first.
 */
const claimTouch = () => true;

export interface SnackbarMessage {
  /** The food that was just added or removed; shrinks first when long. */
  food: string;
  /** The meal it went to ("Almoço"). */
  meal: string;
  /**
   * What happened. Defaults to an addition. `text` is a whole sentence of its
   * own ("Almoço copiado", "Sugestões limpas"): `food` carries it and the
   * second line is left out.
   */
  kind?: 'added' | 'removed' | 'text';
}

export interface SnackbarProps {
  /** `null` hides the snackbar; a new object replaces the text in place. */
  message: SnackbarMessage | null;
  /**
   * Left out when there is nothing to undo — a failure that changed nothing
   * has no "Desfazer" to offer, and a button that undoes nothing is worse
   * than no button. The pill then keeps the whole width for the sentence.
   */
  onUndo?: () => void;
  /** Distance from the bottom of the container (above the tray). */
  bottom: number;
  testID?: string;
}

function UndoButton({
  onPress,
  testID,
}: {
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={t('search.undo')}
      style={[
        styles.undo,
        {
          minHeight: theme.touchTarget,
          minWidth: theme.touchTarget,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
      testID={testID}
    >
      <Animated.View style={press.style}>
        <Text
          style={[
            theme.type.bodyMedium,
            textDefaults,
            { color: theme.colors.inverseAccent },
          ]}
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
        >
          {t('search.undo')}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Design system §2.11: one snackbar, `inverseSurface`, 8 dp above the tray.
 * Two stacked lines so both halves of the sentence always survive on a 360 dp
 * screen: the food name on top (one line, ellipsis at the end) and
 * "adicionado ao Almoço" below it in label size; "Desfazer" keeps its place on
 * the right. On one line the tail alone ("adicionado ao Café da manhã" plus
 * the button) is wider than the pill, so the name would get no width at all.
 * Only the drawn pill blocks the list beneath it; the margins around it do
 * not. The pill is not a live region: the session announces the addition
 * itself (with the kcal, and the removal after "Desfazer"), and a live region
 * that fades in from alpha 0 is skipped by TalkBack anyway.
 */
export function Snackbar({ message, onUndo, bottom, testID }: SnackbarProps) {
  const theme = useTheme();
  const visible = message !== null;
  const [rendered, setRendered] = useState(visible);
  // Mount in the same commit as the message, not one effect later, so the
  // pill is under the finger from the first frame after "+".
  if (visible && !rendered) setRendered(true);
  const shown = useRef<SnackbarMessage | null>(message);
  if (message) shown.current = message;
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, SNACKBAR_IN);
    } else {
      progress.value = withTiming(0, SNACKBAR_OUT, finished => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
  }, [visible, progress]);

  const motion = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_DP }],
  }));

  const current = shown.current;
  if (!rendered || !current) return null;

  const removal = current.kind === 'removed';
  const plain = current.kind === 'text';
  const sentence = plain
    ? current.food
    : removal
    ? t('search.removed', { food: current.food })
    : t('search.added', { food: current.food, meal: current.meal });
  const tail = removal
    ? t('search.removedTail')
    : t('search.addedTail', { meal: current.meal });
  const textStyle = [
    theme.type.body,
    textDefaults,
    { color: theme.colors.onInverseSurface },
  ];

  return (
    <Animated.View
      style={[
        styles.snackbar,
        {
          bottom,
          marginHorizontal: theme.spacing.lg,
          minHeight: theme.touchTarget,
          backgroundColor: theme.colors.inverseSurface,
          borderRadius: theme.radii.sm,
        },
        motion,
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.sentence,
          {
            minHeight: theme.touchTarget,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          },
        ]}
        onStartShouldSetResponder={claimTouch}
        accessible
        accessibilityLabel={sentence}
        testID={testID ? `${testID}-text` : undefined}
      >
        <Text
          style={[textStyle, styles.name]}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.3}
          testID={testID ? `${testID}-name` : undefined}
        >
          {current.food}
        </Text>
        {plain ? null : (
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.onInverseSurface },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
            testID={testID ? `${testID}-tail` : undefined}
          >
            {tail}
          </Text>
        )}
      </View>
      {onUndo === undefined ? (
        <View style={{ width: theme.spacing.md }} />
      ) : (
        <UndoButton
          onPress={onUndo}
          testID={testID ? `${testID}-undo` : undefined}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: ABOVE_LIST,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentence: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  name: {
    flexShrink: 1,
  },
  undo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
