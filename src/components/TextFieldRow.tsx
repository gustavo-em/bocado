import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';

/** Same 64 dp row as `NumberField` (design system §2.15). */
export const TEXT_FIELD_ROW_HEIGHT = 64;
const FOCUS_RULE = 2;
const VALUE_MIN_WIDTH = 72;

export interface TextFieldRowProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  accessibilityLabel: string;
  /** Shown while the field is empty — that is what "optional" looks like. */
  placeholder?: string;
  /** The static suffix after the value ("kcal", "g"). */
  unit?: string;
  numeric?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  testID?: string;
}

/**
 * The editable row of the quick entry sheet: `NumberField`'s anatomy — label
 * in `body` on the left, the value in `heading` on the right with its unit, a
 * `line` under the row and a 2 dp `accent` rule while focused — but holding
 * plain text, so a field left blank stays blank instead of reading "0".
 */
export function TextFieldRow({
  label,
  value,
  onChangeText,
  accessibilityLabel,
  placeholder,
  unit,
  numeric = false,
  maxLength,
  autoFocus = false,
  testID,
}: TextFieldRowProps) {
  const theme = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  const focusInput = useCallback(() => input.current?.focus(), []);

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
      <Text
        style={[
          theme.type.body,
          textDefaults,
          styles.label,
          { color: theme.colors.ink },
        ]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </Text>
      <View style={styles.valueBlock}>
        <View style={styles.valueRow}>
          <TextInput
            ref={input}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            autoFocus={autoFocus}
            keyboardType={numeric ? 'number-pad' : 'default'}
            inputMode={numeric ? 'numeric' : 'text'}
            returnKeyType="done"
            maxLength={maxLength}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.inkMuted}
            accessibilityLabel={accessibilityLabel}
            maxFontSizeMultiplier={1.3}
            underlineColorAndroid="transparent"
            textAlignVertical="center"
            selectionColor={theme.colors.accent}
            cursorColor={theme.colors.accent}
            style={[
              theme.type.heading,
              textDefaults,
              numeric ? tabularNumbers : null,
              styles.input,
              { color: theme.colors.ink, minHeight: theme.touchTarget },
            ]}
            testID={testID ? `${testID}-input` : undefined}
          />
          {unit ? (
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
          ) : null}
        </View>
        <View
          style={[
            styles.focusRule,
            focused ? { backgroundColor: theme.colors.accent } : null,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: TEXT_FIELD_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    flex: 1,
  },
  valueBlock: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  // Centred, not 'baseline': Android measures a 48 dp input's baseline at the
  // top of its box and lifts the unit into a superscript (see NumberField).
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
