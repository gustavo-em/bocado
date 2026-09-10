import React, { forwardRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { t } from '../i18n';
import { useTheme } from '../theme';
import { textDefaults } from '../theme/type';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

export const SEARCH_FIELD_HEIGHT = 48;

/** The search glyph sits 14 dp from the field's edge (design system §2.14). */
const ICON_INSET = 14;

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
  testID?: string;
}

export type SearchFieldHandle = React.ComponentRef<typeof TextInput>;

/**
 * Design system §2.14: 48 dp on `surfaceMuted`, radius `md`, no border. The
 * clear button only exists while there is text, so an empty field has one
 * target fewer to explain.
 */
export const SearchField = forwardRef<SearchFieldHandle, SearchFieldProps>(
  function SearchFieldBase(
    { value, onChangeText, onClear, autoFocus, testID },
    ref,
  ) {
    const theme = useTheme();
    const press = usePressAnimation(false);
    const hasText = value.length > 0;
    return (
      <View
        style={[
          styles.field,
          hasText ? null : styles.fieldWithoutClear,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <View style={styles.glyph} pointerEvents="none">
          <Icon name="search" size="row" color={theme.colors.inkMuted} />
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={t('search.placeholder')}
          placeholderTextColor={theme.colors.inkMuted}
          cursorColor={theme.colors.accent}
          selectionColor={theme.colors.accent}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          returnKeyType="search"
          blurOnSubmit={false}
          accessibilityLabel={t('search.placeholder')}
          maxFontSizeMultiplier={1.3}
          style={[
            theme.type.body,
            textDefaults,
            styles.input,
            { color: theme.colors.ink },
          ]}
          testID={testID}
        />
        {hasText ? (
          <Pressable
            onPress={onClear}
            onPressIn={press.onPressIn}
            onPressOut={press.onPressOut}
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            hitSlop={0}
            style={[
              styles.clear,
              { width: theme.touchTarget, height: theme.touchTarget },
            ]}
            testID={testID ? `${testID}-clear` : undefined}
          >
            <Animated.View style={press.style}>
              <Icon name="x" size="row" color={theme.colors.ink} />
            </Animated.View>
          </Pressable>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  field: {
    height: SEARCH_FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldWithoutClear: {
    paddingRight: ICON_INSET,
  },
  glyph: {
    paddingLeft: ICON_INSET,
    paddingRight: 8,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: SEARCH_FIELD_HEIGHT,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clear: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
