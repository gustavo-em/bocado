import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';

import { Icon } from '../../components/Icon';
import { TextButton } from '../../components/TextButton';
import { usePressAnimation } from '../../components/usePressAnimation';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { RootStackParamList } from '../../app/navigation/routes';
import type { Intent } from '../../domain/goals/mifflin';
import { t, type CopyKey } from '../../i18n';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { skipOnboarding } from './finish';

type Navigation = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingIntent'
>;

/** Design system §2.1 sizing, one step up: a 72 dp row is a comfortable target. */
const OPTION_HEIGHT = 72;

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
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
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
      </View>
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xl,
          rowGap: theme.spacing.md,
        }}
      >
        {OPTIONS.map(option => (
          <IntentRow
            key={option.intent}
            label={t(option.label)}
            hint={t(option.hint)}
            onPress={() => choose(option.intent)}
            testID={`intent-${option.intent}`}
          />
        ))}
      </View>
      <View style={styles.spacer} />
      <View
        style={{
          paddingBottom: insets.bottom + theme.spacing.md,
          alignItems: 'center',
        }}
      >
        <TextButton
          label={t('onboarding.skip')}
          accessibilityLabel={t('onboarding.skip')}
          onPress={skip}
          tone="ink"
          testID="onboarding-skip"
        />
      </View>
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
});
