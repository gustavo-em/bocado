import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ReturnKeyTypeOptions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { SHAKE_DP, SHAKE_STEP } from '../theme/motion';
import { tabularNumbers, textDefaults } from '../theme/type';
import { haptics } from './haptics';

export const NUMBER_FIELD_HEIGHT = 64;
const FOCUS_RULE = 2;
const VALUE_MIN_WIDTH = 72;

export type NumberFieldParse =
  | { kind: 'valid'; value: number }
  | { kind: 'clamped'; value: number }
  | { kind: 'invalid' };

export interface NumberFieldHandle {
  /** Validates and saves the current text; the screen calls it before leaving. */
  commit: () => void;
  focus: () => void;
}

export interface NumberFieldProps {
  label: string;
  /** One quiet line under the label ("24% das calorias"). Never a control. */
  secondary?: string;
  unit: string;
  value: number;
  accessibilityLabel: string;
  maxLength: number;
  /**
   * How the saved value reads while the field is not being edited ("2.000");
   * raw digits are shown during editing so `parse` sees exactly what was typed.
   */
  format?: (value: number) => string;
  parse: (text: string) => NumberFieldParse;
  /** Called with the accepted value only when it differs from `value`. */
  onCommit: (value: number) => void;
  returnKeyType: ReturnKeyTypeOptions;
  onSubmit?: () => void;
  testID?: string;
}

/**
 * A 64 dp row: label in `body`, the number in `heading` on the right with its
 * unit, a `line` under the row and a 2 dp `accent` rule under the number while
 * it has focus. Saves on submit or blur; an invalid entry shakes and reverts,
 * an out-of-range one is clamped and shakes.
 */
export const NumberField = forwardRef<NumberFieldHandle, NumberFieldProps>(
  function NumberFieldBase(
    {
      label,
      secondary,
      unit,
      value,
      accessibilityLabel,
      maxLength,
      format,
      parse,
      onCommit,
      returnKeyType,
      onSubmit,
      testID,
    },
    ref,
  ) {
    const theme = useTheme();
    const input = useRef<React.ComponentRef<typeof TextInput>>(null);
    const [text, setText] = useState(String(value));
    const [focused, setFocused] = useState(false);
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
    }, [parse, onCommit, shake]);

    useImperativeHandle(
      ref,
      () => ({ commit, focus: () => input.current?.focus() }),
      [commit],
    );

    const onFocus = useCallback(() => setFocused(true), []);
    // Focus swaps the formatted value for raw digits after the native
    // select-on-focus already ran, so the selection is re-applied to the digits.
    useEffect(() => {
      if (focused) input.current?.setSelection(0, textRef.current.length);
    }, [focused]);
    const onBlur = useCallback(() => {
      setFocused(false);
      commit();
    }, [commit]);
    const onSubmitEditing = useCallback(() => {
      commit();
      onSubmit?.();
    }, [commit, onSubmit]);
    const focusInput = useCallback(() => input.current?.focus(), []);

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: offset.value }],
    }));

    const shown = focused || !format ? text : format(value);

    return (
      <Pressable
        onPress={focusInput}
        accessible={false}
        style={[
          styles.row,
          {
            paddingHorizontal: theme.spacing.lg,
            borderBottomColor: theme.colors.line,
          },
        ]}
        testID={testID}
      >
        <View style={styles.label}>
          <Text
            style={[theme.type.body, textDefaults, { color: theme.colors.ink }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            {label}
          </Text>
          {secondary === undefined ? null : (
            <Text
              style={[
                theme.type.label,
                textDefaults,
                tabularNumbers,
                { color: theme.colors.inkMuted },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {secondary}
            </Text>
          )}
        </View>
        <Animated.View style={[styles.valueBlock, shakeStyle]}>
          <View style={styles.valueRow}>
            <TextInput
              ref={input}
              value={shown}
              onChangeText={setText}
              onFocus={onFocus}
              onBlur={onBlur}
              onSubmitEditing={onSubmitEditing}
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType={returnKeyType}
              submitBehavior={
                returnKeyType === 'done' ? 'blurAndSubmit' : 'submit'
              }
              selectTextOnFocus
              maxLength={maxLength}
              accessibilityLabel={accessibilityLabel}
              maxFontSizeMultiplier={1.3}
              underlineColorAndroid="transparent"
              textAlignVertical="center"
              selectionColor={theme.colors.accent}
              cursorColor={theme.colors.accent}
              style={[
                theme.type.heading,
                textDefaults,
                tabularNumbers,
                styles.input,
                { color: theme.colors.ink, minHeight: theme.touchTarget },
              ]}
              testID={testID ? `${testID}-input` : undefined}
            />
            <Text
              style={[
                theme.type.label,
                textDefaults,
                { color: theme.colors.inkMuted, marginLeft: theme.spacing.xs },
              ]}
              maxFontSizeMultiplier={1.3}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {unit}
            </Text>
          </View>
          <View
            style={[
              styles.focusRule,
              focused ? { backgroundColor: theme.colors.accent } : null,
            ]}
          />
        </Animated.View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  row: {
    height: NUMBER_FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    flex: 1,
  },
  valueBlock: {
    alignItems: 'flex-end',
  },
  // Not 'baseline': Android measures the 48 dp input's baseline as if its
  // text sat at the top while it is drawn centred, which lifts the unit into
  // a superscript. Centring both puts the unit within 1 dp of the digits'
  // baseline (17/22 heading beside 13/18 label).
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    minWidth: VALUE_MIN_WIDTH,
    textAlign: 'right',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  focusRule: {
    alignSelf: 'stretch',
    height: FOCUS_RULE,
    borderRadius: FOCUS_RULE / 2,
  },
});
