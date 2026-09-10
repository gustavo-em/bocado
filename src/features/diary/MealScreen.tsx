import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { AddRing } from '../../components/AddRing';
import { DiaryEntryRow } from '../../components/DiaryEntryRow';
import { MacroBar } from '../../components/MacroBar';
import { MealEmptyLine } from '../../components/MealHeader';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useEntryArrival } from '../../components/useEntryArrival';
import { Snackbar } from '../../components/Snackbar';
import type { DiaryEntryView } from '../../data/diary/DiaryRepository';
import { atwaterKcal } from '../../domain/food/units';
import { t } from '../../i18n';
import { formatGrams, formatKcal, formatMealDay } from '../../i18n/format';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { tabularNumbers } from '../../theme/type';
import { usePendingRemoval } from '../portion/usePendingRemoval';
import { useDiaryDay } from './hooks/useDiaryDay';
import { useEntryRemoval } from './hooks/useEntryRemoval';
import { useGoal } from './hooks/useGoal';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Meal'>;
type Route = RouteProp<RootStackParamList, 'Meal'>;

/** From the header to the subtotal, and from the bars to the list. */
const HEADER_TO_SUBTOTAL = 8;
const SUBTOTAL_TO_BARS = 20;
const BARS_TO_LIST = 20;
/** The 1 dp `line` rule above the list. */
const RULE_WIDTH = 1;
/** Design system §2.11: 16 dp above the inset when there is no tray. */
const SNACKBAR_GAP = 16;
/** kcal per gram, for the share each macro takes of the meal. */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * One meal of one day (spec 03, level 2): its subtotal, its own three macro
 * bars, the full list of entries with the same tap-to-edit and swipe-to-remove
 * as "Hoje", and "Adicionar". The bars show how the meal's own kcal split
 * between the macros — a meal has no goal of its own, so there is nothing
 * else honest to fill them against.
 */
export function MealScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();
  const { day, meal } = params;
  const goal = useGoal();
  const diary = useDiaryDay(day, goal);
  const removal = useEntryRemoval();
  const [openEntry, setOpenEntry] = useState<string | null>(null);

  const title = t(`meals.${meal}`);
  const totals = diary.summary?.byMeal[meal];
  const entries = useMemo(
    () => diary.entries.filter(entry => entry.meal === meal),
    [diary.entries, meal],
  );
  /* The same arrival as in "Hoje": frozen while the portion sheet is on top. */
  const focused = useIsFocused();
  const entryIds = useMemo(() => entries.map(entry => entry.id), [entries]);
  const arrivals = useEntryArrival(
    entryIds,
    `${day} ${meal} ${diary.summary === null ? 'loading' : 'ready'}`,
    focused,
  );

  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  const add = useCallback(
    () => navigation.navigate('AddFood', { day, meal }),
    [navigation, day, meal],
  );
  const editEntry = useCallback(
    (entry: DiaryEntryView) =>
      navigation.navigate('Portion', {
        day: entry.day,
        meal: entry.meal,
        foodId: entry.foodId,
        entryId: entry.id,
      }),
    [navigation],
  );
  const removeEntry = useCallback(
    (entry: DiaryEntryView) => {
      setOpenEntry(null);
      removal.remove(entry);
    },
    // `remove` is stable; the snackbar changing must not re-render the rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removal.remove],
  );
  // "Remover" on the portion sheet lands here, in the same path as the swipe.
  usePendingRemoval(removeEntry);

  const macros = useMemo(() => {
    const protein = totals?.protein ?? 0;
    const carbs = totals?.carbs ?? 0;
    const fat = totals?.fat ?? 0;
    const total = atwaterKcal(protein, carbs, fat);
    const share = (grams: number, perGram: number) =>
      total > 0 ? (grams * perGram) / total : 0;
    return [
      {
        key: 'protein',
        label: t('today.protein'),
        grams: protein,
        ratio: share(protein, KCAL_PER_G.protein),
        color: theme.colors.protein,
      },
      {
        key: 'carbs',
        label: t('today.carbs'),
        grams: carbs,
        ratio: share(carbs, KCAL_PER_G.carbs),
        color: theme.colors.carbs,
      },
      {
        key: 'fat',
        label: t('today.fat'),
        grams: fat,
        ratio: share(fat, KCAL_PER_G.fat),
        color: theme.colors.fat,
      },
    ];
  }, [totals, theme.colors]);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
      testID={`meal-screen-${meal}`}
    >
      <ScreenHeader
        title={t('search.headerTitle', {
          meal: title,
          day: formatMealDay(day),
        })}
        titleRole="heading"
        titleAccessibilityLabel={title}
        leading={{
          icon: 'chevron-left',
          onPress: goBack,
          accessibilityLabel: t('common.back'),
        }}
        trailing={
          <AddRing
            accessibilityLabel={t('today.addTo', { meal: title })}
            onPress={add}
            testID="meal-add"
          />
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        testID="meal-scroll"
      >
        <View
          accessible
          accessibilityLabel={t('meal.subtotalA11y', {
            meal: title,
            kcal: formatKcal(totals?.kcal ?? 0),
          })}
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: HEADER_TO_SUBTOTAL,
          }}
        >
          <Text
            style={[
              theme.type.display,
              textDefaults,
              tabularNumbers,
              { color: theme.colors.ink },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            testID="meal-subtotal"
          >
            {t('meal.subtotal', { kcal: formatKcal(totals?.kcal ?? 0) })}
          </Text>
        </View>
        <View
          style={[
            styles.macros,
            {
              paddingHorizontal: theme.spacing.lg,
              marginTop: SUBTOTAL_TO_BARS,
            },
          ]}
        >
          {macros.map((macro, index) => (
            <View
              key={macro.key}
              accessible
              accessibilityLabel={t('meal.macroLabel', {
                macro: macro.label,
                value: formatGrams(macro.grams),
              })}
              style={[
                styles.macroColumn,
                index > 0 ? { marginLeft: theme.spacing.md } : null,
              ]}
            >
              <MacroBar
                label={macro.label}
                value={t('meal.macroValue', {
                  value: formatGrams(macro.grams),
                })}
                ratio={macro.ratio}
                color={macro.color}
                animate={false}
              />
            </View>
          ))}
        </View>
        <View
          style={[
            styles.list,
            {
              marginTop: BARS_TO_LIST,
              borderTopColor: theme.colors.line,
            },
          ]}
        >
          {diary.summary === null ? null : entries.length === 0 ? (
            <MealEmptyLine />
          ) : (
            entries.map(entry => (
              <DiaryEntryRow
                key={entry.id}
                entry={entry}
                onPress={editEntry}
                onRemove={removeEntry}
                open={openEntry === entry.id}
                onOpenChange={setOpenEntry}
                arrivalIndex={arrivals.get(entry.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
      <Snackbar
        message={removal.snackbar}
        onUndo={removal.undo}
        bottom={insets.bottom + SNACKBAR_GAP}
        testID="meal-snackbar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  macros: {
    flexDirection: 'row',
  },
  macroColumn: {
    flex: 1,
  },
  list: {
    borderTopWidth: RULE_WIDTH,
  },
});
