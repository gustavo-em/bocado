import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { APP_VERSION } from '../../app/version';
import { ActionRow } from '../../components/ActionRow';
import { EditableKcal } from '../../components/EditableKcal';
import {
  NumberField,
  type NumberFieldHandle,
  type NumberFieldProps,
} from '../../components/NumberField';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Snackbar, type SnackbarMessage } from '../../components/Snackbar';
import { SwitchRow } from '../../components/SwitchRow';
import { TextButton } from '../../components/TextButton';
import { useSnackbarCountdown } from '../../components/useSnackbarCountdown';
import { prefs } from '../../data/prefs/prefs';
import {
  diaryRepository,
  type UsageBackupRow,
} from '../../data/diary/DiaryRepository';
import type { DailyGoal } from '../../domain/diary/Meal';
import {
  parseGoalInput,
  type DiaryDisplayMode,
  type GoalField,
} from '../../domain/diary/daySummary';
import { macroPercent } from '../../domain/goals/mifflin';
import { resetSuggestionsCache } from '../suggestions/suggestionsService';
import { t, type CopyKey } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { LanguageSetting } from '../../i18n';
import { formatGrams, formatKcal } from '../../i18n/format';
import { useAppearance, useTheme } from '../../theme';
import type { AppearanceSetting } from '../../theme/colors';
import { textDefaults } from '../../theme/type';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Goals'>;

type MacroField = Exclude<GoalField, 'kcal'>;

const MACROS: MacroField[] = ['protein_g', 'carbs_g', 'fat_g'];

const COPY: Record<
  MacroField,
  { label: CopyKey; a11y: CopyKey; share: 'protein' | 'carbs' | 'fat' }
> = {
  protein_g: {
    label: 'goals.protein',
    a11y: 'goals.proteinA11y',
    share: 'protein',
  },
  carbs_g: { label: 'goals.carbs', a11y: 'goals.carbsA11y', share: 'carbs' },
  fat_g: { label: 'goals.fat', a11y: 'goals.fatA11y', share: 'fat' },
};

const PARSERS: Record<MacroField, NumberFieldProps['parse']> = {
  protein_g: text => parseGoalInput('protein_g', text),
  carbs_g: text => parseGoalInput('carbs_g', text),
  fat_g: text => parseGoalInput('fat_g', text),
};

/** One digit past the limit, so "1000" can be typed and clamped to 999. */
const MACRO_MAX_LENGTH = 4;

function SectionTitle({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        theme.type.label,
        textDefaults,
        {
          color: theme.colors.inkMuted,
          paddingHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.xl,
          marginBottom: theme.spacing.sm,
        },
      ]}
      maxFontSizeMultiplier={1.3}
    >
      {label}
    </Text>
  );
}

function Rule() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.rule,
        {
          backgroundColor: theme.colors.line,
          marginTop: theme.spacing.xl,
          marginHorizontal: theme.spacing.lg,
        },
      ]}
    />
  );
}

/**
 * Four sections, in the order they are asked about: the daily goal, how the
 * diary shows it, the preferences, and where the data comes from. Everything
 * saves as it is left — on submit, on blur and when the screen is popped —
 * so there is no "Salvar" to forget.
 */
export function GoalsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const language = useLanguage();
  const appearance = useAppearance();
  const [goal, setGoal] = useState<DailyGoal>(() => prefs.getGoal());
  const [estimated, setEstimated] = useState(() => prefs.isGoalEstimated());
  const [displayMode, setDisplayMode] = useState<DiaryDisplayMode>(() =>
    prefs.showRemaining() ? 'remaining' : 'consumed',
  );
  const [haptics, setHaptics] = useState(() => prefs.hapticsEnabled());
  const [minerals, setMinerals] = useState(() => prefs.mineralsInDiary());
  const goalRef = useRef(goal);
  goalRef.current = goal;
  const kcalField = useRef<NumberFieldHandle | null>(null);
  const macroFields = useRef<Record<MacroField, NumberFieldHandle | null>>({
    protein_g: null,
    carbs_g: null,
    fat_g: null,
  });

  // "Recalcular" leaves and comes back with a new goal: re-read what the
  // calculator saved instead of showing the numbers this screen left with.
  useFocusEffect(
    useCallback(() => {
      setGoal(prefs.getGoal());
      setEstimated(prefs.isGoalEstimated());
    }, []),
  );

  const commitField = useCallback((field: GoalField, value: number) => {
    const next = { ...goalRef.current, [field]: value };
    goalRef.current = next;
    setGoal(next);
    prefs.setGoal(next);
    // A number typed by hand is a decision, not an estimate.
    prefs.setGoalEstimated(false);
    setEstimated(false);
  }, []);

  const commitAll = useCallback(() => {
    kcalField.current?.commit();
    for (const macro of MACROS) macroFields.current[macro]?.commit();
  }, []);

  useEffect(
    () => navigation.addListener('beforeRemove', commitAll),
    [navigation, commitAll],
  );

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  const openSources = useCallback(() => {
    Keyboard.dismiss();
    navigation.navigate('Sources');
  }, [navigation]);

  const recalculate = useCallback(() => {
    commitAll();
    Keyboard.dismiss();
    navigation.navigate('OnboardingProfile', {
      mode: 'recalculate',
      intent: prefs.getProfile().intent,
    });
  }, [commitAll, navigation]);

  const changeDisplayMode = useCallback((mode: DiaryDisplayMode) => {
    setDisplayMode(mode);
    prefs.setShowRemaining(mode === 'remaining');
  }, []);

  const changeMinerals = useCallback((value: boolean) => {
    setMinerals(value);
    prefs.setMineralsInDiary(value);
  }, []);

  const changeHaptics = useCallback((value: boolean) => {
    setHaptics(value);
    prefs.setHapticsEnabled(value);
  }, []);

  /**
   * "Limpar sugestões": `food_usage` is emptied — recents, favourites and the
   * ranking — and the diary is left alone. No confirmation dialog: the
   * snackbar's "Desfazer" puts the table back exactly as it was.
   */
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const backup = useRef<UsageBackupRow[]>([]);
  const countdown = useSnackbarCountdown(() => setSnackbar(null));

  const clearSuggestions = useCallback(() => {
    diaryRepository
      .clearUsage()
      .then(rows => {
        backup.current = rows;
        resetSuggestionsCache();
        setSnackbar({
          food: t('goals.clearSuggestionsDone'),
          meal: '',
          kind: 'text',
        });
        countdown.start();
      })
      .catch(error => {
        console.warn(`[bocado:goals] clear failed: ${String(error)}`);
      });
  }, [countdown]);

  const undoClear = useCallback(() => {
    countdown.cancel();
    setSnackbar(null);
    const rows = backup.current;
    backup.current = [];
    diaryRepository
      .restoreUsage(rows)
      .then(resetSuggestionsCache)
      .catch(error => {
        console.warn(`[bocado:goals] restore failed: ${String(error)}`);
      });
  }, [countdown]);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t('goals.title')}
        leading={{
          icon: 'chevron-left',
          onPress: goBack,
          accessibilityLabel: t('common.back'),
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        <SectionTitle label={t('goals.dailyGoal')} />
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <EditableKcal
            ref={kcalField}
            value={goal.kcal}
            parse={text => parseGoalInput('kcal', text)}
            onCommit={value => commitField('kcal', value)}
            accessibilityLabel={t('goals.kcalA11y')}
            accessibilityValue={`${formatKcal(goal.kcal)} ${t('common.kcal')}`}
            testID="goal-kcal"
          />
          {estimated ? (
            <Text
              style={[
                theme.type.label,
                textDefaults,
                { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
              ]}
              maxFontSizeMultiplier={1.3}
              testID="goal-estimated-note"
            >
              {t('goals.estimatedNote')}
            </Text>
          ) : null}
        </View>
        <View style={{ marginTop: theme.spacing.lg }}>
          {MACROS.map((macro, index) => (
            <NumberField
              key={macro}
              ref={handle => {
                macroFields.current[macro] = handle;
              }}
              label={t(COPY[macro].label)}
              secondary={t('goals.macroPercent', {
                percent: macroPercent(
                  COPY[macro].share,
                  goal[macro],
                  goal.kcal,
                ),
              })}
              unit={t('common.grams')}
              value={goal[macro]}
              accessibilityLabel={t(COPY[macro].a11y)}
              maxLength={MACRO_MAX_LENGTH}
              format={formatGrams}
              parse={PARSERS[macro]}
              onCommit={value => commitField(macro, value)}
              returnKeyType={index === MACROS.length - 1 ? 'done' : 'next'}
              onSubmit={
                index === MACROS.length - 1
                  ? undefined
                  : () => macroFields.current[MACROS[index + 1]]?.focus()
              }
              testID={`goal-${macro}`}
            />
          ))}
        </View>
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
          }}
        >
          <TextButton
            label={t('goals.recalculate')}
            accessibilityLabel={t('goals.recalculate')}
            onPress={recalculate}
            align="start"
            testID="recalculate"
          />
        </View>

        <Rule />
        <SectionTitle label={t('goals.display')} />
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text
            style={[theme.type.body, textDefaults, { color: theme.colors.ink }]}
            maxFontSizeMultiplier={1.3}
          >
            {t('goals.showInDiary')}
          </Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <SegmentedControl<DiaryDisplayMode>
              accessibilityLabel={t('goals.showInDiary')}
              options={[
                { value: 'remaining', label: t('goals.showRemaining') },
                { value: 'consumed', label: t('goals.showConsumed') },
              ]}
              value={displayMode}
              onChange={changeDisplayMode}
              testID="display-mode"
            />
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            <SwitchRow
              label={t('goals.minerals')}
              hint={t('goals.mineralsHint')}
              value={minerals}
              onValueChange={changeMinerals}
              testID="minerals"
            />
          </View>
        </View>

        <Rule />
        <SectionTitle label={t('goals.preferences')} />
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text
            style={[theme.type.body, textDefaults, { color: theme.colors.ink }]}
            maxFontSizeMultiplier={1.3}
          >
            {t('goals.language')}
          </Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <SegmentedControl<LanguageSetting>
              accessibilityLabel={t('goals.language')}
              options={[
                { value: 'system', label: t('goals.languageSystem') },
                { value: 'pt-BR', label: t('goals.languagePt') },
                { value: 'en-US', label: t('goals.languageEn') },
              ]}
              value={language.setting}
              onChange={language.setSetting}
              testID="language"
            />
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            <Text
              style={[
                theme.type.body,
                textDefaults,
                { color: theme.colors.ink },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {t('goals.theme')}
            </Text>
            <View style={{ marginTop: theme.spacing.sm }}>
              <SegmentedControl<AppearanceSetting>
                accessibilityLabel={t('goals.theme')}
                options={[
                  { value: 'system', label: t('goals.themeSystem') },
                  { value: 'light', label: t('goals.themeLight') },
                  { value: 'dark', label: t('goals.themeDark') },
                ]}
                value={appearance.setting}
                onChange={appearance.setSetting}
                testID="theme"
              />
            </View>
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            <SwitchRow
              label={t('goals.vibration')}
              hint={t('goals.vibrationHint')}
              value={haptics}
              onValueChange={changeHaptics}
              testID="haptics"
            />
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            <ActionRow
              label={t('goals.clearSuggestions')}
              hint={t('goals.clearSuggestionsHint')}
              onPress={clearSuggestions}
              icon="trash-2"
              testID="clear-suggestions"
            />
          </View>
        </View>

        <Rule />
        <SectionTitle label={t('goals.data')} />
        {/*
          Attribution is a licence obligation, not a settings extra: it sits
          on the only screen the user ever opens on purpose.
        */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <ActionRow
            label={t('goals.sources')}
            hint={t('goals.sourcesHint')}
            onPress={openSources}
            icon="chevron-right"
            testID="open-sources"
          />
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted, marginTop: theme.spacing.lg },
            ]}
            maxFontSizeMultiplier={1.3}
            testID="app-version"
          >
            {t('goals.version', { version: APP_VERSION })}
          </Text>
        </View>
      </ScrollView>
      <Snackbar
        message={snackbar}
        onUndo={undoClear}
        bottom={insets.bottom + theme.spacing.lg}
        testID="goals-snackbar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
});
