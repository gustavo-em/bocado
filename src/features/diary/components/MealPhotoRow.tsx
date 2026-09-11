import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '../../../components/Icon';
import { usePressAnimation } from '../../../components/usePressAnimation';
import type { Meal } from '../../../domain/diary/Meal';
import {
  mealPhotoUri,
  type MealPhoto,
} from '../../../data/diary/MealPhotoRepository';
import { t } from '../../../i18n';
import { useTheme, touchTarget } from '../../../theme';
import { textDefaults } from '../../../theme/type';

/**
 * How tall the thumbnail is. A plate is photographed from above and comes out
 * roughly square, so a 3:2 strip across the column shows the middle of it and
 * crops the tablecloth — which is the part worth seeing. 96 dp is a glance,
 * not a viewer: the day screen is a list of what was eaten, and a photo that
 * pushed the next meal off the fold would change what the screen is for.
 */
const THUMB_HEIGHT = 96;

export interface MealPhotoRowProps {
  meal: Meal;
  /** The meal's name as it reads on screen, for the spoken labels. */
  mealTitle: string;
  photo?: MealPhoto;
  onAdd: (meal: Meal) => void;
  onRemove: (meal: Meal) => void;
  testID?: string;
}

/**
 * A plate's photo under its meal: the invitation when there is none, the
 * picture and a way to drop it when there is.
 *
 * It sits below the entries rather than in the meal header. The header was
 * settled with a subtotal in a fixed column and one ink ring (task 18), and a
 * third element there would re-open that decision to make room for something
 * the screen only sometimes has.
 */
export function MealPhotoRow({
  meal,
  mealTitle,
  photo,
  onAdd,
  onRemove,
  testID,
}: MealPhotoRowProps) {
  const theme = useTheme();
  const addPress = usePressAnimation();
  const removePress = usePressAnimation(true);

  const add = useCallback(() => onAdd(meal), [meal, onAdd]);
  const remove = useCallback(() => onRemove(meal), [meal, onRemove]);

  if (!photo) {
    return (
      <Pressable
        onPress={add}
        onPressIn={addPress.onPressIn}
        onPressOut={addPress.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={t('photo.addA11y', { meal: mealTitle })}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.invite,
            {
              minHeight: touchTarget,
              paddingHorizontal: theme.spacing.lg,
              columnGap: theme.spacing.sm,
            },
            addPress.style,
          ]}
        >
          <Icon name="image" size="row" color={theme.colors.inkMuted} />
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {t('photo.add')}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          columnGap: theme.spacing.sm,
        },
      ]}
    >
      <Pressable
        onPress={add}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('photo.thumbA11y', { meal: mealTitle })}
        accessibilityHint={t('photo.add')}
        style={styles.thumbTarget}
        testID={testID}
      >
        <Image
          source={{ uri: mealPhotoUri(photo) }}
          style={[
            styles.thumb,
            {
              height: THUMB_HEIGHT,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
            },
          ]}
          resizeMode="cover"
        />
      </Pressable>
      <Pressable
        onPress={remove}
        onPressIn={removePress.onPressIn}
        onPressOut={removePress.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={t('photo.removeA11y', { meal: mealTitle })}
        hitSlop={theme.spacing.sm}
        testID={testID ? `${testID}-remove` : undefined}
      >
        <Animated.View
          style={[
            styles.removeTarget,
            { width: touchTarget, height: touchTarget },
            removePress.style,
          ]}
        >
          <Icon name="trash-2" size="row" color={theme.colors.inkMuted} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbTarget: {
    flex: 1,
  },
  thumb: {
    width: '100%',
  },
  removeTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
