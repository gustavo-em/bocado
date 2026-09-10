import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { t } from '../i18n';
import { resultRowHeight, useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';
import { AddButton } from './FoodResultRow';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

export interface SuggestionRepeatRowProps {
  /** "Repetir jantar de ontem". */
  title: string;
  /** "2 itens · 612 kcal". */
  detail: string;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * The composite first line of "Sugestões" (docs/specs/04): the same 64 dp
 * anatomy of a food row — no card, no rule, no shadow — with an `undo-2` glyph
 * where a name would start, the count and the kcal of the meal on line 2, and
 * the row's own "+", which copies the whole meal in one tap.
 */
export const SuggestionRepeatRow = React.memo(function SuggestionRepeatRowBase({
  title,
  detail,
  accessibilityLabel,
  onPress,
  testID,
}: SuggestionRepeatRowProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const handlePress = useCallback(() => onPress(), [onPress]);

  return (
    <View
      style={[
        styles.row,
        {
          height: resultRowHeight,
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
        },
      ]}
      testID={testID}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={handlePress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.body}
      >
        <Animated.View style={press.style}>
          <View style={styles.line}>
            <Icon name="undo-2" size="row" color={theme.colors.inkMuted} />
            <Text
              style={[
                theme.type.bodyMedium,
                textDefaults,
                styles.title,
                { color: theme.colors.ink, marginLeft: theme.spacing.sm },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
          </View>
          <Text
            style={[
              theme.type.label,
              textDefaults,
              tabularNumbers,
              {
                color: theme.colors.inkMuted,
                // Lines up with the title: the 20 dp glyph plus its 8 dp gap.
                marginLeft: theme.spacing.xl + theme.spacing.xs,
              },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {detail}
          </Text>
        </Animated.View>
      </Pressable>
      <AddButton
        added={false}
        accessibilityLabel={t('search.repeatAdd', { title })}
        onPress={handlePress}
        testID={testID ? `${testID}-add` : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
  },
});
