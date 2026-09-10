import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import type { DiaryEntryView } from '../data/diary/DiaryRepository';
import { t } from '../i18n';
import { formatKcal } from '../i18n/format';
import { floatingElevation, useTheme } from '../theme';
import { SHEET_IN, SHEET_OUT } from '../theme/motion';
import { tabularNumbers, textDefaults } from '../theme/type';
import { DiaryEntryRow } from './DiaryEntryRow';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { usePressAnimation } from './usePressAnimation';
import { useEntryArrival } from './useEntryArrival';

/**
 * The tray watches one add session — its own life on screen — so the key it
 * observes against never changes; a new session is a new tray.
 */
const TRAY_SESSION_KEY = 'session';

/** The tray's own height; the bottom inset is added below it. */
export const ADD_TRAY_HEIGHT = 56;
/** The 1 dp `line` rule on top of the tray. */
const RULE_WIDTH = 1;
/** The expanded list never takes more than this share of the screen. */
const PANEL_MAX_RATIO = 0.4;

/** One line of the expanded tray: the entry written for that food. */
export interface AddTrayItem {
  entryId: string;
  entry: DiaryEntryView;
}

export interface AddTrayProps<Item extends AddTrayItem = AddTrayItem> {
  visible: boolean;
  itemCount: number;
  kcal: number;
  onDone: () => void;
  /** The session's items, newest last; only read while expanded. */
  items?: readonly Item[];
  expanded?: boolean;
  onToggle?: () => void;
  onEditItem?: (entry: DiaryEntryView) => void;
  onRemoveItem?: (item: Item) => void;
  testID?: string;
}

/** "1 item · 32 kcal" / "3 itens · 410 kcal". */
export function trayLabel(itemCount: number, kcal: number): string {
  const items =
    itemCount === 1
      ? t('search.oneItem')
      : t('search.itemsCount', { count: itemCount });
  return t('search.trayLabel', { items, kcal: formatKcal(kcal) });
}

/**
 * Design system §2.10: the bar that appears with the first added item.
 * `surface`, a hairline on top, the app's only shadow (light theme), and
 * "Concluir" on the right. Slides in with `SHEET_IN`, out with `SHEET_OUT`;
 * only `transform` moves, so the list underneath never re-lays out.
 */
export function AddTray<Item extends AddTrayItem>({
  visible,
  itemCount,
  kcal,
  onDone,
  items,
  expanded = false,
  onToggle,
  onEditItem,
  onRemoveItem,
  testID,
}: AddTrayProps<Item>) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const height = ADD_TRAY_HEIGHT + insets.bottom;
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [rendered, setRendered] = useState(visible);
  const offset = useSharedValue(visible ? 0 : height);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      offset.value = withTiming(0, SHEET_IN);
    } else {
      offset.value = withTiming(height, SHEET_OUT, finished => {
        if (finished) runOnJS(setRendered)(false);
      });
    }
  }, [visible, height, offset]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  /*
    The row the portion sheet has just written, rising into the tray. Observed
    against the whole session, not only what is expanded, and frozen while the
    sheet is on top so the entrance plays when the sheet is gone.
  */
  const focused = useIsFocused();
  const itemIds = React.useMemo(
    () => (items ?? []).map(item => item.entryId),
    [items],
  );
  const arrivals = useEntryArrival(itemIds, TRAY_SESSION_KEY, focused);

  const removeItem = useCallback(
    (entry: DiaryEntryView) => {
      setOpenEntry(null);
      const item = items?.find(candidate => candidate.entryId === entry.id);
      if (item) onRemoveItem?.(item);
    },
    [items, onRemoveItem],
  );

  if (!rendered) return null;

  const label = trayLabel(itemCount, kcal);
  const list = expanded ? items ?? [] : [];

  return (
    <Animated.View
      style={[
        styles.tray,
        {
          paddingBottom: insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
        },
        floatingElevation(theme.mode, theme.colors),
        slide,
      ]}
      testID={testID}
    >
      {expanded ? (
        <ScrollView
          style={{ maxHeight: window.height * PANEL_MAX_RATIO }}
          contentContainerStyle={{ paddingVertical: theme.spacing.sm }}
          keyboardShouldPersistTaps="handled"
          testID={testID ? `${testID}-panel` : undefined}
        >
          {list.map(item => (
            <DiaryEntryRow
              key={item.entryId}
              entry={item.entry}
              onPress={onEditItem}
              onRemove={removeItem}
              backgroundColor={theme.colors.surface}
              open={openEntry === item.entryId}
              onOpenChange={setOpenEntry}
              arrivalIndex={arrivals.get(item.entryId)}
            />
          ))}
        </ScrollView>
      ) : null}
      <View
        style={[
          styles.bar,
          { height: ADD_TRAY_HEIGHT, paddingHorizontal: theme.spacing.lg },
        ]}
      >
        <Pressable
          onPress={onToggle}
          onPressIn={onToggle ? press.onPressIn : undefined}
          onPressOut={onToggle ? press.onPressOut : undefined}
          disabled={onToggle === undefined}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={t(
            expanded ? 'search.trayCollapse' : 'search.trayExpand',
            {
              label,
            },
          )}
          style={[styles.label, { minHeight: theme.touchTarget }]}
          testID={testID ? `${testID}-toggle` : undefined}
        >
          <Animated.View style={[styles.label, press.style]}>
            <Text
              style={[
                theme.type.bodyMedium,
                textDefaults,
                tabularNumbers,
                styles.labelText,
                { color: theme.colors.ink },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              testID={testID ? `${testID}-label` : undefined}
            >
              {label}
            </Text>
            {/*
            Without this the count reads as static text beside "Concluir" and
            nobody finds the list under it. `chevron-up` says the tray opens
            upwards; `chevron-down` says the open panel folds back.
          */}
            <View style={{ marginLeft: theme.spacing.xs }}>
              <Icon
                name={expanded ? 'chevron-down' : 'chevron-up'}
                size="row"
                color={theme.colors.inkMuted}
              />
            </View>
          </Animated.View>
        </Pressable>
        <View style={{ marginLeft: theme.spacing.md }}>
          <PrimaryButton
            label={t('search.done')}
            onPress={onDone}
            testID={testID ? `${testID}-done` : undefined}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: RULE_WIDTH,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    flexShrink: 1,
  },
});
