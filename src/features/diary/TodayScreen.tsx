import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  type GestureType,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { ActionChip, ChipRow } from '../../components/Chip';
import { DayStrip } from '../../components/DayStrip';
import { DiaryEntryRow } from '../../components/DiaryEntryRow';
import { HeroBlock } from '../../components/HeroBlock';
import { Icon } from '../../components/Icon';
import { MealEmptyLine, MealHeader } from '../../components/MealHeader';
import { MealPhotoRow } from './components/MealPhotoRow';
import type { MealPhoto } from '../../data/diary/MealPhotoRepository';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useEntryArrival } from '../../components/useEntryArrival';
import { usePressAnimation } from '../../components/usePressAnimation';
import { Snackbar } from '../../components/Snackbar';
import { TextButton } from '../../components/TextButton';
import type { DiaryEntryView } from '../../data/diary/DiaryRepository';
import { entryName } from '../../domain/diary/entryName';
import { MEALS, type Meal } from '../../domain/diary/Meal';
import {
  withoutLoggedDuplicates,
  type RepeatSource,
} from '../../domain/diary/suggestions';
import { localizedName } from '../../domain/food/rank';
import { usePendingRemoval } from '../portion/usePendingRemoval';
import type { SuggestionItem } from '../suggestions/suggestionsService';
import { onDayPicked } from './dayPicker';
import { useDaySuggestions, type MealChips } from './hooks/useDaySuggestions';
import { useQuickLog } from './hooks/useQuickLog';
import { dayRange, WEEKS_BACK } from './todayRange';
import {
  addDays,
  dateFromDayKey,
  startOfWeek,
  weekStarts,
  type DayKey,
} from '../../domain/diary/days';
import { currentLanguage, t } from '../../i18n';
import {
  formatDayLong,
  formatDayTitle,
  formatKcal,
  formatPortionSpeech,
} from '../../i18n/format';
import { useTheme } from '../../theme';
import type { IconName } from '../../theme/icons';
import { FADE, FADE_REDUCED } from '../../theme/motion';
import { MicronutrientBlock } from './components/MicronutrientBlock';
import { useDiaryDay } from './hooks/useDiaryDay';
import { useDisplayMode } from './hooks/useDisplayMode';
import { useMineralsEnabled } from './hooks/useMineralsEnabled';
import { useEntryRemoval } from './hooks/useEntryRemoval';
import { useMealPhoto } from './hooks/useMealPhoto';
import { useGoal } from './hooks/useGoal';
import { useToday } from './hooks/useToday';

/** Design system §1.3: from the hero block to the first meal. */
const HERO_TO_MEALS = 20;
/** Horizontal travel that counts as a day swipe on the content. */
const SWIPE_THRESHOLD = 60;
const SWIPE_ACTIVE_OFFSET = 24;
const SWIPE_FAIL_OFFSET = 12;
/** Design system §2.11: with no tray, the snackbar sits 16 dp above the inset. */
const SNACKBAR_GAP = 16;

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Today'>;

export function TodayScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const today = useToday();
  const goal = useGoal();
  const displayMode = useDisplayMode();
  const showMinerals = useMineralsEnabled();
  const [selectedDay, setSelectedDay] = useState<DayKey>(today);
  const day = useDiaryDay(selectedDay, goal);
  const removal = useEntryRemoval();
  const quick = useQuickLog(selectedDay);
  const photos = useMealPhoto(selectedDay);
  // Only one entry shows "Remover" at a time; opening another closes it.
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  // The day swipe must wait for a row's own swipe to give up, or the day
  // would change under a finger that was only reaching for "Remover".
  const dayPan = useRef<GestureType | undefined>(undefined);

  const weeks = useMemo(() => weekStarts(today, WEEKS_BACK), [today]);
  // The strip reads its weeks newest first, so the current one is the item it
  // renders before any scrolling happens (spec 09).
  const newestFirst = useMemo(() => [...weeks].reverse(), [weeks]);
  // One definition of the range, shared with the month sheet: the two cannot
  // disagree about what is reachable.
  const { firstDay, lastDay } = useMemo(() => dayRange(today), [today]);
  const isToday = selectedDay === today;

  // Numbers roll only when a day already on screen changes; a day arriving
  // for the first time (or after a swipe) is painted at its final value.
  const readyDay = useRef<DayKey | null>(null);
  const animate = day.summary !== null && readyDay.current === selectedDay;
  useEffect(() => {
    if (day.summary !== null) readyDay.current = selectedDay;
  }, [day.summary, selectedDay]);

  /*
    The rows that were just written. Observation is frozen while the screen is
    not the one on top — the add modal and the portion sheet write from up
    there — so the entry rises into place when the user is back looking at the
    list, not behind a sheet. The key carries the load state as well as the
    day: a day still loading paints at its final value, like the numbers above.
  */
  const focused = useIsFocused();
  const entryIds = useMemo(
    () => day.entries.map(entry => entry.id),
    [day.entries],
  );
  const arrivals = useEntryArrival(
    entryIds,
    `${selectedDay} ${day.summary === null ? 'loading' : 'ready'}`,
    focused,
  );

  // FADE (180 ms) on the content when the day changes; not on first mount.
  // Reduced motion keeps a fade — a shorter one that never travels — because
  // cutting straight from one day's numbers to another's is harder to follow
  // than any movement it would spare.
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    fade.value = 0;
    fade.value = withTiming(1, reduced ? FADE_REDUCED : FADE);
  }, [selectedDay, fade, reduced]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const selectDay = useCallback(
    (next: DayKey) => {
      if (next < firstDay || next > lastDay) return;
      setSelectedDay(next);
    },
    [firstDay, lastDay],
  );
  // The strip follows the selection instead of being scrolled into place: the
  // selected day's week heads the list the strip receives, so the page it must
  // show is the one it already opens on (spec 12). Everything older follows;
  // dragging right still walks back into the past, exactly as before.
  const anchorWeek = useMemo(() => startOfWeek(selectedDay), [selectedDay]);
  const stripWeeks = useMemo(() => {
    const index = newestFirst.indexOf(anchorWeek);
    return index > 0 ? newestFirst.slice(index) : newestFirst;
  }, [newestFirst, anchorWeek]);
  const onSelectDay = selectDay;
  const goToToday = useCallback(() => selectDay(today), [selectDay, today]);
  const goToGoals = useCallback(
    () => navigation.navigate('Goals'),
    [navigation],
  );
  const openDayPicker = useCallback(
    () => navigation.navigate('DayPicker', { day: selectedDay }),
    [navigation, selectedDay],
  );
  // Sharing is an action on the day on screen, so it lives with the day's own
  // controls in the header. Nothing is added to the diary itself.
  const openShare = useCallback(
    () => navigation.navigate('Share', { day: selectedDay }),
    [navigation, selectedDay],
  );
  // The sheet is a route, so the day it picked comes back through the module
  // it publishes on; selecting it here keeps the strip anchoring and the fade.
  useEffect(() => onDayPicked(selectDay), [selectDay]);
  const addTo = useCallback(
    (meal: Meal) => navigation.navigate('AddFood', { day: selectedDay, meal }),
    [navigation, selectedDay],
  );
  const openMeal = useCallback(
    (meal: Meal) => navigation.navigate('Meal', { day: selectedDay, meal }),
    [navigation, selectedDay],
  );
  const editEntry = useCallback(
    (entry: DiaryEntryView) =>
      navigation.navigate('Portion', {
        day: entry.day,
        meal: entry.meal,
        foodId: entry.foodId,
        entryId: entry.id,
      }),
    [navigation],
  );
  const removeEntry = useCallback(
    (entry: DiaryEntryView) => {
      setOpenEntry(null);
      quick.dismiss();
      photos.dismiss();
      removal.remove(entry);
    },
    // `remove` is stable; the snackbar changing must not re-render the rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removal.remove, quick.dismiss, photos.dismiss],
  );
  // "Remover" on the portion sheet lands here, in the same path as the swipe.
  usePendingRemoval(removeEntry);

  // Chips stand in for "Nada registrado ainda" on the day on screen, whichever
  // it is: a day left behind is filled in the same tap today is.
  const chips = useDaySuggestions(selectedDay);

  const logChip = useCallback(
    (meal: Meal, item: SuggestionItem) => {
      removal.dismiss();
      photos.dismiss();
      quick.log(item.food, item.memory, meal);
    },
    // Both are stable; the snackbar changing must not re-render the chips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removal.dismiss, quick.log],
  );

  /**
   * The other half of a suggestion chip: the portion sheet, reachable by a
   * long press and by the accessibility action the chip publishes — the chip
   * is the only place this food is offered from, so the sheet cannot depend
   * on a gesture a screen reader user has no way to make.
   */
  const openChipPortion = useCallback(
    (meal: Meal, item: SuggestionItem) =>
      navigation.navigate('Portion', {
        day: selectedDay,
        meal,
        foodId: item.food.id,
      }),
    [navigation, selectedDay],
  );

  const repeatChip = useCallback(
    (meal: Meal, source: RepeatSource) => {
      removal.dismiss();
      photos.dismiss();
      quick.copyMeal(
        source.day,
        meal,
        t('search.repeatDone', { meal: t(`meals.${meal}`) }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [removal.dismiss, quick.copyMeal],
  );

  // Midnight (or a return from the background on a new day): a diary left
  // on "today" follows the new today; a day picked on purpose stays put.
  const previousToday = useRef(today);
  const selectedDayRef = useRef(selectedDay);
  selectedDayRef.current = selectedDay;
  useEffect(() => {
    const before = previousToday.current;
    previousToday.current = today;
    if (before !== today && selectedDayRef.current === before) {
      selectDay(today);
    }
  }, [today, selectDay]);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .withRef(dayPan)
        .activeOffsetX([-SWIPE_ACTIVE_OFFSET, SWIPE_ACTIVE_OFFSET])
        .failOffsetY([-SWIPE_FAIL_OFFSET, SWIPE_FAIL_OFFSET])
        .onEnd(event => {
          if (event.translationX <= -SWIPE_THRESHOLD) {
            selectDay(addDays(selectedDay, 1));
          } else if (event.translationX >= SWIPE_THRESHOLD) {
            selectDay(addDays(selectedDay, -1));
          }
        }),
    [selectDay, selectedDay],
  );

  // The visible title is abbreviated to fit beside the two header actions;
  // screen readers get the full date.
  const selectedDate = dateFromDayKey(selectedDay);
  const title = isToday ? t('today.title') : formatDayTitle(selectedDate);
  const titleA11y = isToday ? undefined : formatDayLong(selectedDate);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <ScreenHeader
        title={title}
        titleAccessibilityLabel={titleA11y ?? title}
        titleIcon="calendar"
        titleAccessibilityHint={t('today.pickDay')}
        onTitlePress={openDayPicker}
        testID="open-day-picker"
        trailing={
          <>
            {isToday ? null : (
              <TextButton
                variant="compact"
                tone="accent"
                label={t('today.backToToday')}
                accessibilityLabel={t('today.backToTodayLabel')}
                onPress={goToToday}
                testID="back-to-today"
              />
            )}
            <HeaderIconButton
              icon="share-2"
              accessibilityLabel={t('share.title')}
              onPress={openShare}
              testID="open-share"
            />
            <TextButton
              variant="compact"
              tone="ink"
              icon="settings-2"
              label={t('today.goals')}
              accessibilityLabel={t('today.goalsLabel')}
              onPress={goToGoals}
              testID="open-goals"
            />
          </>
        }
      />
      <DayStrip
        weeks={stripWeeks}
        anchorWeek={anchorWeek}
        selectedDay={selectedDay}
        today={today}
        onSelectDay={onSelectDay}
      />
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.content, fadeStyle]}>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: insets.bottom + theme.spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
            testID="today-scroll"
          >
            <HeroBlock
              summary={day.summary}
              goal={goal}
              isToday={isToday}
              animate={animate}
              mode={displayMode}
            />
            <View style={{ height: HERO_TO_MEALS }} />
            {MEALS.map((meal, index) => (
              <MealSection
                key={meal}
                meal={meal}
                day={day}
                animate={animate}
                first={index === 0}
                onAdd={addTo}
                onOpen={openMeal}
                onEditEntry={editEntry}
                onRemoveEntry={removeEntry}
                openEntry={openEntry}
                onOpenEntryChange={setOpenEntry}
                arrivals={arrivals}
                dayPan={dayPan}
                chips={chips[meal]}
                isToday={isToday}
                onLogChip={logChip}
                onOpenChip={openChipPortion}
                onRepeat={repeatChip}
                photo={photos.byMeal.get(meal)}
                onCapturePhoto={photos.capture}
                onRemovePhoto={photos.remove}
              />
            ))}
            {/*
              Opt-in and last: with the switch off, or on a day with nothing
              logged, the block is not in the tree at all.
            */}
            {showMinerals && day.entries.length > 0 ? (
              <MicronutrientBlock
                entries={day.entries}
                isToday={isToday}
                animate={animate}
              />
            ) : null}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
      {/*
        One pill for the whole screen: whichever of the three actions spoke
        last owns it, and the other two are taken down before it does. The
        photo comes last in the order because logging food is the louder
        event: if both happened in the same breath, the food is the one the
        owner is waiting to read.
      */}
      <Snackbar
        message={quick.snackbar ?? removal.snackbar ?? photos.snackbar}
        onUndo={
          quick.snackbar
            ? quick.undo
            : removal.snackbar
            ? removal.undo
            : photos.snackbar
            ? photos.undo
            : undefined
        }
        bottom={insets.bottom + SNACKBAR_GAP}
        testID="today-snackbar"
      />
    </View>
  );
}

interface HeaderIconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
}

/**
 * A header action that is only a glyph, at the same 48 dp target as the ones
 * next to it. Only for an action whose icon says it on its own — sharing —
 * and never in the accent, so "Hoje" keeps its single accent in the diary.
 */
function HeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
  testID,
}: HeaderIconButtonProps) {
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
        styles.headerAction,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID={testID}
    >
      <Animated.View style={press.style}>
        <Icon name={icon} size="action" color={theme.colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

interface MealSectionProps {
  meal: Meal;
  day: ReturnType<typeof useDiaryDay>;
  animate: boolean;
  first: boolean;
  onAdd: (meal: Meal) => void;
  onOpen: (meal: Meal) => void;
  onEditEntry: (entry: DiaryEntryView) => void;
  onRemoveEntry: (entry: DiaryEntryView) => void;
  openEntry: string | null;
  onOpenEntryChange: (id: string | null) => void;
  /** The entries that have just been written, by id (see `useEntryArrival`). */
  arrivals: ReadonlyMap<string, number>;
  dayPan: React.MutableRefObject<GestureType | undefined>;
  /**
   * What an empty meal offers instead of "Nada registrado ainda", and what a
   * meal that already has items offers at the end of its section.
   */
  chips?: MealChips;
  /** "Repetir" reads "de ontem" only while the day on screen is today. */
  isToday: boolean;
  onLogChip: (meal: Meal, item: SuggestionItem) => void;
  /** Long press, and the chip's accessibility action: the portion sheet. */
  onOpenChip: (meal: Meal, item: SuggestionItem) => void;
  onRepeat: (meal: Meal, source: RepeatSource) => void;
  /** The plate's photo for this meal, when the day has one. */
  photo?: MealPhoto;
  onCapturePhoto: (meal: Meal) => void;
  onRemovePhoto: (meal: Meal) => void;
}

function MealSection({
  meal,
  day,
  animate,
  first,
  onAdd,
  onOpen,
  onEditEntry,
  onRemoveEntry,
  openEntry,
  onOpenEntryChange,
  arrivals,
  dayPan,
  chips,
  isToday,
  onLogChip,
  onOpenChip,
  onRepeat,
  photo,
  onCapturePhoto,
  onRemovePhoto,
}: MealSectionProps) {
  const theme = useTheme();
  const title = t(`meals.${meal}`);
  const totals = day.summary?.byMeal[meal];
  const entries = day.entries.filter(entry => entry.meal === meal);
  const onPress = useCallback(() => onAdd(meal), [onAdd, meal]);
  const onOpenMeal = useCallback(() => onOpen(meal), [onOpen, meal]);
  const locale = currentLanguage();
  const repeat = chips?.repeat ?? null;
  const logged = entries.length > 0;
  /*
    Two sources can name the same thing with different ids ("Banana, prata,
    crua" from the history, "Banana" from the starters), so a chip is dropped
    when the meal already has that food on screen.
  */
  const named = (chips?.items ?? []).map(item => ({
    item,
    name: localizedName(item.food, locale),
  }));
  const offered = logged
    ? withoutLoggedDuplicates(
        named,
        entries.map(entry => entryName(entry, locale)),
      )
    : named;
  /*
    Three at most on an empty meal: "Repetir" — when there is a meal worth
    repeating — and the best of the ranking after it. A meal that already has
    items gets two, so the shortcut costs one line and never a second one.
  */
  const foodChips = offered.slice(0, logged ? 2 : repeat ? 2 : 3);
  /*
    "Repetir" belongs to the empty state only: inside a meal that already has
    items it would copy a whole past meal on top of what is there, and it would
    make the line three chips long.
  */
  const offerRepeat = repeat !== null && !logged;
  const hasChips = offerRepeat || foodChips.length > 0;
  /*
    "Ontem" and "semana passada" are read against the current date, so on a day
    that is not today they would name the wrong meal: there the chip carries the
    date of the meal it copies, in the same short form as the screen title.
  */
  const repeatTitle =
    repeat === null
      ? ''
      : isToday
      ? t(
          repeat.kind === 'yesterday'
            ? 'search.repeatYesterday'
            : 'search.repeatLastWeek',
          { meal: t(`mealsLower.${meal}`) },
        )
      : t('search.repeatDay', {
          meal: t(`mealsLower.${meal}`),
          day: formatDayTitle(dateFromDayKey(repeat.day)),
        });
  const chipLine = (marginTop: number) => (
    <View
      style={{ paddingHorizontal: theme.spacing.lg, marginTop }}
      testID={`meal-${meal}-chip-line`}
    >
      <ChipRow
        accessibilityLabel={t('search.suggestions')}
        group="actions"
        gutter={theme.spacing.lg}
        blocksGesture={dayPan}
        testID={`meal-${meal}-chips`}
      >
        {offerRepeat && repeat ? (
          <ActionChip
            key="repeat"
            label={repeatTitle}
            detail={t('meal.subtotal', { kcal: formatKcal(repeat.kcal) })}
            accessibilityLabel={t('search.repeatA11y', {
              title: repeatTitle,
              items:
                repeat.itemCount === 1
                  ? t('search.oneItem')
                  : t('search.itemsCount', {
                      count: String(repeat.itemCount),
                    }),
              kcal: formatKcal(repeat.kcal),
            })}
            onPress={() => onRepeat(meal, repeat)}
            testID={`meal-${meal}-chip-repeat`}
          />
        ) : null}
        {foodChips.map(({ item, name }) => (
          <ActionChip
            key={item.food.id}
            label={name}
            detail={t('meal.subtotal', {
              kcal: formatKcal(item.portion.kcal),
            })}
            accessibilityLabel={t('search.chipA11y', {
              food: name,
              portion: formatPortionSpeech(item.portion),
              kcal: formatKcal(item.portion.kcal),
              meal: title,
            })}
            accessibilityHint={t('search.chipHint')}
            onPress={() => onLogChip(meal, item)}
            onLongPress={() => onOpenChip(meal, item)}
            longPressLabel={t('portion.quantityHint')}
            testID={`meal-${meal}-chip-${item.food.id}`}
          />
        ))}
      </ChipRow>
    </View>
  );
  return (
    <View style={first ? null : { marginTop: theme.spacing.sm }}>
      <MealHeader
        title={title}
        subtotal={totals?.kcal ?? 0}
        count={totals?.count ?? 0}
        animate={animate}
        onAdd={onPress}
        onOpen={onOpenMeal}
        testID={`meal-${meal}`}
      />
      {day.summary === null ? null : logged ? (
        <>
          {entries.map(entry => (
            <DiaryEntryRow
              key={entry.id}
              entry={entry}
              onPress={onEditEntry}
              onRemove={onRemoveEntry}
              open={openEntry === entry.id}
              onOpenChange={onOpenEntryChange}
              arrivalIndex={arrivals.get(entry.id)}
              blocksGesture={dayPan}
            />
          ))}
          {/*
            8 dp of air below the last entry: the chips carry a vertical hit
            slop of 8 and the entry is tappable across its whole 64 dp, so a
            tap meant for the portion sheet would otherwise log a food.
          */}
          {hasChips ? chipLine(theme.spacing.sm) : null}
        </>
      ) : hasChips ? (
        chipLine(0)
      ) : (
        <MealEmptyLine />
      )}
      {/*
        Below the meal, never inside the header. Offered on an empty meal too:
        the owner photographs the plate before deciding what to write down,
        and a picture with nothing logged yet is exactly the case the later
        estimate-from-photo work has to read.
      */}
      {day.summary === null ? null : (
        <MealPhotoRow
          meal={meal}
          mealTitle={title}
          photo={photo}
          onAdd={onCapturePhoto}
          onRemove={onRemovePhoto}
          testID={`meal-${meal}-photo`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
