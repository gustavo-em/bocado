import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { EditableKcal } from '../../components/EditableKcal';
import { Icon } from '../../components/Icon';
import {
  NumberField,
  type NumberFieldHandle,
} from '../../components/NumberField';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StepProgress } from '../../components/StepProgress';
import type { RootStackParamList } from '../../app/navigation/routes';
import type { DailyGoal } from '../../domain/diary/Meal';
import { parseGoalInput } from '../../domain/diary/daySummary';
import {
  KCAL_FLOOR,
  calculateGoal,
  macroPercent,
  type Intent,
} from '../../domain/goals/mifflin';
import { parseGoalKcalInput } from '../../domain/goals/profileInput';
import { t, type CopyKey } from '../../i18n';
import { formatGrams, formatKcal } from '../../i18n/format';
import { useTheme } from '../../theme';
import { FADE, SELECT } from '../../theme/motion';
import { textDefaults } from '../../theme/type';
import { OnboardingActions } from './OnboardingActions';
import { ONBOARDING_STEPS, saveCalculatedGoal, skipOnboarding } from './finish';

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingGoal'
>;
type Route = RouteProp<RootStackParamList, 'OnboardingGoal'>;

type MacroField = Exclude<keyof DailyGoal, 'kcal'>;

const MACROS: MacroField[] = ['protein_g', 'carbs_g', 'fat_g'];

const MACRO_COPY: Record<
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

const EXPLANATION: Record<Intent, CopyKey> = {
  lose: 'onboarding.howWeCalculateLose',
  maintain: 'onboarding.howWeCalculateMaintain',
  gain: 'onboarding.howWeCalculateGain',
};

/** One digit past the 999 g limit, so "1000" can be typed and clamped. */
const MACRO_MAX_LENGTH = 4;
const CHEVRON_TURN = 180;

/** The paragraph of "Como calculamos": present or absent, fading, never sliding. */
function Explanation({ text }: { text: string }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, FADE);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const theme = useTheme();
  return (
    <Animated.View style={style}>
      <Text
        style={[
          theme.type.label,
          textDefaults,
          { color: theme.colors.inkMuted, paddingBottom: theme.spacing.sm },
        ]}
        maxFontSizeMultiplier={1.3}
        testID="how-we-calculate-body"
      >
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Step 3: the goal the answers produced, as the one number on the screen —
 * editable in place, with the macros it implies underneath and the arithmetic
 * one tap away. When the floor decided the number, a quiet line says so; it
 * is information, not a warning.
 */
export function GoalScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { mode, profile } = useRoute<Route>().params;

  const [calculated] = useState(() => calculateGoal(profile));
  const [goal, setGoal] = useState<DailyGoal>(calculated.goal);
  const goalRef = useRef(goal);
  goalRef.current = goal;
  const [expanded, setExpanded] = useState(false);
  // The number arrives with the screen; it only rolls when it changes after
  // that, so nothing counts up from zero while the slide is still running.
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(true), []);

  const kcalField = useRef<NumberFieldHandle | null>(null);
  const macroFields = useRef<Record<MacroField, NumberFieldHandle | null>>({
    protein_g: null,
    carbs_g: null,
    fat_g: null,
  });

  const commitField = useCallback((field: keyof DailyGoal, value: number) => {
    // Editing the calories leaves the grams alone: only their share of the
    // goal is recomputed. Nothing is rewritten under the user's finger.
    const next = { ...goalRef.current, [field]: value };
    goalRef.current = next;
    setGoal(next);
  }, []);

  const commitAll = useCallback(() => {
    kcalField.current?.commit();
    for (const macro of MACROS) macroFields.current[macro]?.commit();
    Keyboard.dismiss();
  }, []);

  const confirm = useCallback(() => {
    commitAll();
    saveCalculatedGoal(goalRef.current, profile);
    if (mode === 'recalculate') {
      navigation.navigate('Goals');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Today' }] });
  }, [commitAll, mode, navigation, profile]);

  const skip = useCallback(() => {
    skipOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Today' }] });
  }, [navigation]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  const toggleExplanation = useCallback(() => setExpanded(value => !value), []);

  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(expanded ? CHEVRON_TURN : 0, SELECT);
  }, [expanded, turn]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t('onboarding.goalTitle')}
        leading={{
          icon: 'chevron-left',
          onPress: goBack,
          accessibilityLabel: t('common.back'),
        }}
      />
      {mode === 'recalculate' ? null : (
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
        >
          <StepProgress
            total={ONBOARDING_STEPS}
            current={3}
            testID="onboarding-progress"
          />
        </View>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      >
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <EditableKcal
            ref={kcalField}
            value={goal.kcal}
            parse={parseGoalKcalInput}
            onCommit={value => commitField('kcal', value)}
            // The whole sentence is the label, not the value: Android 10 has
            // no state description, so this is what a screen reader — and the
            // node tree — actually carries.
            accessibilityLabel={t('onboarding.goalA11y', {
              kcal: formatKcal(goal.kcal),
            })}
            accessibilityValue={`${formatKcal(goal.kcal)} ${t('common.kcal')}`}
            animate={animate}
            testID="goal-hero"
          />
          {calculated.floorApplied ? (
            <Text
              style={[
                theme.type.label,
                textDefaults,
                { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
              ]}
              maxFontSizeMultiplier={1.3}
              testID="goal-floor-note"
            >
              {t('onboarding.floorNote', {
                kcal: formatKcal(KCAL_FLOOR[profile.sex]),
              })}
            </Text>
          ) : null}
          <Pressable
            onPress={toggleExplanation}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={t('onboarding.howWeCalculate')}
            style={[
              styles.disclosure,
              {
                minHeight: theme.touchTarget,
                marginTop: theme.spacing.sm,
                columnGap: theme.spacing.sm,
              },
            ]}
            testID="how-we-calculate"
          >
            <Text
              style={[
                theme.type.bodyMedium,
                textDefaults,
                { color: theme.colors.ink },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {t('onboarding.howWeCalculate')}
            </Text>
            <Animated.View style={chevronStyle}>
              <Icon
                name="chevron-down"
                size="row"
                color={theme.colors.inkMuted}
              />
            </Animated.View>
          </Pressable>
          {expanded ? (
            <Explanation
              text={t(EXPLANATION[profile.intent], {
                expenditure: formatKcal(calculated.expenditure),
              })}
            />
          ) : null}
          <Text
            style={[
              theme.type.label,
              textDefaults,
              {
                color: theme.colors.inkMuted,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.sm,
              },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {t('onboarding.macros')}
          </Text>
        </View>
        {MACROS.map((macro, index) => (
          <NumberField
            key={macro}
            ref={handle => {
              macroFields.current[macro] = handle;
            }}
            label={t(MACRO_COPY[macro].label)}
            secondary={t('goals.macroPercent', {
              percent: macroPercent(
                MACRO_COPY[macro].share,
                goal[macro],
                goal.kcal,
              ),
            })}
            unit={t('common.grams')}
            value={goal[macro]}
            accessibilityLabel={t(MACRO_COPY[macro].a11y)}
            maxLength={MACRO_MAX_LENGTH}
            format={formatGrams}
            parse={text => parseGoalInput(macro, text)}
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
      </ScrollView>
      <OnboardingActions
        primaryLabel={
          mode === 'recalculate' ? t('common.save') : t('onboarding.start')
        }
        onPrimary={confirm}
        onSkip={mode === 'first-run' ? skip : undefined}
        testID="goal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
