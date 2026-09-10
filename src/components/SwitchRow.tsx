import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { textDefaults } from '../theme/type';

export interface SwitchRowProps {
  label: string;
  /** One quiet line under the label; omitted when the label says it all. */
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

/**
 * A preference that is on or off: the label and its hint on the left, the
 * platform switch on the right. The whole row is the target — one accessible
 * element with the `switch` role, so the switch itself is not announced twice.
 */
export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  testID,
}: SwitchRowProps) {
  const theme = useTheme();
  const toggle = useCallback(
    () => onValueChange(!value),
    [onValueChange, value],
  );

  return (
    <Pressable
      onPress={toggle}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
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
      <View style={styles.text}>
        <Text
          style={[theme.type.body, textDefaults, { color: theme.colors.ink }]}
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
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.track, true: theme.colors.accent }}
        thumbColor={theme.colors.surface}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
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
