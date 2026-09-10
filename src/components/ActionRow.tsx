import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../theme';
import type { IconName } from '../theme/icons';
import { textDefaults } from '../theme/type';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

export interface ActionRowProps {
  label: string;
  /** One quiet line under the label, at the same distance as in `SwitchRow`. */
  hint?: string;
  onPress: () => void;
  /**
   * The glyph on the right, where `SwitchRow` keeps its switch: it is what
   * says the line is a control and not a heading. `chevron-right` for a row
   * that opens a screen, the action's own icon for a row that does something.
   */
  icon: IconName;
  accessibilityLabel?: string;
  /** The row cannot be used yet, or another row of the same list is working. */
  disabled?: boolean;
  /**
   * This row is the one working: its glyph becomes a small indicator in the
   * same place, so nothing moves and no dialog appears over the sheet.
   */
  busy?: boolean;
  testID?: string;
}

/**
 * A settings line that does something: label and hint on the left, a glyph on
 * the right. Same anatomy as `SwitchRow` — one accessible element, the whole
 * row as the target, at least 48 dp tall — so a screen of preferences reads
 * as one list whatever each line controls.
 */
export function ActionRow({
  label,
  hint,
  onPress,
  icon,
  accessibilityLabel,
  disabled = false,
  busy = false,
  testID,
}: ActionRowProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, busy }}
      style={[
        styles.row,
        {
          minHeight: theme.touchTarget,
          paddingVertical: theme.spacing.sm,
          columnGap: theme.spacing.md,
        },
      ]}
      testID={testID}
    >
      <Animated.View style={[styles.text, press.style]}>
        <Text
          style={[
            theme.type.body,
            textDefaults,
            {
              color:
                disabled && !busy ? theme.colors.inkSubtle : theme.colors.ink,
            },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {hint === undefined ? null : (
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {hint}
          </Text>
        )}
      </Animated.View>
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.inkMuted} />
      ) : (
        <Icon
          name={icon}
          size="row"
          color={disabled ? theme.colors.inkSubtle : theme.colors.inkMuted}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
});
