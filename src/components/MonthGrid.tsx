import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  dateFromDayKey,
  diffDays,
  monthGrid,
  weekDays,
  type DayKey,
} from '../domain/diary/days';
import { t } from '../i18n';
import { formatDayFull, formatWeekdayShort } from '../i18n/format';
import { useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';

/** Six rows of 48 dp: the grid keeps its height in every month. */
export const MONTH_GRID_ROWS = 6;
export const MONTH_GRID_COLUMNS = 7;
export const MONTH_CELL_SIZE = 48;
/**
 * The sheet pads itself by 16 dp, and 7 × 48 = 336 > 328. The pager is pulled
 * out by 4 dp on each side (never 16), which gives every column a whole 48 dp
 * and still leaves the outer markers 12 dp from the edge of the screen.
 */
export const MONTH_GRID_INSET = -4;
export const WEEKDAY_ROW_HEIGHT = 20;

const MARKER_SIZE = 40;
/** Space left around the marker inside its cell: (48 − 40) / 2. */
const MARKER_INSET = 4;
const DOT_SIZE = 4;
const DOT_BOTTOM = 6;
/** No `hitSlop`: the columns touch, so any slop would reach the day next door. */
const PRESSED_OPACITY = 0.6;

/**
 * The column, given the room the sheet leaves inside its padding. 48,00
 * whenever the window is 360 dp or wider, since the pager is pulled 4 dp back
 * out on each side; narrower than that — a 320 dp phone, a split-screen
 * window — every column shrinks together instead of the outer two being cut.
 */
export function monthCellSize(availableWidth: number): number {
  return Math.min(
    MONTH_CELL_SIZE,
    (availableWidth - MONTH_GRID_INSET * 2) / MONTH_GRID_COLUMNS,
  );
}

interface DayCellProps {
  day: DayKey | null;
  size: number;
  selected: boolean;
  isToday: boolean;
  disabled: boolean;
  onSelect: (day: DayKey) => void;
}

const DayCell = memo(function DayCellBase({
  day,
  size,
  selected,
  isToday,
  disabled,
  onSelect,
}: DayCellProps) {
  const theme = useTheme();
  const marker = Math.min(MARKER_SIZE, size - MARKER_INSET * 2);
  const onPress = useCallback(() => {
    if (day !== null) onSelect(day);
  }, [day, onSelect]);
  const { dayOfMonth, label } = useMemo(() => {
    if (day === null) return { dayOfMonth: '', label: '' };
    const date = dateFromDayKey(day);
    return {
      dayOfMonth: String(date.getDate()),
      label:
        formatDayFull(date) +
        (isToday ? t('today.chipTodaySuffix') : '') +
        (selected ? t('today.chipSelectedSuffix') : ''),
    };
  }, [day, isToday, selected]);

  // A day of the month before or after this one: an empty cell that keeps the
  // grid square and stays out of the accessibility tree.
  if (day === null) {
    return (
      <View
        style={[styles.cell, { width: size, height: size }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    );
  }

  const numberColor = selected
    ? theme.colors.background
    : disabled
    ? theme.colors.inkSubtle
    : theme.colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        styles.cell,
        { width: size, height: size },
        pressed ? styles.pressed : null,
      ]}
      testID={`calendar-day-${day}`}
    >
      <View
        style={[
          styles.marker,
          { width: marker, height: marker, borderRadius: theme.radii.md },
          selected ? { backgroundColor: theme.colors.ink } : null,
        ]}
      >
        <Text
          style={[
            theme.type.body,
            textDefaults,
            tabularNumbers,
            { color: numberColor },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {dayOfMonth}
        </Text>
      </View>
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
    </Pressable>
  );
});

export interface MonthGridProps {
  /** Any day of the month to draw; the grid starts on its first Monday. */
  monthStart: DayKey;
  /** Column size from `monthCellSize`: 48 dp on a 360 dp window and up. */
  cellSize: number;
  selectedDay: DayKey;
  today: DayKey;
  /** Inclusive bounds of what can be picked, the same range as the day strip. */
  firstDay: DayKey;
  lastDay: DayKey;
  onSelect: (day: DayKey) => void;
  testID?: string;
}

/**
 * One month as six rows of seven 48 dp cells, Monday first. Neighbouring
 * months are empty cells: a grid that keeps its shape is easier to read than
 * one that grows a row in March, and there is nothing to tap outside the month.
 */
export const MonthGrid = memo(function MonthGridBase({
  monthStart,
  cellSize: size,
  selectedDay,
  today,
  firstDay,
  lastDay,
  onSelect,
  testID,
}: MonthGridProps) {
  const cells = useMemo(() => monthGrid(monthStart), [monthStart]);
  return (
    <View
      testID={testID}
      style={[
        styles.grid,
        { width: size * MONTH_GRID_COLUMNS, height: size * MONTH_GRID_ROWS },
      ]}
    >
      {cells.map((day, index) => (
        <DayCell
          key={day ?? `empty-${index}`}
          day={day}
          size={size}
          selected={day === selectedDay}
          isToday={day === today}
          disabled={
            day === null ||
            diffDays(firstDay, day) < 0 ||
            diffDays(day, lastDay) < 0
          }
          onSelect={onSelect}
        />
      ))}
    </View>
  );
});

/** "seg ter qua…" over the columns; the cells already say it to a reader. */
export const WeekdayRow = memo(function WeekdayRowBase({
  cellSize: size,
}: {
  cellSize: number;
}) {
  const theme = useTheme();
  const labels = useMemo(
    // Any Monday does: the week of 2024-01-01 is one.
    () =>
      weekDays('2024-01-01').map(day =>
        formatWeekdayShort(dateFromDayKey(day)),
      ),
    [],
  );
  return (
    <View
      style={[styles.weekdays, { width: size * MONTH_GRID_COLUMNS }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {labels.map(label => (
        <Text
          key={label}
          style={[
            theme.type.caption,
            textDefaults,
            styles.weekday,
            { width: size, color: theme.colors.inkMuted },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Opacity only, straight from the press state: no Reanimated in 42 cells. */
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  marker: {
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
  weekdays: {
    height: WEEKDAY_ROW_HEIGHT,
    // Sits over the pager, which is pulled out of the sheet's padding too.
    marginHorizontal: MONTH_GRID_INSET,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekday: {
    textAlign: 'center',
  },
});
