import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type {
  NormalizedFood,
  ServingKind,
} from '../domain/food/NormalizedFood';
import { defaultServing, portionSnapshot } from '../domain/food/portion';
import { localizedName } from '../domain/food/rank';
import { matchRanges } from '../domain/food/searchQuery';
import { currentLanguage, t } from '../i18n';
import { formatGrams, formatKcal, formatQuantity } from '../i18n/format';
import { resultRowHeight, useTheme } from '../theme';
import {
  CONFIRM,
  CONFIRM_SCALE_FROM,
  FADE,
  LIST_RISE_DP,
  LIST_STAGGER_MAX_ROWS,
  rowStaggerDelayMs,
} from '../theme/motion';
import { tabularNumbers, textDefaults } from '../theme/type';
import { RING_BORDER, RING_SIZE } from './AddRing';
import { Icon } from './Icon';
import { SourceBadge, sourceLabel } from './SourceBadge';
import { usePressAnimation } from './usePressAnimation';

export const FOOD_RESULT_ROW_HEIGHT = resultRowHeight;

export type NameTone = 'first' | 'rest' | 'match';

export interface NameSegment {
  text: string;
  tone: NameTone;
}

/**
 * Splits a faceted name ("Arroz, tipo 1, cozido") into runs: the first facet,
 * the facets after the first comma, and the characters that match the typed
 * query — mapped 1:1 through `matchRanges`, so accents never shift the bold.
 */
export function nameSegments(name: string, query: string): NameSegment[] {
  const chars = Array.from(name);
  const comma = chars.indexOf(',');
  const facetEnd = comma === -1 ? chars.length : comma;
  const ranges = matchRanges(name, query);
  const segments: NameSegment[] = [];
  let range = 0;
  chars.forEach((char, index) => {
    while (range < ranges.length && ranges[range].end <= index) range += 1;
    const current = ranges[range];
    const matched =
      current !== undefined && index >= current.start && index < current.end;
    const tone: NameTone = matched
      ? 'match'
      : index < facetEnd
      ? 'first'
      : 'rest';
    const last = segments[segments.length - 1];
    if (last && last.tone === tone) last.text += char;
    else segments.push({ text: char, tone });
  });
  return segments;
}

export interface AddButtonProps {
  added: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * The "+" of a list row, exported so the composite "Repetir" row of task 04
 * carries the very same target, ring and confirmation.
 */
export function AddButton({
  added,
  accessibilityLabel,
  onPress,
  testID,
}: AddButtonProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const confirm = useSharedValue(1);
  const wasAdded = useRef(added);

  useEffect(() => {
    if (added && !wasAdded.current) {
      confirm.value = CONFIRM_SCALE_FROM;
      confirm.value = withTiming(1, CONFIRM);
    }
    wasAdded.current = added;
  }, [added, confirm]);

  const confirmStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirm.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: added }}
      style={[
        styles.addTarget,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID={testID}
    >
      <Animated.View style={press.style}>
        <Animated.View
          style={[
            styles.ring,
            added
              ? { backgroundColor: theme.colors.accent }
              : {
                  borderWidth: RING_BORDER,
                  borderColor: theme.colors.inkSubtle,
                },
            confirmStyle,
          ]}
        >
          <Icon
            name={added ? 'check' : 'plus'}
            size="action"
            color={added ? theme.colors.onAccent : theme.colors.ink}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** The portion actually written for this food in this session, if any. */
export interface AddedPortion {
  grams: number;
  servingLabel?: string;
  servingCount?: number;
  /** `package` labels are printed on the wrapper and carry their own count. */
  servingKind?: ServingKind;
  kcal: number;
}

export interface FoodResultRowProps {
  food: NormalizedFood;
  added: boolean;
  /** Replaces the default portion on line 2 once the food has been added. */
  addedPortion?: AddedPortion;
  /**
   * What the "+" is about to write when it is not the default serving — the
   * last portion used for this food (task 04). Line 2 shows it before the tap
   * and `addedPortion` takes over after it, so the numbers never change.
   */
  previewPortion?: AddedPortion;
  query: string;
  /** The "+": writes the default portion in one tap. */
  onAdd: (food: NormalizedFood) => void;
  /** The name and the "✓": open the portion sheet. */
  onOpen: (food: NormalizedFood) => void;
  /**
   * Position in the list, only so the first rows can arrive in order. Rows
   * without one — the "Repetir" composite, a recycled row further down — are
   * simply there.
   */
  index?: number;
  testID?: string;
}

/**
 * Design system §2.4: 64 dp, no rule, no card. Line 1 is the faceted name with
 * the kcal per 100 g at the end; line 2 is the portion — the default one, or
 * the one that was written once the row carries its "✓" — its kcal and the
 * source badge. Tapping the name opens the portion sheet; the "+" writes in
 * one tap and, once added, opens the sheet to adjust what it wrote.
 */
export const FoodResultRow = React.memo(function FoodResultRowBase({
  food,
  added,
  addedPortion,
  previewPortion,
  query,
  onAdd,
  onOpen,
  index = LIST_STAGGER_MAX_ROWS,
  testID,
}: FoodResultRowProps) {
  const theme = useTheme();
  const locale = currentLanguage();
  const name = localizedName(food, locale);
  const bodyPress = usePressAnimation(false);

  /*
    Once per food, not once per mount: FlashList recycles the cell, so a row
    that keeps its instance while a new query fills it must still arrive with
    the rest. Scrolling changes neither the food nor the index of a cell, so
    nothing animates under the finger — and past the sixth row nothing
    animates at all.

    The arrival is travel only, and the row is opaque from its first frame. It
    used to fade in from zero, and a row left at opacity 0 — a cell recycled
    mid-flight, an animation dropped while the list measures, a device that
    never plays it — is not merely unseen: Android drops it from the
    accessibility tree while it keeps its height, so the top of the list reads
    as a hole with rows below it. Nothing that can hide a result is worth the
    fade.
  */
  const reduced = useReducedMotion();
  const entering = !reduced && index < LIST_STAGGER_MAX_ROWS;
  const enter = useSharedValue(entering ? 0 : 1);
  useEffect(() => {
    if (!entering) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withDelay(
      rowStaggerDelayMs(index, reduced),
      withTiming(1, FADE),
    );
    // Only a new food replays it: `added`, the portion and the query must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food.id]);
  const enterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - enter.value) * LIST_RISE_DP }],
  }));

  const portion = useMemo(() => {
    const snapshot =
      addedPortion ??
      previewPortion ??
      portionSnapshot(food, defaultServing(food), 1, locale);
    const grams = formatGrams(snapshot.grams);
    const kcal = formatKcal(snapshot.kcal);
    const brand = food.brand;
    // Line 2 of a product opens with its brand: "Nestlé · 1 porção (20 g)".
    const withBrand = (text: string) =>
      brand === undefined
        ? text
        : t('search.brandPortion', { brand, portion: text });
    if (snapshot.servingLabel === undefined) {
      // No serving of its own, so the portion is the 100 g reference — the
      // same number the row already prints on the right as kcal/100 g. The
      // Open Food Facts search index leaves `serving_size` null for most
      // products, so this is the common case for a label: repeating it here
      // would spend the context line saying nothing. A branded product shows
      // its brand instead, and a generic one leaves the line to the name.
      const reference = withBrand(t('search.portionGrams', { grams, kcal }));
      return {
        label: brand === undefined ? reference : brand,
        fixed: '',
        a11y: `${grams} ${t('common.grams')}`,
        kcal,
      };
    }
    const count = formatQuantity(snapshot.servingCount ?? 1);
    // The wrapper's own words ("1 porção (20 g)") are never prefixed by a
    // second count; a household measure always is.
    const printed =
      snapshot.servingKind === 'package' && (snapshot.servingCount ?? 1) === 1
        ? snapshot.servingLabel
        : t('search.portionLabel', { count, label: snapshot.servingLabel });
    return {
      label: withBrand(printed),
      fixed: t('search.portionFixed', { grams, kcal }),
      a11y: t('search.portionA11y', {
        count,
        label: snapshot.servingLabel,
        grams,
      }),
      kcal,
    };
  }, [food, addedPortion, previewPortion, locale]);

  const kcalPer100 = t('search.kcalPer100', {
    kcal: formatKcal(food.per100g.kcal),
  });
  const segments = useMemo(() => nameSegments(name, query), [name, query]);
  const handleAdd = useCallback(() => onAdd(food), [onAdd, food]);
  const handleOpen = useCallback(() => onOpen(food), [onOpen, food]);

  const rowLabel = t('search.rowA11y', {
    food: name,
    portion: portion.a11y,
    kcal: portion.kcal,
    source: sourceLabel(food.source),
  });
  const addLabel = added
    ? t('search.addedFood', { food: name })
    : t('search.addFood', { food: name });

  const tones = useMemo(
    () => ({
      first: [theme.type.bodyMedium, { color: theme.colors.ink }],
      rest: [theme.type.body, { color: theme.colors.inkMuted }],
      match: [
        theme.type.bodyMedium,
        { fontFamily: theme.fonts.bodySemiBold, color: theme.colors.ink },
      ],
      secondary: [
        theme.type.label,
        textDefaults,
        { color: theme.colors.inkMuted },
      ],
    }),
    [theme],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        {
          height: FOOD_RESULT_ROW_HEIGHT,
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
        },
        enterStyle,
      ]}
      testID={testID}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={rowLabel}
        accessibilityHint={t('portion.quantityHint')}
        onPress={handleOpen}
        onPressIn={bodyPress.onPressIn}
        onPressOut={bodyPress.onPressOut}
        style={styles.body}
      >
        <Animated.View style={bodyPress.style}>
          <View style={styles.line}>
            <Text
              style={[tones.first, textDefaults, styles.name]}
              numberOfLines={1}
              // The last facet is what tells "frito" from "cozido/10 minutos"
              // apart, so the cut is taken out of the middle of the name.
              ellipsizeMode="middle"
              maxFontSizeMultiplier={1.3}
            >
              {segments.map((segment, segmentIndex) => (
                <Text key={segmentIndex} style={tones[segment.tone]}>
                  {segment.text}
                </Text>
              ))}
            </Text>
            <Text
              style={[
                theme.type.caption,
                textDefaults,
                tabularNumbers,
                styles.kcalPer100,
                { color: theme.colors.inkMuted, marginLeft: theme.spacing.sm },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {kcalPer100}
            </Text>
          </View>
          <View style={styles.secondLine}>
            <Text
              style={[tones.secondary, styles.portionLabel]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {portion.label}
            </Text>
            {portion.fixed.length > 0 ? (
              <Text
                style={[tones.secondary, tabularNumbers, styles.portionFixed]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {portion.fixed}
              </Text>
            ) : null}
            <View style={[styles.badge, { paddingLeft: theme.spacing.sm }]}>
              <SourceBadge source={food.source} />
            </View>
          </View>
        </Animated.View>
      </Pressable>
      <AddButton
        added={added}
        accessibilityLabel={addLabel}
        onPress={added ? handleOpen : handleAdd}
        testID={testID ? `${testID}-add` : undefined}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  secondLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flexShrink: 1,
  },
  // kcal/100 g and the badge line up as one right-hand column, so variants of
  // the same food can be compared down the list instead of across it.
  kcalPer100: {
    flexShrink: 0,
    flexGrow: 1,
    textAlign: 'right',
  },
  badge: {
    marginLeft: 'auto',
  },
  portionLabel: {
    flexShrink: 1,
  },
  portionFixed: {
    flexShrink: 0,
  },
  addTarget: {
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
