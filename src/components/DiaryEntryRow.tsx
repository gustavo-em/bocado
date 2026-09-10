import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  type GestureType,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { DiaryEntryView } from '../data/diary/DiaryRepository';
import { entryName, entryServingLabel } from '../domain/diary/entryName';
import { isQuickLog } from '../domain/food/quickLog';
import { currentLanguage, t } from '../i18n';
import {
  formatGrams,
  formatKcal,
  formatMacroGrams,
  formatQuantity,
} from '../i18n/format';
import { useTheme } from '../theme';
import {
  ENTRY_IN,
  ENTRY_RISE_DP,
  SELECT,
  rowStaggerDelayMs,
} from '../theme/motion';
import { tabularNumbers, textDefaults } from '../theme/type';
import { Icon } from './Icon';
import { usePressAnimation } from './usePressAnimation';

/** Two lines: name, and portion followed by the macros. */
export const DIARY_ENTRY_ROW_HEIGHT = 64;

/**
 * The kcal column, wide enough for "1.240" in Inter tabular (45,8 dp). The meal
 * header's subtotal uses the same width, so the two columns cannot drift apart
 * (§2.6).
 */
export const KCAL_COLUMN_WIDTH = 46;

/**
 * The macro cell, in dp at the normal text size (§2.5). The label box fits the
 * widest initial (`G`, 9,7 dp in Inter 13) and the value box fits three
 * tabular digits (25,3 dp); together with the 4 dp between them the cell is
 * always 40 dp, whatever the number says. It is the fixed cell — not the
 * text — that puts the protein of every row on the same right edge.
 */
export const MACRO_LABEL_WIDTH = 10;
export const MACRO_VALUE_WIDTH = 26;
export const MACRO_LABEL_GAP = 4;
export const MACRO_CELL_WIDTH =
  MACRO_LABEL_WIDTH + MACRO_LABEL_GAP + MACRO_VALUE_WIDTH;
/**
 * Between two cells. It has to beat the gap the right-aligned value leaves
 * inside its own cell — a single digit sits up to 22 dp away from its own
 * label — or "P 3 C 28" would read as "3 C". Twice the inner gap is what keeps
 * each number tied to the initial on its left.
 */
export const MACRO_CELL_SPACING = 16;
/** Three cells and the two gaps: the block anchored to the right margin. */
export const MACRO_BLOCK_WIDTH = MACRO_CELL_WIDTH * 3 + MACRO_CELL_SPACING * 2;
/** The largest text size the row honours, as everywhere else in it. */
const MAX_FONT_SCALE = 1.3;

/** How much of the row the "Remover" action takes when open. */
const ACTION_WIDTH = 96;
/** Past this much travel the row stays open on release. */
const OPEN_THRESHOLD = 56;
/** What joins the three macros as they are spoken. */
const MACRO_SPEECH_SEPARATOR = ', ';
/** What joins the household measure to the grams. Never used in the block. */
const PORTION_SEPARATOR = ' · ';
/** Sideways travel that starts a swipe, and vertical travel that cancels it. */
const SWIPE_ACTIVE_OFFSET = 16;
const SWIPE_FAIL_OFFSET = 8;

export interface DiaryEntryRowProps {
  entry: DiaryEntryView;
  /** Opens the portion sheet on this entry. */
  onPress?: (entry: DiaryEntryView) => void;
  /** Deletes it, with "Desfazer" in a snackbar. */
  onRemove?: (entry: DiaryEntryView) => void;
  /** True while this is the one row showing "Remover". */
  open?: boolean;
  onOpenChange?: (id: string | null) => void;
  /** The ground the row slides over; defaults to the page. */
  backgroundColor?: string;
  /**
   * This row was just written: it rises into place instead of appearing
   * whole. The number is its place among the rows arriving together, which is
   * what staggers a copied meal. `undefined` is a row that was already there,
   * and it never animates — see `useEntryArrival`.
   */
  arrivalIndex?: number;
  /**
   * The screen's own horizontal gesture (the day swipe in "Hoje"), which must
   * wait for this row to decide first.
   */
  blocksGesture?: React.MutableRefObject<GestureType | undefined>;
}

/**
 * "1 colher de servir · 45 g", or just "45 g" when typed in grams. A quick
 * entry has no portion at all — only the calories the user typed — so it says
 * the calories and nothing else: its grams are an implementation detail
 * (spec 05).
 */
export function portionLine(entry: DiaryEntryView): string {
  if (isQuickLog(entry.foodId))
    return `${formatKcal(entry.kcal)} ${t('common.kcal')}`;
  const grams = `${formatGrams(entry.grams)} ${t('common.grams')}`;
  const label = entryServingLabel(entry, currentLanguage());
  if (label === undefined) return grams;
  const count =
    entry.servingCount === undefined
      ? ''
      : `${formatQuantity(entry.servingCount)} `;
  return `${count}${label} · ${grams}`;
}

/**
 * The same portion, split where the line is allowed to break. `measure` is the
 * household measure ("1 colher de servir"), the only part that may lose
 * characters; `amount` is the quantity that ends the portion ("45 g", or the
 * calories of a quick entry) and never does. Without the split the single
 * string would ellipsise at its tail — which is exactly where the grams are —
 * and the row would print a measure with no amount.
 */
export function portionParts(entry: DiaryEntryView): {
  measure: string | null;
  amount: string;
} {
  if (isQuickLog(entry.foodId))
    return {
      measure: null,
      amount: `${formatKcal(entry.kcal)} ${t('common.kcal')}`,
    };
  const amount = `${formatGrams(entry.grams)} ${t('common.grams')}`;
  const label = entryServingLabel(entry, currentLanguage());
  if (label === undefined) return { measure: null, amount };
  const count =
    entry.servingCount === undefined
      ? ''
      : `${formatQuantity(entry.servingCount)} `;
  return { measure: `${count}${label}`, amount };
}

/**
 * The three macros as they are heard: "proteína 1,9 gramas, …". The full
 * wording stays in the audio even though the row now prints them abbreviated:
 * the screen reader is the glance of whoever cannot see. A macro the source
 * never stated is dropped instead of being spoken as a zero, and a quick
 * entry — a name and a number the user typed — has no macros at all.
 */
export function entryMacrosSpeech(entry: DiaryEntryView): string | null {
  return macroText(
    entry,
    'today.entryMacrosA11y',
    MACRO_SPEECH_SEPARATOR,
    formatGrams,
  );
}

export interface MacroCell {
  key: 'protein' | 'carbs' | 'fat';
  /** The initial that heads the column: "P", "C", "G" — "F" in English. */
  label: string;
  /**
   * Whole grams, or `null` when the source never stated this macro. A null
   * cell prints nothing and still holds its 40 dp, so the column of the rows
   * around it does not move.
   */
  value: string | null;
}

/**
 * The three macros as they are printed, in columns on the portion's own line:
 * "P 8   C 59   G 3". Initials and whole grams, because the row may not grow
 * past 64 dp; the unit is the "g" the portion itself carries, and the decimals
 * stay in the speech and in the portion sheet. A quick entry — a name and a
 * number the user typed — has no block at all, and neither has an entry whose
 * source stated no macro whatsoever.
 */
export function entryMacroCells(entry: DiaryEntryView): MacroCell[] | null {
  if (isQuickLog(entry.foodId)) return null;
  const columns: { key: MacroCell['key']; label: string; amount: number }[] = [
    {
      key: 'protein',
      label: t('today.macroLabelProtein'),
      amount: entry.protein,
    },
    { key: 'carbs', label: t('today.macroLabelCarbs'), amount: entry.carbs },
    { key: 'fat', label: t('today.macroLabelFat'), amount: entry.fat },
  ];
  const cells: MacroCell[] = columns.map(({ key, label, amount }) => ({
    key,
    label,
    // A macro the source never stated must not be printed as a zero.
    value: Number.isFinite(amount) ? formatMacroGrams(amount) : null,
  }));
  return cells.some(cell => cell.value !== null) ? cells : null;
}

/**
 * The cell in dp at the text size in force. The boxes grow with the type up to
 * 1,3× — the same ceiling every Text in the row carries — so three digits keep
 * fitting; past that the block would eat the portion instead.
 */
export function macroCellMetrics(fontScale: number): {
  label: number;
  gap: number;
  value: number;
  spacing: number;
  block: number;
} {
  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);
  return {
    label: MACRO_LABEL_WIDTH * scale,
    gap: MACRO_LABEL_GAP * scale,
    value: MACRO_VALUE_WIDTH * scale,
    spacing: MACRO_CELL_SPACING * scale,
    block: MACRO_BLOCK_WIDTH * scale,
  };
}

interface MacroCellStyles {
  cell: { width: number };
  label: { width: number };
  value: { width: number; marginLeft: number };
  spacing: { marginLeft: number };
}

/**
 * The same boxes for every row on screen: the styles are built once per text
 * size and shared, so a meal of six entries allocates one set instead of six
 * and the objects stay referentially stable between renders.
 */
const macroCellStyleCache = new Map<number, MacroCellStyles>();

function macroCellStyles(fontScale: number): MacroCellStyles {
  const cell = macroCellMetrics(fontScale);
  const cached = macroCellStyleCache.get(cell.block);
  if (cached) return cached;
  const built: MacroCellStyles = {
    cell: { width: cell.label + cell.gap + cell.value },
    label: { width: cell.label },
    value: { width: cell.value, marginLeft: cell.gap },
    spacing: { marginLeft: cell.spacing },
  };
  macroCellStyleCache.set(cell.block, built);
  return built;
}

function macroText(
  entry: DiaryEntryView,
  key: 'today.entryMacrosA11y',
  separator: string,
  format: (value: number) => string,
): string | null {
  if (isQuickLog(entry.foodId)) return null;
  const known = [entry.protein, entry.carbs, entry.fat].map(value =>
    Number.isFinite(value),
  );
  if (!known.some(Boolean)) return null;
  // The three segments are the app's own string, so they are dropped by
  // position: a macro the source never stated must not be read as a zero.
  return t(key, {
    protein: format(entry.protein),
    carbs: format(entry.carbs),
    fat: format(entry.fat),
  })
    .split(separator)
    .filter((_, index) => known[index])
    .join(separator);
}

/**
 * Design system §2.5: 64 dp, name in `body`, portion and macros sharing the
 * second line in `label` — the portion on the left and the macros in three
 * fixed cells against the right margin —, kcal in a fixed 46 dp column on the
 * right, right-aligned and without a unit, so every row of the list ends on
 * the same edge, on both lines. Tapping opens the portion sheet; swiping left reveals
 * "Remover", which removes with "Desfazer" and never a confirmation dialog.
 * The swipe is declared against the screen's own horizontal gesture so the
 * day never changes under the finger, and a screen reader gets the same
 * removal as a custom action instead of the gesture.
 */
export const DiaryEntryRow = React.memo(function DiaryEntryRowBase({
  entry,
  onPress,
  onRemove,
  open = false,
  onOpenChange,
  backgroundColor,
  arrivalIndex,
  blocksGesture,
}: DiaryEntryRowProps) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const actionPress = usePressAnimation(false);
  const spokenPortion = portionLine(entry);
  const portion = portionParts(entry);
  const macros = entryMacroCells(entry);
  /*
    The cells grow with the system text size, so the block is 152 dp at 1,0×
    and 197,6 at 1,3× — which is what leaves the portion 164 and 118,4 dp. The
    styles come from a cache shared by every row, so a meal builds one set, not
    one per entry.
  */
  const { fontScale } = useWindowDimensions();
  const cellStyles = macroCellStyles(fontScale);
  const kcal = formatKcal(entry.kcal);
  const spoken = entryMacrosSpeech(entry);
  const macrosSpeech = spoken === null ? '' : `, ${spoken}`;
  /*
    A quick entry is a name and a number; repeating the number as a portion
    would make a screen reader say "300 kcal, 300 kcal". It is announced as
    it reads: "Registro rápido · 300 kcal".
  */
  const name = entryName(entry, currentLanguage());
  const rowLabel = isQuickLog(entry.foodId)
    ? t('quick.diaryLine', { name, kcal })
    : `${name}, ${spokenPortion}, ${kcal} ${t('common.kcal')}${macrosSpeech}`;
  const offset = useSharedValue(0);
  const start = useSharedValue(0);
  const swipeable = onRemove !== undefined;
  /**
   * Whether the action behind the row is on screen at all. It exists from the
   * first pixel of the drag until the row has slid all the way back, and not
   * a frame longer: a closed row must leave nothing behind it for a screen
   * reader to sweep or a finger to land on.
   */
  const [revealed, setRevealed] = useState(false);

  /*
    The entry landing in its meal (spec: motion of the log). Once per entry,
    and only for the row that was just written: a row that was already on
    screen never gets an `arrivalIndex`, so scrolling, a re-render and a day
    change move nothing.

    The row is usually mounted before it is told it arrived — the write lands
    while the portion sheet is still up, and the list only reports arrivals
    once the screen has focus again — so the index turning from `undefined`
    into a number is what starts the movement, from zero, not the mount.
  */
  const reduced = useReducedMotion();
  const arriving = arrivalIndex !== undefined && !reduced;
  const arrival = useSharedValue(arriving ? 0 : 1);
  const arrived = useRef<string | null>(null);
  useEffect(() => {
    if (!arriving || arrived.current === entry.id) return;
    arrived.current = entry.id;
    arrival.value = 0;
    arrival.value = withDelay(
      rowStaggerDelayMs(arrivalIndex, reduced),
      withTiming(1, ENTRY_IN),
    );
    // The swipe, the open row and the theme must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, arrivalIndex]);
  const arrivalStyle = useAnimatedStyle(() => ({
    opacity: arrival.value,
    transform: [{ translateY: (1 - arrival.value) * ENTRY_RISE_DP }],
  }));

  useEffect(() => {
    if (open) {
      setRevealed(true);
      return;
    }
    offset.value = withTiming(0, SELECT, finished => {
      if (finished) runOnJS(setRevealed)(false);
    });
  }, [open, offset]);

  const setOpen = useCallback(
    (next: boolean) => onOpenChange?.(next ? entry.id : null),
    [onOpenChange, entry.id],
  );

  const handlePress = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    onPress?.(entry);
  }, [open, setOpen, onPress, entry]);

  const handleRemove = useCallback(() => {
    onOpenChange?.(null);
    onRemove?.(entry);
  }, [onOpenChange, onRemove, entry]);

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'remove') handleRemove();
    },
    [handleRemove],
  );

  /** The non-gestural way to remove, for TalkBack and switch access. */
  const removeActions = React.useMemo(
    () =>
      swipeable ? [{ name: 'remove', label: t('today.remove') }] : undefined,
    [swipeable],
  );

  const pan = React.useMemo(() => {
    let gesture = Gesture.Pan()
      .enabled(swipeable)
      .activeOffsetX([-SWIPE_ACTIVE_OFFSET, SWIPE_ACTIVE_OFFSET])
      .failOffsetY([-SWIPE_FAIL_OFFSET, SWIPE_FAIL_OFFSET])
      .onBegin(() => {
        start.value = offset.value;
      })
      .onStart(() => {
        runOnJS(setRevealed)(true);
      })
      .onUpdate(event => {
        const next = start.value + event.translationX;
        offset.value = Math.min(0, Math.max(-ACTION_WIDTH, next));
      })
      .onEnd(() => {
        const shouldOpen = offset.value < -OPEN_THRESHOLD;
        offset.value = withTiming(
          shouldOpen ? -ACTION_WIDTH : 0,
          SELECT,
          finished => {
            if (finished && !shouldOpen) runOnJS(setRevealed)(false);
          },
        );
        runOnJS(setOpen)(shouldOpen);
      });
    if (blocksGesture) gesture = gesture.blocksExternalGesture(blocksGesture);
    return gesture;
  }, [swipeable, blocksGesture, offset, start, setOpen]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const content = (
    <Animated.View
      style={[
        styles.content,
        { backgroundColor: backgroundColor ?? theme.colors.background },
        slide,
      ]}
    >
      <Pressable
        accessible
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={rowLabel}
        accessibilityHint={onPress ? t('today.editEntryHint') : undefined}
        accessibilityActions={removeActions}
        onAccessibilityAction={onAccessibilityAction}
        onPress={handlePress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={onPress === undefined && !open}
        style={[styles.row, { paddingHorizontal: theme.spacing.lg }]}
      >
        {/*
          `flex: 1` matters: the wrapper is the row's only child, so without it
          it would measure by its content and the kcal would drift in from the
          right edge. It stacks the two lines, and each line spans the whole
          328 dp: line 1 so the kcal ends on the right margin, line 2 so the
          macros end on that very same edge.
        */}
        <Animated.View style={[styles.rowInner, press.style]}>
          <View style={styles.line}>
            <Text
              style={[
                theme.type.body,
                textDefaults,
                styles.name,
                { color: theme.colors.ink },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {name}
            </Text>
            <Text
              style={[
                theme.type.body,
                textDefaults,
                tabularNumbers,
                styles.kcal,
                { color: theme.colors.ink, marginLeft: theme.spacing.md },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {kcal}
            </Text>
          </View>
          {/*
            Line 2: the portion on the left and the macros against the right
            margin. Anchoring the block — instead of letting it follow the
            portion, which is 36,8 dp for "100 g" and 146,7 for a household
            measure — is the whole point: it is what makes P, C and G start at
            the same x on every row of a meal.
          */}
          <View style={styles.line}>
            <View
              style={styles.portionLine}
              testID={`diary-entry-${entry.id}-portion`}
            >
              {portion.measure === null ? null : (
                <Text
                  style={[
                    theme.type.label,
                    textDefaults,
                    styles.portionMeasure,
                    { color: theme.colors.inkMuted },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {portion.measure}
                </Text>
              )}
              <Text
                style={[
                  theme.type.label,
                  textDefaults,
                  tabularNumbers,
                  styles.portionAmount,
                  { color: theme.colors.inkMuted },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {portion.measure === null
                  ? portion.amount
                  : `${PORTION_SEPARATOR}${portion.amount}`}
              </Text>
            </View>
            {macros === null ? null : (
              <View
                style={[styles.macros, { marginLeft: theme.spacing.md }]}
                testID={`diary-entry-${entry.id}-macros`}
              >
                {macros.map((macro, index) => (
                  <View
                    key={macro.key}
                    style={[
                      styles.macroCell,
                      cellStyles.cell,
                      index === 0 ? null : cellStyles.spacing,
                    ]}
                    testID={`macro-${macro.key}`}
                  >
                    {/*
                      A macro the source never stated prints neither initial
                      nor number: an empty cell that still holds its width, so
                      the columns of the rows around it stand still.
                    */}
                    {macro.value === null ? null : (
                      <>
                        <Text
                          style={[
                            theme.type.label,
                            textDefaults,
                            styles.macroLabel,
                            cellStyles.label,
                            { color: theme.colors.inkMuted },
                          ]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.3}
                        >
                          {macro.label}
                        </Text>
                        <Text
                          style={[
                            theme.type.label,
                            textDefaults,
                            tabularNumbers,
                            styles.macroValue,
                            cellStyles.value,
                            { color: theme.colors.inkMuted },
                          ]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.3}
                        >
                          {macro.value}
                        </Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );

  return (
    <Animated.View
      style={[styles.container, arrivalStyle]}
      testID={`diary-entry-${entry.id}`}
    >
      {/*
        The action is mounted only while it is on screen. A button parked
        under a closed row is still swept by a screen reader and reachable by
        touch exploration, and would remove an entry nobody asked about; the
        `remove` accessibility action on the row is the non-gestural path.
      */}
      {swipeable && revealed ? (
        <Pressable
          onPress={handleRemove}
          onPressIn={actionPress.onPressIn}
          onPressOut={actionPress.onPressOut}
          accessibilityRole="button"
          accessibilityLabel={t('today.removeEntry', { food: name })}
          style={[
            styles.action,
            {
              width: ACTION_WIDTH,
              backgroundColor: theme.colors.surfaceMuted,
              paddingHorizontal: theme.spacing.sm,
            },
          ]}
          testID={`diary-entry-${entry.id}-remove`}
        >
          <Animated.View style={[styles.action, actionPress.style]}>
            <Icon name="trash-2" size="row" color={theme.colors.ink} />
            <Text
              style={[
                theme.type.labelMedium,
                textDefaults,
                { color: theme.colors.ink, marginTop: theme.spacing.xs },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {t('today.remove')}
            </Text>
          </Animated.View>
        </Pressable>
      ) : null}
      {swipeable ? (
        <GestureDetector gesture={pan}>{content}</GestureDetector>
      ) : (
        content
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  /*
    64 dp at the normal text size; a minimum rather than a fixed height so that
    two lines are never cut off at the largest font scale (52 dp at 1,3×). The
    rows live in a ScrollView, so nothing depends on measuring them.
  */
  container: {
    minHeight: DIARY_ENTRY_ROW_HEIGHT,
    justifyContent: 'center',
  },
  content: {
    minHeight: DIARY_ENTRY_ROW_HEIGHT,
  },
  row: {
    minHeight: DIARY_ENTRY_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowInner: {
    flex: 1,
    flexDirection: 'column',
  },
  /** Both lines span the row: it is the span that makes the right edge. */
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  /** 270 dp of the 328, the kcal column and its 12 dp taking the rest. */
  name: {
    flex: 1,
  },
  /*
    The second line of the row, and the only place the macros could go without
    costing a third line (72 dp) or a share of the name's 270 dp. It takes
    every dp the block does not — `flex: 1`, like the name above it — which is
    what pins the block to the right margin instead of letting it follow a
    portion that measures 36,8 dp ("100 g") or 146,7 ("1 colher de servir ·
    45 g"). It is also the only part of the line that gives width away.
  */
  portionLine: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
  },
  portionMeasure: {
    flexShrink: 1,
  },
  portionAmount: {
    flexShrink: 0,
  },
  /*
    152 dp at 1,0×, never shrinking: the three cells are the columns, and a
    block that gave width away would break them on the crowded rows first —
    exactly the rows worth comparing.
  */
  macros: {
    flexShrink: 0,
    flexDirection: 'row',
  },
  macroCell: {
    flexShrink: 0,
    flexDirection: 'row',
  },
  macroLabel: {
    flexShrink: 0,
  },
  macroValue: {
    flexShrink: 0,
    textAlign: 'right',
  },
  /*
    A fixed column instead of "whatever the number needs": it is what puts the
    kcal of every row on the same right edge (§1.2).
  */
  kcal: {
    width: KCAL_COLUMN_WIDTH,
    textAlign: 'right',
  },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
