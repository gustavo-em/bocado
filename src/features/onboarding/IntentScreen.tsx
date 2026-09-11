import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

import { Icon } from '../../components/Icon';
import { Reveal } from '../../components/Reveal';
import { StepProgress } from '../../components/StepProgress';
import { TextButton } from '../../components/TextButton';
import { usePressAnimation } from '../../components/usePressAnimation';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { RootStackParamList } from '../../app/navigation/routes';
import type { Intent } from '../../domain/goals/mifflin';
import { t, type CopyKey } from '../../i18n';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { ONBOARDING_STEPS, skipOnboarding } from './finish';

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingIntent'
>;

/** Design system §2.1 sizing, one step up: a 72 dp row is a comfortable target. */
const OPTION_HEIGHT = 72;

/*
 * A leading glyph per direction was tried on the device and removed: at 20 dp
 * in `inkMuted`, a chevron and a bare dash read as three stray marks rather
 * than as a scale, and the row's own padding pushed them away from the text
 * they were supposed to qualify. The label already says it.
 */
const OPTIONS: { intent: Intent; label: CopyKey; hint: CopyKey }[] = [
  { intent: 'lose', label: 'onboarding.lose', hint: 'onboarding.loseHint' },
  {
    intent: 'maintain',
    label: 'onboarding.maintain',
    hint: 'onboarding.maintainHint',
  },
  { intent: 'gain', label: 'onboarding.gain', hint: 'onboarding.gainHint' },
];

interface IntentRowProps {
  label: string;
  hint: string;
  onPress: () => void;
  testID: string;
}

function IntentRow({ label, hint, onPress, testID }: IntentRowProps) {
  const theme = useTheme();
  const press = usePressAnimation(true);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.option,
          {
            height: OPTION_HEIGHT,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surfaceMuted,
          },
          press.style,
        ]}
      >
        <View style={styles.optionText}>
          <Text
            style={[
              theme.type.bodyMedium,
              textDefaults,
              { color: theme.colors.ink },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </Text>
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {hint}
          </Text>
        </View>
        <Icon name="chevron-right" size="row" color={theme.colors.inkMuted} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Step 1 of the first run: one question, three answers, no confirm button —
 * choosing is the step. "Pular" is there from the very first screen, so the
 * diary is never more than one tap away.
 *
 * This is the only step that composes itself on arrival. It is the initial
 * route, so nothing else is moving: the launch overlay hands over a still
 * screen and the blocks settle into it one after another, which is the first
 * impression the app gets to make. Steps 2 and 3 arrive on the navigator's
 * own `slide_from_right`, and a vertical rise on top of a horizontal slide
 * reads as two animations disagreeing — so they only advance the strip.
 */
export function IntentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();

  const choose = useCallback(
    (intent: Intent) => {
      navigation.navigate('OnboardingProfile', { mode: 'first-run', intent });
    },
    [navigation],
  );

  const skip = useCallback(() => {
    skipOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Today' }] });
  }, [navigation]);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader title={t('onboarding.intentTitle')} />
      <Reveal index={0} style={{ paddingHorizontal: theme.spacing.lg }}>
        <Text
          style={[
            theme.type.body,
            textDefaults,
            { color: theme.colors.inkMuted },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {t('onboarding.intentHint')}
        </Text>
        <View style={{ paddingTop: theme.spacing.lg }}>
          <StepProgress
            total={ONBOARDING_STEPS}
            current={1}
            testID="onboarding-progress"
          />
        </View>
      </Reveal>
      {/*
        The question stays at the top and the three answers sit in the middle
        of what is left, which on a 6.7" phone is where the thumb already is.
        Packed under the header they left the bottom half of the screen empty
        and the targets at the far end of a reach — measured on the device.
      */}
      <View style={styles.spacer} />
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          rowGap: theme.spacing.md,
        }}
      >
        {OPTIONS.map((option, index) => (
          <Reveal key={option.intent} index={index + 1}>
            <IntentRow
              label={t(option.label)}
              hint={t(option.hint)}
              onPress={() => choose(option.intent)}
              testID={`intent-${option.intent}`}
            />
          </Reveal>
        ))}
      </View>
      <View style={styles.spacer} />
      <Reveal
        index={OPTIONS.length + 1}
        style={[
          styles.skip,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        <TextButton
          label={t('onboarding.skip')}
          accessibilityLabel={t('onboarding.skip')}
          onPress={skip}
          tone="ink"
          testID="onboarding-skip"
        />
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  skip: {
    alignItems: 'center',
  },
});
