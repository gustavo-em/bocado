import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../theme';
import type { IconName } from '../theme/icons';
import { textDefaults } from '../theme/type';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

export const SCREEN_HEADER_HEIGHT = 56;

interface LeadingAction {
  /** `chevron-left` on a pushed screen, `x` on a modal. */
  icon: 'chevron-left' | 'x';
  onPress: () => void;
  accessibilityLabel: string;
}

export interface ScreenHeaderProps {
  title: string;
  /** What screen readers announce when the visible title is abbreviated. */
  titleAccessibilityLabel?: string;
  leading?: LeadingAction;
  /** Right-aligned 48 dp actions; the cluster ends 4 dp from the edge. */
  trailing?: React.ReactNode;
  /** `title` (22) on a root screen; `heading` (17) on the search modal (§2.14). */
  titleRole?: 'title' | 'heading';
  /**
   * Two lines for a title that is a sentence ("Só o necessário para
   * calcular"): the row grows instead of cutting the words. One line
   * everywhere else, where the title is a noun and the height is fixed.
   */
  titleLines?: 1 | 2;
  /**
   * Makes the title itself the control that opens something about the screen
   * (the month sheet on "Hoje"). The header keeps its single action cluster on
   * the right: no second button, no tab.
   */
  onTitlePress?: () => void;
  /** A 20 dp glyph right after the title, only meaningful with `onTitlePress`. */
  titleIcon?: IconName;
  /** Read after the title when it is a button: "Escolher outro dia". */
  titleAccessibilityHint?: string;
  /** On the title button when there is one, on the header row otherwise. */
  testID?: string;
}

function LeadingButton({ icon, onPress, accessibilityLabel }: LeadingAction) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.leading,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
    >
      <Animated.View style={press.style}>
        <Icon name={icon} size="action" color={theme.colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

/** Design system §2.17: 56 dp, title in `title`, actions as 48 dp buttons. */
export function ScreenHeader({
  title,
  titleAccessibilityLabel,
  leading,
  trailing,
  titleRole = 'title',
  titleLines = 1,
  onTitlePress,
  titleIcon,
  titleAccessibilityHint,
  testID,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const titleText = (
    <Text
      style={[
        theme.type[titleRole],
        textDefaults,
        // Inside the button the row is what takes the space, and the text only
        // gives way when there is not enough: that keeps the glyph against the
        // end of the words instead of against the actions on the right.
        onTitlePress ? styles.titleInButton : styles.title,
        { color: theme.colors.ink },
        leading ? { marginLeft: theme.spacing.sm } : null,
      ]}
      numberOfLines={titleLines}
      maxFontSizeMultiplier={1.3}
      // As a button, the whole row carries the role and the label; the text
      // inside it must not announce itself as a header on top of that.
      accessibilityRole={onTitlePress ? undefined : 'header'}
      accessibilityLabel={onTitlePress ? undefined : titleAccessibilityLabel}
    >
      {title}
    </Text>
  );
  return (
    <View
      style={[
        styles.row,
        titleLines === 1
          ? { height: SCREEN_HEADER_HEIGHT }
          : {
              minHeight: SCREEN_HEADER_HEIGHT,
              paddingVertical: theme.spacing.sm,
            },
        {
          paddingLeft: leading ? theme.spacing.xs : theme.spacing.lg,
          paddingRight: theme.spacing.xs,
        },
      ]}
      testID={onTitlePress ? undefined : testID}
    >
      {leading ? <LeadingButton {...leading} /> : null}
      {onTitlePress ? (
        <Pressable
          onPress={onTitlePress}
          accessibilityRole="button"
          accessibilityLabel={titleAccessibilityLabel ?? title}
          accessibilityHint={titleAccessibilityHint}
          style={[styles.titleButton, { minHeight: theme.touchTarget }]}
          testID={testID}
        >
          {titleText}
          {titleIcon ? (
            <View style={[styles.titleIcon, { marginLeft: theme.spacing.sm }]}>
              <Icon name={titleIcon} size="row" color={theme.colors.ink} />
            </View>
          ) : null}
        </Pressable>
      ) : (
        titleText
      )}
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  titleInButton: {
    flexShrink: 1,
  },
  titleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    flexShrink: 0,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
