import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { t } from '../i18n';
import { useTheme } from '../theme';
import { SHAKE_DP, SHAKE_STEP } from '../theme/motion';
import { tabularNumbers, textDefaults } from '../theme/type';
import { CountUpText } from './CountUpText';
import { haptics } from './haptics';
import type { NumberFieldHandle, NumberFieldParse } from './NumberField';

/** Digits are 52/56; the unit sits on their baseline instead of their middle. */
const UNIT_BASELINE = 8;
const MAX_DIGITS = 5;

export interface EditableKcalProps {
  value: number;
  parse: (text: string) => NumberFieldParse;
  onCommit: (value: number) => void;
  /** What the number is, for a screen reader ("Meta de calorias por dia…"). */
  accessibilityLabel: string;
  /** The whole sentence ("Sua meta: 1.240 kcal"). */
  accessibilityValue: string;
  /** `true` right after a calculation, so the number rolls to its value. */
  animate?: boolean;
  testID?: string;
}

/**
 * The goal as the hero of its screen: the number in `hero`, "kcal" beside it,
 * and a tap that turns it into a number pad in place — no dialog, no separate
 * edit screen. Saves on blur and on `commit()`; an invalid entry shakes and
 * reverts, an out-of-range one is clamped and shakes (same contract as
 * `NumberField`).
 */
export const EditableKcal = forwardRef<NumberFieldHandle, EditableKcalProps>(
  function EditableKcalBase(
    {
      value,
      parse,
      onCommit,
      accessibilityLabel,
      accessibilityValue,
      animate = false,
      testID,
    },
    ref,
  ) {
    const theme = useTheme();
    const input = useRef<React.ComponentRef<typeof TextInput>>(null);
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(String(value));
    const textRef = useRef(text);
    textRef.current = text;
    const valueRef = useRef(value);
    const offset = useSharedValue(0);

    useEffect(() => {
      valueRef.current = value;
      setText(String(value));
    }, [value]);

    const shake = useCallback(() => {
      // The refusal is felt as well as seen, at the weight the spec gives it.
      haptics.error();
      offset.value = withSequence(
        withTiming(-SHAKE_DP, SHAKE_STEP),
        withTiming(SHAKE_DP, SHAKE_STEP),
        withTiming(-SHAKE_DP, SHAKE_STEP),
        withTiming(SHAKE_DP, SHAKE_STEP),
        withTiming(0, SHAKE_STEP),
      );
    }, [offset]);

    const commit = useCallback(() => {
      if (!editing) return;
      const current = valueRef.current;
      const result = parse(textRef.current);
      if (result.kind === 'invalid') {
        setText(String(current));
        shake();
        return;
      }
      if (result.kind === 'clamped') shake();
      setText(String(result.value));
      if (result.value !== current) {
        valueRef.current = result.value;
        onCommit(result.value);
      }
    }, [editing, parse, onCommit, shake]);

    useImperativeHandle(
      ref,
      () => ({ commit, focus: () => setEditing(true) }),
      [commit],
    );

    const startEditing = useCallback(() => setEditing(true), []);
    const onBlur = useCallback(() => {
      commit();
      setEditing(false);
    }, [commit]);

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: offset.value }],
    }));

    const numberStyle = [
      theme.type.hero,
      textDefaults,
      tabularNumbers,
      { color: theme.colors.ink },
    ];

    return (
      <Animated.View style={shakeStyle}>
        <Pressable
          onPress={startEditing}
          accessible={!editing}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ text: accessibilityValue }}
          style={[styles.row, { minHeight: theme.touchTarget }]}
          testID={testID}
        >
          {editing ? (
            <TextInput
              ref={input}
              autoFocus
              value={text}
              onChangeText={setText}
              onBlur={onBlur}
              onSubmitEditing={onBlur}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              selectTextOnFocus
              maxLength={MAX_DIGITS}
              accessibilityLabel={accessibilityLabel}
              maxFontSizeMultiplier={1.3}
              underlineColorAndroid="transparent"
              selectionColor={theme.colors.accent}
              cursorColor={theme.colors.accent}
              style={[numberStyle, styles.input]}
              testID={testID ? `${testID}-input` : undefined}
            />
          ) : (
            <CountUpText
              value={value}
              animate={animate}
              style={numberStyle}
              testID={testID ? `${testID}-value` : undefined}
            />
          )}
          <View style={{ marginLeft: theme.spacing.sm }}>
            <Text
              style={[
                theme.type.body,
                textDefaults,
                {
                  color: theme.colors.inkMuted,
                  marginBottom: UNIT_BASELINE,
                },
              ]}
              maxFontSizeMultiplier={1.3}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {t('common.kcal')}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    minWidth: 140,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
});
