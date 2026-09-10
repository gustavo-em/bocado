import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '../theme';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

/** Design system §2.4: the "+" ring is 36 dp inside its 48 dp target. */
export const RING_SIZE = 36;
export const RING_BORDER = 1.5;

export interface AddRingProps {
  onPress: () => void;
  /** "Adicionar em Café da manhã": what the tester and TalkBack navigate by. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Design system §2.4 and §2.6: a 48 × 48 dp target holding a 36 dp ring in
 * `inkSubtle` with a 24 dp `plus` in `ink`. This one is the meal's own action —
 * it opens the search for that meal — so it never fills in `accent` and never
 * turns into "✓": that pair belongs to the search result row, where the ring is
 * per food and confirms a write.
 */
export function AddRing({ onPress, accessibilityLabel, testID }: AddRingProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.target,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            borderWidth: RING_BORDER,
            borderColor: theme.colors.inkSubtle,
          },
          press.style,
        ]}
      >
        <Icon name="plus" size="action" color={theme.colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
