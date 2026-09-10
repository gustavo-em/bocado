import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../theme';
import type { IconName } from '../theme/icons';
import { textDefaults } from '../theme/type';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

export interface TextButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  /**
   * `default`: bodyMedium 16 in `accent` ("Adicionar").
   * `compact`: labelMedium 13; `accent` for an action ("Hoje"), `ink` for
   * navigation ("Metas", with its icon).
   */
  variant?: 'default' | 'compact';
  /** `danger` is only ever a destructive action ("Remover"), never decoration. */
  tone?: 'accent' | 'ink' | 'danger';
  /**
   * `center` is the default (a tray action, a link under a sheet). `start`
   * drops the side padding so the label lands on the screen's own gutter,
   * in line with the labels above and below it in a settings list.
   */
  align?: 'center' | 'start';
  icon?: IconName;
  testID?: string;
}

/** Design system §2.2: a 48 dp target with only text, 12 dp of side padding. */
export function TextButton({
  label,
  onPress,
  accessibilityLabel,
  variant = 'default',
  tone = 'accent',
  align = 'center',
  icon,
  testID,
}: TextButtonProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const color =
    tone === 'accent'
      ? theme.colors.accent
      : tone === 'danger'
      ? theme.colors.danger
      : theme.colors.ink;
  const typeStyle =
    variant === 'default' ? theme.type.bodyMedium : theme.type.labelMedium;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.target,
        align === 'start' ? styles.alignStart : styles.alignCenter,
        {
          minHeight: theme.touchTarget,
          paddingHorizontal: align === 'start' ? 0 : theme.spacing.md,
        },
      ]}
    >
      <Animated.View style={[styles.content, press.style]}>
        {icon ? (
          <View style={{ marginRight: theme.spacing.sm }}>
            <Icon name={icon} size="row" color={color} />
          </View>
        ) : null}
        <Text
          style={[typeStyle, textDefaults, { color }]}
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    justifyContent: 'center',
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
