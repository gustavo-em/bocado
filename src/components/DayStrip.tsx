import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { FlashList, type FlashListRef } from '@shopify/flash-list';

import { dateFromDayKey, weekDays, type DayKey } from '../domain/diary/days';
import { currentLanguage, t, type AppLanguage } from '../i18n';
import { formatDayLong, formatWeekdayShort } from '../i18n/format';
import { useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';
import { usePressAnimation } from './usePressAnimation';

export const DAY_STRIP_HEIGHT = 56;
const CHIP_WIDTH = 40;
const CHIP_HIT_SLOP = { left: 4, right: 4, top: 0, bottom: 0 };
const DOT_SIZE = 4;
const DOT_BOTTOM = 6;

interface DayChipProps {
  day: DayKey;
  selected: boolean;
  isToday: boolean;
  onSelect: (day: DayKey) => void;
}

/**
 * The three strings a chip prints, for one day in one language. `language` is
 * part of the input, not decoration: the formatters read the app language, so
 * the memo above has to be rebuilt when it changes.
 */
function chipText(day: DayKey, language: AppLanguage) {
  const date = dateFromDayKey(day);
  return {
    weekday: formatWeekdayShort(date, language),
    dayOfMonth: String(date.getDate()),
    longName: formatDayLong(date, language),
  };
}

const DayChip = memo(function DayChipBase({
  day,
  selected,
  isToday,
  onSelect,
}: DayChipProps) {
  const theme = useTheme();
  const press = usePressAnimation(true);
  /*
    The language is part of what these strings say, so it is read here and
    kept in the memo: without it the chips keep the weekday of the language
    the screen was first rendered in, and "Today" ends up next to "qui".
  */
  const language = currentLanguage();
  const { weekday, dayOfMonth, longName } = useMemo(
    () => chipText(day, language),
    [day, language],
  );
  const onPress = useCallback(() => onSelect(day), [onSelect, day]);
  const textColor = selected ? theme.colors.background : undefined;
  // The accent dot has no text of its own: the label says "today" for it.
  const label =
    longName +
    (isToday ? t('today.chipTodaySuffix') : '') +
    (selected ? t('today.chipSelectedSuffix') : '');

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={`day-chip-${day}`}
    >
      <Animated.View
        style={[
          styles.chip,
          { borderRadius: theme.radii.md },
          selected ? { backgroundColor: theme.colors.ink } : null,
          press.style,
        ]}
      >
        <Text
          style={[
            theme.type.caption,
            textDefaults,
            { color: textColor ?? theme.colors.inkMuted },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {weekday}
        </Text>
        <Text
          style={[
            theme.type.body,
            textDefaults,
            tabularNumbers,
            {
              color: textColor ?? theme.colors.ink,
              marginTop: theme.spacing.xs / 2,
            },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {dayOfMonth}
        </Text>
        {isToday ? (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: selected
                  ? theme.colors.inverseAccent
                  : theme.colors.accent,
              },
            ]}
          />
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

interface WeekPageProps {
  weekStart: DayKey;
  width: number;
  selectedDay: DayKey;
  today: DayKey;
  onSelect: (day: DayKey) => void;
}

const WeekPage = memo(function WeekPageBase({
  weekStart,
  width,
  selectedDay,
  today,
  onSelect,
}: WeekPageProps) {
  const theme = useTheme();
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  return (
    <View style={[styles.page, { width, paddingHorizontal: theme.spacing.lg }]}>
      {days.map(day => (
        <DayChip
          key={day}
          day={day}
          selected={day === selectedDay}
          isToday={day === today}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
});

export interface DayStripProps {
  /** Weeks the strip can show, newest first, starting at `anchorWeek`. */
  weeks: readonly DayKey[];
  /** Monday of the week that must be painted: `weeks[0]`, the selected day's. */
  anchorWeek: DayKey;
  selectedDay: DayKey;
  today: DayKey;
  onSelectDay: (day: DayKey) => void;
}

/**
 * Design system §2.15: seven 40 × 56 chips per page, one page per week.
 *
 * `weeks` is newest first and the list is `inverted`, so dragging right walks
 * back into the past. Its first item is the anchor week, so the week that has
 * to be on screen is the page the list already opens on — see the comment on
 * the effect below.
 */
export function DayStrip({
  weeks,
  anchorWeek,
  selectedDay,
  today,
  onSelectDay,
}: DayStripProps) {
  const { width } = useWindowDimensions();

  const list = useRef<FlashListRef<DayKey>>(null);

  // `weeks` already starts at the anchor, so the week that must be on screen
  // is index 0 and the only scroll ever asked for is back to offset 0 — an
  // offset no page has to be measured for. Asking this list to `scrollToIndex`
  // twelve pages it has never measured parks it at the END of the data instead
  // (spec 12), and remounting it with a `key` fails the mount outright
  // ("addViewAt: failed to insert view"). Both were tried on the J6.
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [anchorWeek]);

  const renderItem = useCallback(
    ({ item }: { item: DayKey }) => (
      <WeekPage
        weekStart={item}
        width={width}
        selectedDay={selectedDay}
        today={today}
        onSelect={onSelectDay}
      />
    ),
    [width, selectedDay, today, onSelectDay],
  );

  return (
    <View style={{ height: DAY_STRIP_HEIGHT }}>
      <FlashList
        ref={list}
        data={weeks}
        horizontal
        inverted
        pagingEnabled
        // The anchor changes by re-heading `data`, and FlashList's default is
        // to keep whatever page was visible across a data change — which would
        // hold the old week on screen and undo the anchoring.
        maintainVisibleContentPosition={MAINTAIN_POSITION_OFF}
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={`${selectedDay}|${today}`}
        testID="day-strip"
      />
    </View>
  );
}

const MAINTAIN_POSITION_OFF = { disabled: true } as const;

function keyExtractor(item: DayKey): string {
  return item;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: DAY_STRIP_HEIGHT,
  },
  chip: {
    width: CHIP_WIDTH,
    height: DAY_STRIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    bottom: DOT_BOTTOM,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
