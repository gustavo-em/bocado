import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  type GestureType,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { SELECT } from '../theme/motion';
import { textDefaults } from '../theme/type';
import { usePressAnimation } from './usePressAnimation';

/** Design system §2.3: 32 dp tall, 12 dp of side padding, 8 dp apart. */
export const CHIP_HEIGHT = 32;
const CHIP_PADDING = 12;
const CHIP_GAP = 8;
/** 32 + 8 above and below reaches the 48 dp target. */
const CHIP_HIT_SLOP = { top: 8, bottom: 8, left: 0, right: 0 };
/** How much of the next chip stays in sight, so the line reads as scrollable. */
const CHIP_PEEK = 24;

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Design system §2.3: `surfaceMuted` → `accentSoft` when selected, with the
 * label going from `label` `ink` to `labelMedium` `accent`. The fill is an
 * overlay whose opacity animates (`SELECT`, 120 ms), so nothing but
 * `opacity` moves. Single selection, so the role is `radio`.
 */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  testID,
}: ChipProps) {
  const theme = useTheme();
  const fill = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(selected ? 1 : 0, SELECT);
  }, [selected, fill]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        {
          paddingHorizontal: CHIP_PADDING,
          borderRadius: theme.radii.pill,
          backgroundColor: theme.colors.surfaceMuted,
        },
      ]}
      testID={testID}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.accentSoft,
          },
          fillStyle,
        ]}
      />
      <Text
        style={[
          selected ? theme.type.labelMedium : theme.type.label,
          textDefaults,
          { color: selected ? theme.colors.accent : theme.colors.ink },
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The name never pushes the kcal out of a chip (design system §2.3). */
const ACTION_CHIP_MAX_WIDTH = 240;
/** Narrow enough to stay a chip on a 320 dp screen, wide enough to read. */
const ACTION_CHIP_MIN_WIDTH = 120;
/** Side padding the rows of action chips are laid out against (`spacing.lg`). */
const ACTION_ROW_GUTTER = 16;

/**
 * The widest an action chip may be on this screen: the whole line between the
 * gutters, less the peek that says it scrolls, and never past
 * `ACTION_CHIP_MAX_WIDTH`.
 *
 * Half the line was tried first, so two chips fit whole on a 360 dp screen —
 * but "Arroz, tipo 1, cozido" does not fit in 148 dp, and a chip that writes
 * straight to the diary has to be read before it is tapped. A name whole and
 * a second chip half seen (which is what a scroller looks like) beats two
 * chips that both say "Arroz, tipo…".
 */
export function actionChipMaxWidth(windowWidth: number): number {
  const usable = windowWidth - 2 * ACTION_ROW_GUTTER - CHIP_PEEK;
  return Math.max(
    ACTION_CHIP_MIN_WIDTH,
    Math.min(ACTION_CHIP_MAX_WIDTH, Math.floor(usable)),
  );
}

export interface ActionChipProps {
  /** What the chip is about — a food name; shrinks first when long. */
  label: string;
  /** The tail in muted ink ("96 kcal"); kept whole. */
  detail?: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  onLongPress?: () => void;
  /**
   * How the long press is named in the screen reader's action menu. Required
   * in spirit whenever `onLongPress` is given: a gesture nobody can perform is
   * not an action.
   */
  longPressLabel?: string;
  testID?: string;
}

/**
 * A chip that *does* something instead of selecting one of a set: the same
 * anatomy of §2.3 (32 dp, pill, `surfaceMuted`, 48 dp target through the hit
 * slop), but a button for assistive tech, never "selected", never accented.
 * Task 04 uses it for "Recentes", "Favoritos" and the empty meals of "Hoje":
 * one tap logs the remembered portion, a long press opens the portion sheet.
 * The long press is also published as an accessibility action, so it can be
 * reached from TalkBack's action menu instead of only by holding a finger.
 */
export const ActionChip = React.memo(function ActionChipBase({
  label,
  detail,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onLongPress,
  longPressLabel,
  testID,
}: ActionChipProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const { width } = useWindowDimensions();
  const chipStyle = useMemo(
    () => ({
      maxWidth: actionChipMaxWidth(width),
      paddingHorizontal: CHIP_PADDING,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
    }),
    [width, theme.radii.pill, theme.colors.surfaceMuted],
  );
  const actions = useMemo(
    () =>
      onLongPress
        ? [{ name: 'longpress', label: longPressLabel ?? accessibilityHint }]
        : undefined,
    [onLongPress, longPressLabel, accessibilityHint],
  );
  const onAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === 'longpress') onLongPress?.();
    },
    [onLongPress],
  );
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={actions}
      onAccessibilityAction={onLongPress ? onAction : undefined}
      style={[styles.chip, chipStyle]}
      testID={testID}
    >
      <Animated.View style={[styles.actionContent, press.style]}>
        <Text
          style={[
            theme.type.label,
            textDefaults,
            styles.actionLabel,
            { color: theme.colors.ink },
          ]}
          numberOfLines={1}
          // The cut, when there is one, comes off the end: cutting the middle
          // ate the readable head of the name ("Arroz,…zido") and left less to
          // recognise than "Arroz, tipo 1…" does.
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {detail === undefined ? null : (
          <Text
            style={[
              theme.type.label,
              textDefaults,
              styles.actionDetail,
              { color: theme.colors.inkMuted, marginLeft: CHIP_GAP / 2 },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {detail}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

export interface ChipRowProps {
  /** Announced as the group's name ("Medida", "Mover para…"). */
  accessibilityLabel: string;
  /**
   * `select` is one-of-a-set (radiogroup); `actions` is a line of buttons,
   * which must not be announced as a radio group.
   */
  group?: 'select' | 'actions';
  /** Side padding, so the row bleeds to the gutter while scrolling. */
  gutter?: number;
  /** Index of the chip in effect; the row scrolls to keep it in sight. */
  selectedIndex?: number;
  /**
   * A chip that never scrolls and belongs to the same group. The portion sheet
   * pins "g" (or "ml") here so the unit the food is weighed in is on screen for
   * every food, however many measures it carries.
   */
  pinned?: React.ReactNode;
  /** Which end the pinned chip holds. `start` is the head of the line (spec 09). */
  pinnedSide?: 'start' | 'end';
  /**
   * A horizontal gesture of the screen behind the row (the day swipe in
   * "Hoje") that must wait for this line to decide first: dragging the chips
   * scrolls them and never changes the day underneath.
   */
  blocksGesture?: React.MutableRefObject<GestureType | undefined>;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Design system §2.3: a single line of chips that scrolls sideways and never
 * wraps onto a second row inside a sheet.
 *
 * Three things keep the far end of the line from being invisible: `pinned`
 * holds the last chip out of the scroll altogether, the scrolling part ends
 * with a peek of empty space instead of flush against the gutter, and it
 * scrolls to the selected chip whenever that chip is off screen — a "g" or a
 * "Jantar" nobody can see is a choice nobody makes.
 */
export function ChipRow({
  accessibilityLabel,
  group = 'select',
  gutter = 0,
  selectedIndex,
  pinned,
  pinnedSide = 'end',
  blocksGesture,
  children,
  testID,
}: ChipRowProps) {
  const pinnedFirst = pinned !== undefined && pinnedSide === 'start';
  const scroller = useRef<ScrollViewInstance>(null);
  const layouts = useRef(new Map<number, { x: number; width: number }>());
  const viewport = useRef(0);
  const offset = useRef(0);

  const reveal = useCallback((index: number | undefined) => {
    if (index === undefined) return;
    const layout = layouts.current.get(index);
    if (!layout || viewport.current === 0) return;
    const left = layout.x;
    const right = layout.x + layout.width;
    // Only moves when the chip is actually out of sight, and stops with the
    // next chip peeking in, so the line reads as scrollable.
    if (right > offset.current + viewport.current - CHIP_PEEK) {
      scroller.current?.scrollTo({
        x: right - viewport.current + CHIP_PEEK,
        animated: true,
      });
      return;
    }
    if (left < offset.current + CHIP_PEEK) {
      scroller.current?.scrollTo({
        x: Math.max(0, left - CHIP_PEEK),
        animated: true,
      });
    }
  }, []);

  useEffect(() => {
    reveal(selectedIndex);
  }, [selectedIndex, reveal]);

  const onContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewport.current = event.nativeEvent.layout.width;
      reveal(selectedIndex);
    },
    [reveal, selectedIndex],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.x;
    },
    [],
  );

  const items = React.Children.toArray(children);

  /*
    The scroll of the line, declared against the screen's own pan so the day
    never changes under a finger that was reading the chips. Native, so the
    scrolling itself stays where it already was: no Reanimated, no duration.
  */
  const native = React.useMemo(
    () =>
      blocksGesture
        ? Gesture.Native().blocksExternalGesture(blocksGesture)
        : null,
    [blocksGesture],
  );

  const scroll = (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onLayout={onContentLayout}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        styles.row,
        {
          // The peek is what tells the eye the line continues past the edge.
          // With a pinned chip the gap lives outside the scroller on that
          // side instead, so the line can be scrolled to its true end.
          paddingLeft: pinnedFirst ? 0 : gutter,
          paddingRight: pinned && !pinnedFirst ? 0 : gutter + CHIP_PEEK,
          columnGap: CHIP_GAP,
        },
      ]}
      style={[
        pinned ? styles.scrollBeforePinned : styles.rowWithoutGutter,
        gutter > 0
          ? pinned
            ? pinnedFirst
              ? { marginRight: -gutter }
              : { marginLeft: -gutter }
            : { marginHorizontal: -gutter }
          : null,
      ]}
      testID={testID}
    >
      {items.map((child, index) => (
        <View
          key={index}
          onLayout={event => {
            const { x, width } = event.nativeEvent.layout;
            layouts.current.set(index, { x, width });
            if (index === selectedIndex) reveal(index);
          }}
        >
          {child}
        </View>
      ))}
    </ScrollView>
  );
  const scrollable = native ? (
    <GestureDetector gesture={native}>{scroll}</GestureDetector>
  ) : (
    scroll
  );

  return (
    <View
      accessibilityRole={group === 'actions' ? undefined : 'radiogroup'}
      accessibilityLabel={accessibilityLabel}
      style={styles.group}
    >
      {/*
        The gap sits outside the scroller: as content padding it only showed
        once the line was scrolled to its end, so the measure next to the
        pinned chip ran flush into it and its label was cut mid-word.
      */}
      {pinnedFirst ? (
        <View style={[styles.pinned, styles.pinnedStart]}>{pinned}</View>
      ) : null}
      {scrollable}
      {pinned && !pinnedFirst ? (
        <View style={styles.pinned}>{pinned}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    flexShrink: 1,
  },
  actionDetail: {
    flexShrink: 0,
  },
  // The line is exactly one chip tall, stated and not measured: a horizontal
  // scroller nested in the sheet's vertical one must never be free to decide
  // the height of the column, or everything under it — the primary button —
  // is pushed past the bottom of the sheet.
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CHIP_HEIGHT,
  },
  pinned: {
    flexShrink: 0,
    marginLeft: CHIP_GAP,
  },
  /** Head of the line: the gap belongs on its right instead. */
  pinnedStart: {
    marginLeft: 0,
    marginRight: CHIP_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowWithoutGutter: {
    flexGrow: 0,
  },
  // The scrolling half takes whatever the pinned chip leaves, so that chip
  // always sits on the same spot at the right end of the line. Its height is
  // stated for the same reason the group's is.
  scrollBeforePinned: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    height: CHIP_HEIGHT,
  },
});
