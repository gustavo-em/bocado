import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { t } from '../i18n';
import { useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';
import { haptics } from './haptics';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

/** Design system §2.16: a 36 dp ring inside each 48 dp target. */
const RING_SIZE = 36;
const RING_BORDER = 1.5;
/** Holding a step key: the pause before it repeats, then the interval. */
const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 80;
/** Keeps the field from collapsing around a single digit while typing. */
const INPUT_MIN_WIDTH = 120;

interface StepButtonProps {
  direction: 1 | -1;
  onStep: (direction: 1 | -1) => void;
  testID?: string;
}

function StepButton({ direction, onStep, testID }: StepButtonProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (delay.current) clearTimeout(delay.current);
    if (repeat.current) clearInterval(repeat.current);
    delay.current = null;
    repeat.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const onPressIn = useCallback(() => {
    press.onPressIn();
    // Holding accelerates; the first step still belongs to `onPress`, so a
    // plain tap never counts twice.
    delay.current = setTimeout(() => {
      repeat.current = setInterval(() => onStep(direction), HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }, [press, onStep, direction]);

  const onPressOut = useCallback(() => {
    press.onPressOut();
    stop();
  }, [press, stop]);

  const onPress = useCallback(() => onStep(direction), [onStep, direction]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={t(
        direction > 0 ? 'portion.increase' : 'portion.decrease',
      )}
      style={[
        styles.target,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID={testID}
    >
      <Animated.View style={press.style}>
        <View
          style={[
            styles.ring,
            { borderWidth: RING_BORDER, borderColor: theme.colors.inkSubtle },
          ]}
        >
          <Icon
            name={direction > 0 ? 'plus' : 'minus'}
            size="action"
            color={theme.colors.ink}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export interface StepperProps {
  /** Already formatted for the locale ("1,5"). */
  formatted: string;
  /** The unit beside the number ("colher de sopa cheia", "g"). */
  unit: string;
  /** What a screen reader announces as the current value. */
  valueText: string;
  onStep: (direction: 1 | -1) => void;
  /** A quantity typed on the decimal keypad, as raw text. */
  onType: (text: string) => void;
  testID?: string;
}

/**
 * Design system §2.16: `[ − ]  1,5 colher de servir  [ + ]`. The number is in
 * `display` with tabular numerals and the unit in `heading` `inkMuted` on the
 * same baseline; tapping the number opens the decimal keypad. Each step fires
 * a selection haptic; holding a button accelerates.
 */
export function Stepper({
  formatted,
  unit,
  valueText,
  onStep,
  onType,
  testID,
}: StepperProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatted);

  const step = useCallback(
    (direction: 1 | -1) => {
      haptics.selection();
      onStep(direction);
    },
    [onStep],
  );

  const startEditing = useCallback(() => {
    setDraft(formatted);
    setEditing(true);
  }, [formatted]);

  const commit = useCallback(() => {
    setEditing(false);
    onType(draft);
  }, [draft, onType]);

  return (
    <View style={styles.row} testID={testID}>
      <StepButton
        direction={-1}
        onStep={step}
        testID={testID ? `${testID}-decrease` : undefined}
      />
      <View style={styles.value}>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            inputMode="decimal"
            returnKeyType="done"
            autoFocus
            selectTextOnFocus
            accessibilityLabel={t('portion.quantityLabel')}
            style={[
              theme.type.display,
              textDefaults,
              tabularNumbers,
              styles.input,
              { color: theme.colors.ink },
            ]}
            maxFontSizeMultiplier={1.3}
            testID={testID ? `${testID}-input` : undefined}
          />
        ) : (
          <Pressable
            onPress={startEditing}
            accessibilityRole="adjustable"
            accessibilityLabel={t('portion.quantityLabel')}
            accessibilityHint={t('portion.quantityHint')}
            accessibilityValue={{ text: valueText }}
            accessibilityActions={ADJUST_ACTIONS}
            onAccessibilityAction={event => {
              if (event.nativeEvent.actionName === 'increment') step(1);
              if (event.nativeEvent.actionName === 'decrement') step(-1);
            }}
            style={styles.number}
            testID={testID ? `${testID}-value` : undefined}
          >
            <Text
              style={[
                theme.type.display,
                textDefaults,
                tabularNumbers,
                { color: theme.colors.ink },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {formatted}
            </Text>
            <Text
              style={[
                theme.type.heading,
                textDefaults,
                styles.unit,
                {
                  color: theme.colors.inkMuted,
                  marginLeft: theme.spacing.sm,
                },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {unit}
            </Text>
          </Pressable>
        )}
      </View>
      <StepButton
        direction={1}
        onStep={step}
        testID={testID ? `${testID}-increase` : undefined}
      />
    </View>
  );
}

/** TalkBack's own "swipe up / down to adjust" on the number. */
const ADJUST_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

const styles = StyleSheet.create({
  target: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    flex: 1,
    alignItems: 'center',
  },
  number: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  unit: {
    flexShrink: 1,
  },
  input: {
    minWidth: INPUT_MIN_WIDTH,
    textAlign: 'center',
    padding: 0,
  },
});
