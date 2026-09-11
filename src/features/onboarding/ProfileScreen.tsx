import React, { useCallback, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Chip } from '../../components/Chip';
import {
  NumberField,
  type NumberFieldHandle,
} from '../../components/NumberField';
import { ScreenHeader } from '../../components/ScreenHeader';
import { StepProgress } from '../../components/StepProgress';
import { SegmentedControl } from '../../components/SegmentedControl';
import type { RootStackParamList } from '../../app/navigation/routes';
import { prefs } from '../../data/prefs/prefs';
import {
  ACTIVITY_LEVELS,
  DEFAULT_PROFILE,
  type ActivityLevel,
  type GoalProfile,
  type Sex,
} from '../../domain/goals/mifflin';
import {
  parseProfileInput,
  type ProfileField,
} from '../../domain/goals/profileInput';
import { t, type CopyKey } from '../../i18n';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { OnboardingActions } from './OnboardingActions';
import { ONBOARDING_STEPS, skipOnboarding } from './finish';

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingProfile'
>;
type Route = RouteProp<RootStackParamList, 'OnboardingProfile'>;

const FIELDS: ProfileField[] = ['ageYears', 'heightCm', 'weightKg'];

const FIELD_COPY: Record<
  ProfileField,
  { label: CopyKey; unit: CopyKey; a11y: CopyKey }
> = {
  ageYears: {
    label: 'onboarding.age',
    unit: 'onboarding.ageUnit',
    a11y: 'onboarding.ageA11y',
  },
  heightCm: {
    label: 'onboarding.height',
    unit: 'onboarding.heightUnit',
    a11y: 'onboarding.heightA11y',
  },
  weightKg: {
    label: 'onboarding.weight',
    unit: 'onboarding.weightUnit',
    a11y: 'onboarding.weightA11y',
  },
};

const ACTIVITY_COPY: Record<ActivityLevel, { label: CopyKey; hint: CopyKey }> =
  {
    sedentary: {
      label: 'onboarding.sedentary',
      hint: 'onboarding.sedentaryHint',
    },
    light: { label: 'onboarding.light', hint: 'onboarding.lightHint' },
    moderate: { label: 'onboarding.moderate', hint: 'onboarding.moderateHint' },
    intense: { label: 'onboarding.intense', hint: 'onboarding.intenseHint' },
  };

/** Three digits is enough for every limit; one more so a typo can be clamped. */
const FIELD_MAX_LENGTH = 4;

/**
 * Step 2: the four answers Mifflin-St Jeor needs, already filled in with
 * ordinary values, so "Calcular" is reachable without typing anything. The
 * numbers use the number pad (with the same clamp-and-shake as "Metas") and
 * the activity level stays a set of four chips: all of them on screen, no
 * hidden options behind a picker.
 */
export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { mode, intent } = useRoute<Route>().params;

  const [profile, setProfile] = useState<GoalProfile>(() =>
    mode === 'recalculate' && prefs.hasProfile()
      ? prefs.getProfile()
      : { ...DEFAULT_PROFILE, intent },
  );
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const fields = useRef<Record<ProfileField, NumberFieldHandle | null>>({
    ageYears: null,
    heightCm: null,
    weightKg: null,
  });

  const update = useCallback((patch: Partial<GoalProfile>) => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    setProfile(next);
  }, []);

  const updateField = useCallback((field: ProfileField, value: number) => {
    const next = { ...profileRef.current, [field]: value };
    profileRef.current = next;
    setProfile(next);
  }, []);

  const focusNext = useCallback((field: ProfileField) => {
    const next = FIELDS[FIELDS.indexOf(field) + 1];
    if (next) fields.current[next]?.focus();
  }, []);

  const calculate = useCallback(() => {
    // The fields save on blur; committing them by hand first means a number
    // still under the cursor is part of the calculation that follows.
    for (const field of FIELDS) fields.current[field]?.commit();
    Keyboard.dismiss();
    navigation.navigate('OnboardingGoal', {
      mode,
      profile: profileRef.current,
    });
  }, [mode, navigation]);

  const skip = useCallback(() => {
    skipOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Today' }] });
  }, [navigation]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={t('onboarding.profileTitle')}
        titleLines={2}
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
            current={2}
            testID="onboarding-progress"
          />
        </View>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      >
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.lg,
          }}
        >
          <SegmentedControl<Sex>
            accessibilityLabel={t('onboarding.sex')}
            options={[
              { value: 'female', label: t('onboarding.female') },
              { value: 'male', label: t('onboarding.male') },
            ]}
            value={profile.sex}
            onChange={sex => update({ sex })}
            testID="profile-sex"
          />
        </View>
        {FIELDS.map((field, index) => (
          <NumberField
            key={field}
            ref={handle => {
              fields.current[field] = handle;
            }}
            label={t(FIELD_COPY[field].label)}
            unit={t(FIELD_COPY[field].unit)}
            value={profile[field]}
            accessibilityLabel={t(FIELD_COPY[field].a11y)}
            maxLength={FIELD_MAX_LENGTH}
            parse={text => parseProfileInput(field, text)}
            onCommit={value => updateField(field, value)}
            returnKeyType={index === FIELDS.length - 1 ? 'done' : 'next'}
            onSubmit={
              index === FIELDS.length - 1 ? undefined : () => focusNext(field)
            }
            testID={`profile-${field}`}
          />
        ))}
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
          }}
        >
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {t('onboarding.activity')}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('onboarding.activity')}
            style={[
              styles.chips,
              {
                marginTop: theme.spacing.md,
                columnGap: theme.spacing.sm,
                rowGap: theme.spacing.lg,
              },
            ]}
          >
            {ACTIVITY_LEVELS.map(level => (
              <Chip
                key={level}
                label={t(ACTIVITY_COPY[level].label)}
                selected={profile.activity === level}
                onPress={() => update({ activity: level })}
                testID={`activity-${level}`}
              />
            ))}
          </View>
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted, marginTop: theme.spacing.lg },
            ]}
            maxFontSizeMultiplier={1.3}
            testID="activity-hint"
          >
            {t(ACTIVITY_COPY[profile.activity].hint)}
          </Text>
        </View>
      </ScrollView>
      <OnboardingActions
        primaryLabel={t('onboarding.calculate')}
        onPrimary={calculate}
        onSkip={mode === 'first-run' ? skip : undefined}
        testID="profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Four chips on a 360 dp screen wrap onto a second line instead of
  // scrolling sideways: a choice that is off screen is a choice nobody makes.
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
