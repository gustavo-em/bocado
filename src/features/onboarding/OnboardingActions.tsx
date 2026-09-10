import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../components/PrimaryButton';
import { TextButton } from '../../components/TextButton';
import { useKeyboardInset } from '../../components/useKeyboardInset';
import { t } from '../../i18n';
import { useTheme } from '../../theme';

export interface OnboardingActionsProps {
  primaryLabel: string;
  onPrimary: () => void;
  /** Omitted in "Recalcular": there is nothing to skip, only a way back. */
  onSkip?: () => void;
  testID?: string;
}

/**
 * The bottom of every step: one accented action across the width and, on the
 * first run, "Pular" under it in plain ink — an exit that is always available
 * and never louder than the way forward. Sits above the keyboard and the
 * bottom inset, so a number pad never covers it.
 */
export function OnboardingActions({
  primaryLabel,
  onPrimary,
  onSkip,
  testID,
}: OnboardingActionsProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset(insets.bottom);

  return (
    <View
      style={[
        styles.block,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: insets.bottom + keyboard + theme.spacing.md,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <PrimaryButton
        label={primaryLabel}
        onPress={onPrimary}
        testID={testID ? `${testID}-primary` : undefined}
      />
      {onSkip === undefined ? null : (
        <View style={{ marginTop: theme.spacing.xs }}>
          <TextButton
            label={t('onboarding.skip')}
            accessibilityLabel={t('onboarding.skip')}
            onPress={onSkip}
            tone="ink"
            testID="onboarding-skip"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
  },
});
