import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { t } from '../i18n';
import { useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';
import { AddRing } from './AddRing';
import { CountUpText } from './CountUpText';
import { KCAL_COLUMN_WIDTH } from './DiaryEntryRow';
import { usePressAnimation } from './usePressAnimation';

export const MEAL_HEADER_HEIGHT = 48;
export const MEAL_EMPTY_LINE_HEIGHT = 36;
/** The 1 dp `line` rule that separates meals. */
const RULE_WIDTH = 1;

export interface MealHeaderProps {
  title: string;
  /** Meal subtotal in kcal; hidden (never "0") when `count` is 0. */
  subtotal: number;
  count: number;
  animate: boolean;
  onAdd: () => void;
  /** Opens the meal's own screen; without it the name is not interactive. */
  onOpen?: () => void;
  testID?: string;
}

/**
 * Design system §2.6: a 1 dp `line` above, 48 dp of header, name in `heading`
 * taking the width that is left, subtotal in `bodyMedium` with tabular numerals
 * and without a unit in a fixed 46 dp column — the same family and body as the
 * kcal of an entry, one weight above, because it is a sum — and the "+" ring
 * (§2.4) as the meal's action. The four subtotals therefore end on one x, and
 * the ring's right edge lands 2 dp inside the entries' kcal column, so the
 * screen's right margin reads as a single column. The name and the subtotal
 * open the meal's own screen.
 */
export function MealHeader({
  title,
  subtotal,
  count,
  animate,
  onAdd,
  onOpen,
  testID,
}: MealHeaderProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const heading = (
    <View
      style={[
        styles.row,
        {
          borderTopColor: theme.colors.line,
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.sm,
        },
      ]}
      testID={testID}
    >
      <Pressable
        onPress={onOpen}
        onPressIn={onOpen ? press.onPressIn : undefined}
        onPressOut={onOpen ? press.onPressOut : undefined}
        disabled={onOpen === undefined}
        accessibilityRole={onOpen ? 'button' : 'header'}
        accessibilityLabel={
          onOpen ? t('today.openMeal', { meal: title }) : title
        }
        style={styles.heading}
        testID={testID ? `${testID}-open` : undefined}
      >
        <Animated.View style={[styles.heading, press.style]}>
          <Text
            style={[
              theme.type.heading,
              textDefaults,
              styles.title,
              { color: theme.colors.ink },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
          {count > 0 ? (
            <CountUpText
              value={subtotal}
              animate={animate}
              style={[
                theme.type.bodyMedium,
                textDefaults,
                tabularNumbers,
                styles.subtotal,
                { color: theme.colors.ink, marginLeft: theme.spacing.md },
              ]}
              testID={testID ? `${testID}-subtotal` : undefined}
            />
          ) : null}
        </Animated.View>
      </Pressable>
      <AddRing
        accessibilityLabel={t('today.addTo', { meal: title })}
        onPress={onAdd}
        testID={testID ? `${testID}-add` : undefined}
      />
    </View>
  );
  return heading;
}

/** Design system §2.6: 36 dp under an empty meal, `label` in `inkMuted`. */
export function MealEmptyLine() {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { paddingHorizontal: theme.spacing.lg }]}>
      <Text
        style={[
          theme.type.label,
          textDefaults,
          { color: theme.colors.inkMuted },
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {t('today.emptyMeal')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: MEAL_HEADER_HEIGHT + RULE_WIDTH,
    borderTopWidth: RULE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  /*
    `flex: 1` and not `flexShrink: 1`: the name takes whatever is left, which is
    what stops the subtotal from floating on the x axis behind a name of
    variable width.
  */
  title: {
    flex: 1,
  },
  /*
    The same fixed column as an entry's kcal (§2.5), so the four subtotals end
    on one x and share the alignment of the numbers below them.
  */
  subtotal: {
    width: KCAL_COLUMN_WIDTH,
    textAlign: 'right',
  },
  empty: {
    height: MEAL_EMPTY_LINE_HEIGHT,
    justifyContent: 'center',
  },
});
