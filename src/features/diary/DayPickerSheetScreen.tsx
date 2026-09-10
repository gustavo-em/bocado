import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { Icon } from '../../components/Icon';
import {
  MONTH_GRID_COLUMNS,
  MONTH_GRID_INSET,
  MONTH_GRID_ROWS,
  MonthGrid,
  WeekdayRow,
  monthCellSize,
} from '../../components/MonthGrid';
import { Sheet } from '../../components/Sheet';
import { TextButton } from '../../components/TextButton';
import {
  addMonths,
  dateFromDayKey,
  startOfMonth,
  type DayKey,
} from '../../domain/diary/days';
import { t } from '../../i18n';
import { formatMonthTitle } from '../../i18n/format';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { setPortionSheetOpen } from '../portion/portionSheet';
import { emitDayPicked } from './dayPicker';
import { useToday } from './hooks/useToday';
import { dayRange } from './todayRange';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'DayPicker'>;
type Route = RouteProp<RootStackParamList, 'DayPicker'>;

/** Anatomy of the sheet (§2.12), top to bottom, in dp. */
const MONTH_ROW_HEIGHT = 48;
const HANDLE_TO_MONTH = 16;
const WEEKDAYS_TO_GRID = 4;
const GRID_TO_FOOTER = 8;

/**
 * The month sheet behind the "Hoje" title: six rows of seven, one month at a
 * time, arrows at the top and "Hoje" at the bottom. Tapping a day picks it and
 * closes — there is nothing to confirm.
 */
export function DayPickerSheetScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();
  const today = useToday();
  const { width } = useWindowDimensions();

  // The same range the strip imposes, from the same place it reads it.
  const { firstDay, lastDay } = useMemo(() => dayRange(today), [today]);
  const selectedDay: DayKey = params.day;
  // The sheet pads itself by 16 dp; the grid is pulled 4 dp back out of that
  // padding on each side, so a column is a whole 48 dp from a 360 dp window up
  // and nothing of the first or last column is cut off. Both come from the
  // window, known before any layout pass.
  const cellSize = monthCellSize(width - theme.spacing.lg * 2);
  const gridWidth = cellSize * MONTH_GRID_COLUMNS;
  // Six rows of whatever a column is on this window: 288 dp from 360 dp up.
  const gridHeight = cellSize * MONTH_GRID_ROWS;

  // The oldest and newest months the sheet may show, from the same range.
  const oldestMonth = useMemo(() => startOfMonth(firstDay), [firstDay]);
  const newestMonth = useMemo(() => startOfMonth(lastDay), [lastDay]);

  // One month is drawn at a time, and the arrows move this state. There is no
  // horizontal list: paging a hundred-odd months through an inverted FlashList
  // skipped months on the J6 and crashed the mount outright when it reached
  // the far end ("addViewAt: failed to insert view"). A grid that is only ever
  // one month cannot do either, and nothing in the brief asked to swipe here.
  const [month, setMonth] = useState<DayKey>(() =>
    clampMonth(startOfMonth(selectedDay), oldestMonth, newestMonth),
  );

  // The diary underneath steps out of the accessibility tree while the sheet
  // holds the screen, exactly as the portion sheet does.
  useEffect(() => {
    setPortionSheetOpen(true);
    return () => setPortionSheetOpen(false);
  }, []);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const pick = useCallback(
    (day: DayKey) => {
      emitDayPicked(day);
      navigation.goBack();
    },
    [navigation],
  );

  const goToToday = useCallback(() => pick(today), [pick, today]);

  const canGoBack = month > oldestMonth;
  const canGoForward = month < newestMonth;

  const previousMonth = useCallback(() => {
    setMonth(current =>
      clampMonth(addMonths(current, -1), oldestMonth, newestMonth),
    );
  }, [oldestMonth, newestMonth]);

  const nextMonth = useCallback(() => {
    setMonth(current =>
      clampMonth(addMonths(current, 1), oldestMonth, newestMonth),
    );
  }, [oldestMonth, newestMonth]);

  const monthTitle = formatMonthTitle(dateFromDayKey(month));

  return (
    <Sheet
      onClose={close}
      dismissAccessibilityLabel={t('calendar.dismiss')}
      footer={
        <View style={{ marginTop: GRID_TO_FOOTER }}>
          <TextButton
            variant="compact"
            tone="accent"
            align="start"
            label={t('today.backToToday')}
            accessibilityLabel={t('today.backToTodayLabel')}
            onPress={goToToday}
            testID="calendar-today"
          />
        </View>
      }
      testID="day-picker"
    >
      <View style={{ paddingTop: HANDLE_TO_MONTH }}>
        <View style={[styles.monthRow, { height: MONTH_ROW_HEIGHT }]}>
          <Text
            style={[
              theme.type.heading,
              textDefaults,
              styles.monthTitle,
              { color: theme.colors.ink },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
            testID="calendar-month"
          >
            {monthTitle}
          </Text>
          <ArrowButton
            icon="chevron-left"
            label={t('calendar.previousMonth')}
            disabled={!canGoBack}
            onPress={previousMonth}
            testID="calendar-previous-month"
          />
          <ArrowButton
            icon="chevron-right"
            label={t('calendar.nextMonth')}
            disabled={!canGoForward}
            onPress={nextMonth}
            testID="calendar-next-month"
          />
        </View>
        <WeekdayRow cellSize={cellSize} />
        <View
          style={{
            height: gridHeight,
            width: gridWidth,
            marginHorizontal: MONTH_GRID_INSET,
            marginTop: WEEKDAYS_TO_GRID,
          }}
          testID="calendar-pager"
        >
          <MonthGrid
            monthStart={month}
            cellSize={cellSize}
            selectedDay={selectedDay}
            today={today}
            firstDay={firstDay}
            lastDay={lastDay}
            onSelect={pick}
            testID="calendar-months"
          />
        </View>
      </View>
    </Sheet>
  );
}

/** `month` kept inside the range, whatever the arrows or the clock do. */
function clampMonth(month: DayKey, oldest: DayKey, newest: DayKey): DayKey {
  if (month < oldest) return oldest;
  if (month > newest) return newest;
  return month;
}

interface ArrowButtonProps {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

function ArrowButton({
  icon,
  label,
  disabled,
  onPress,
  testID,
}: ArrowButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.arrow,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID={testID}
    >
      <Icon
        name={icon}
        size="action"
        color={disabled ? theme.colors.inkSubtle : theme.colors.ink}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitle: {
    flex: 1,
  },
  arrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
