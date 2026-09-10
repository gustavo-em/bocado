import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FoodSource } from '../domain/food/NormalizedFood';
import { t } from '../i18n';
import { useTheme } from '../theme';
import { textDefaults } from '../theme/type';

export const SOURCE_BADGE_HEIGHT = 18;

const DATASET_LABEL: Record<'taco' | 'ibge' | 'usda', string> = {
  taco: 'TACO',
  ibge: 'IBGE',
  usda: 'USDA',
};

/**
 * The text on the badge; also what screen readers get for the source. Open
 * Food Facts rows say "Rótulo": what the user recognises is the label on the
 * package, not the name of the database behind it.
 */
export function sourceLabel(source: FoodSource): string {
  if (source === 'user') return t('search.sourceUser');
  if (source === 'off') return t('search.sourceLabel');
  return DATASET_LABEL[source];
}

export interface SourceBadgeProps {
  source: FoodSource;
}

/**
 * Design system §2.13: `caption` on `surfaceMuted`, 18 dp tall, radius `xs`.
 * Decorative here — the row's accessibility label already names the source.
 */
export function SourceBadge({ source }: SourceBadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radii.xs,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={[
          theme.type.caption,
          textDefaults,
          { color: theme.colors.inkMuted },
        ]}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {sourceLabel(source)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: SOURCE_BADGE_HEIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
  },
});
