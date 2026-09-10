import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Sheet } from '../../components/Sheet';
import { TextFieldRow } from '../../components/TextFieldRow';
import { haptics } from '../../components/haptics';
import { diaryRepository } from '../../data/diary/DiaryRepository';
import { upsertFoods } from '../../data/food/foodCache';
import { buildQuickFood, QUICK_LIMITS } from '../../domain/food/quickLog';
import { currentLanguage, t } from '../../i18n';
import { formatKcal } from '../../i18n/format';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { setPortionSheetOpen } from '../portion/portionSheet';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'QuickLog'>;
type Route = RouteProp<RootStackParamList, 'QuickLog'>;

const QUICK_LOG_TAG = '[bocado:quick-log]';

/** Same rhythm as the portion sheet (§2.12). */
const TITLE_TO_FIELDS = 16;
const FIELDS_TO_BUTTON = 24;

/** Digits and one decimal separator; everything else is not a number. */
function parseAmount(text: string): number | undefined {
  const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
  if (cleaned.length === 0) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * "Registrar só as calorias" (spec 05): the way out when no table has the
 * food. Calories are the only thing asked for; the macros and a name are
 * there for whoever has them. It writes a real `user:quick-*` food, so the
 * entry, its snapshot and the day's totals behave like any other row.
 */
export function QuickLogSheetScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();
  const { day, meal } = params;

  const [kcalText, setKcalText] = useState('');
  const [proteinText, setProteinText] = useState('');
  const [carbsText, setCarbsText] = useState('');
  const [fatText, setFatText] = useState('');
  const [name, setName] = useState('');
  const writing = useRef(false);

  // The search screen underneath steps out of the accessibility tree while
  // this sheet holds the screen, exactly as the portion sheet does.
  useEffect(() => {
    setPortionSheetOpen(true);
    return () => setPortionSheetOpen(false);
  }, []);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const kcal = parseAmount(kcalText);
  const ready = kcal !== undefined;

  const confirm = useCallback(() => {
    if (kcal === undefined || writing.current) return;
    writing.current = true;
    const locale = currentLanguage();
    const fallback = t('quick.title');
    const food = buildQuickFood(
      {
        kcal,
        protein: parseAmount(proteinText),
        carbs: parseAmount(carbsText),
        fat: parseAmount(fatText),
        name,
        id: `${Date.now().toString(36)}-${Math.floor(
          Math.random() * 1e6,
        ).toString(36)}`,
      },
      fallback,
      locale,
    );
    // The food row has to exist before the entry can reference it.
    upsertFoods([food])
      .then(() =>
        diaryRepository.addEntry({
          day,
          meal,
          food,
          serving: food.servings[0],
          servingCount: 1,
          locale,
        }),
      )
      .then(entry => {
        haptics.added();
        AccessibilityInfo.announceForAccessibility(
          t('search.addedA11y', {
            food: food.name.pt ?? fallback,
            meal: t(`meals.${meal}`),
            kcal: formatKcal(entry.kcal),
          }),
        );
        navigation.goBack();
      })
      .catch(error => {
        writing.current = false;
        console.warn(`${QUICK_LOG_TAG} write failed: ${String(error)}`);
      });
  }, [kcal, proteinText, carbsText, fatText, name, day, meal, navigation]);

  const buttonLabel = useMemo(
    () => t('portion.add', { kcal: formatKcal(kcal ?? 0) }),
    [kcal],
  );

  return (
    <Sheet
      onClose={close}
      footer={
        <View style={[styles.confirm, { marginTop: FIELDS_TO_BUTTON }]}>
          <PrimaryButton
            label={buttonLabel}
            onPress={confirm}
            disabled={!ready}
            testID="quick-log-confirm"
          />
        </View>
      }
      testID="quick-log-sheet"
    >
      <View style={{ paddingTop: theme.spacing.md }}>
        <Text
          style={[
            theme.type.heading,
            textDefaults,
            { color: theme.colors.ink },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          accessibilityRole="header"
          testID="quick-log-title"
        >
          {t('quick.title')}
        </Text>
        <Text
          style={[
            theme.type.label,
            textDefaults,
            { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {t('quick.subtitle')}
        </Text>

        <View style={{ marginTop: TITLE_TO_FIELDS }}>
          <TextFieldRow
            label={t('quick.kcal')}
            accessibilityLabel={t('quick.kcalA11y')}
            value={kcalText}
            onChangeText={setKcalText}
            unit={t('common.kcal')}
            placeholder="0"
            numeric
            autoFocus
            maxLength={String(QUICK_LIMITS.kcal).length}
            testID="quick-log-kcal"
          />
          <TextFieldRow
            label={t('quick.protein')}
            accessibilityLabel={t('quick.proteinA11y')}
            value={proteinText}
            onChangeText={setProteinText}
            unit={t('common.grams')}
            placeholder="—"
            numeric
            maxLength={String(QUICK_LIMITS.macro).length}
            testID="quick-log-protein"
          />
          <TextFieldRow
            label={t('quick.carbs')}
            accessibilityLabel={t('quick.carbsA11y')}
            value={carbsText}
            onChangeText={setCarbsText}
            unit={t('common.grams')}
            placeholder="—"
            numeric
            maxLength={String(QUICK_LIMITS.macro).length}
            testID="quick-log-carbs"
          />
          <TextFieldRow
            label={t('quick.fat')}
            accessibilityLabel={t('quick.fatA11y')}
            value={fatText}
            onChangeText={setFatText}
            unit={t('common.grams')}
            placeholder="—"
            numeric
            maxLength={String(QUICK_LIMITS.macro).length}
            testID="quick-log-fat"
          />
          <TextFieldRow
            label={t('quick.name')}
            accessibilityLabel={t('quick.nameA11y')}
            value={name}
            onChangeText={setName}
            placeholder={t('quick.title')}
            maxLength={60}
            testID="quick-log-name"
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  confirm: {
    alignItems: 'stretch',
  },
});
