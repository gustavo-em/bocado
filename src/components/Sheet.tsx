import React, { useCallback, useEffect, useRef } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { floatingElevation, useTheme } from '../theme';
import {
  SHEET_DISMISS_DP,
  SHEET_DISMISS_VELOCITY,
  SHEET_FADE,
  SHEET_IN,
  SHEET_OUT,
} from '../theme/motion';
import { useKeyboardInset } from './useKeyboardInset';

const SHEET_LOG_TAG = '[bocado:sheet]';

/** Design system §2.12: a 36 × 4 handle, 8 dp below the top edge. */
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const HANDLE_TOP = 8;
/** Height assumed before the first layout, so the entrance starts off-screen. */
const ASSUMED_HEIGHT = 480;
/** The sheet never takes more than this share of the screen (§2.12). */
const MAX_HEIGHT_RATIO = 0.85;
/** Vertical travel that starts the drag; sideways travel that gives it up. */
const DRAG_ACTIVE_OFFSET = 8;
const DRAG_FAIL_OFFSET = 16;

export interface SheetProps {
  /** Runs once the exit animation has finished. */
  onClose: () => void;
  children: React.ReactNode;
  /**
   * The primary action, held at the bottom of the sheet under the body: the
   * one control the sheet exists for cannot be a thing the user has to go
   * looking for, on any screen height or with the keyboard up.
   */
  footer?: React.ReactNode;
  /** What the scrim announces; the portion sheet's wording is the default. */
  dismissAccessibilityLabel?: string;
  /**
   * The screen asking the sheet to leave — a primary action that has done its
   * job. It plays the same exit as the drag, the scrim and the back button,
   * so a confirmed action costs no more time than any other dismissal. Back
   * to `false` before the exit ends brings the sheet up again, which is what a
   * failed write does.
   */
  closing?: boolean;
  testID?: string;
}

/**
 * Design system §2.12: `surface`, radius `xl` on top, a handle, the app's
 * scrim behind it, and no "Cancelar" — dragging down, the scrim and back all
 * dismiss. Only `transform` and `opacity` move; with Reduce Motion the
 * translation is skipped by the preset and the `SHEET_FADE` crossfade is what
 * is left. With the keyboard up the root lifts the whole sheet and the
 * ceiling drops to the room left above it, so the primary button stays on
 * screen and inside the sheet's own bounds.
 */
export function Sheet({
  onClose,
  children,
  footer,
  dismissAccessibilityLabel,
  closing = false,
  testID,
}: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const keyboard = useKeyboardInset(insets.bottom);
  const progress = useSharedValue(0);
  const fade = useSharedValue(0);
  const drag = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const sheetHeight = useSharedValue(ASSUMED_HEIGHT);
  const leaving = useRef(false);

  useEffect(() => {
    progress.value = withTiming(1, SHEET_IN);
    fade.value = withTiming(1, SHEET_FADE);
  }, [progress, fade]);

  const close = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    fade.value = withTiming(0, SHEET_FADE);
    progress.value = withTiming(0, SHEET_OUT, finished => {
      if (finished) runOnJS(onClose)();
    });
  }, [progress, fade, onClose]);

  // The same exit, asked for by the screen instead of by the finger.
  useEffect(() => {
    if (closing) {
      close();
      return;
    }
    if (!leaving.current) return;
    leaving.current = false;
    fade.value = withTiming(1, SHEET_FADE);
    progress.value = withTiming(1, SHEET_IN);
  }, [closing, close, fade, progress]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [close]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      sheetHeight.value = event.nativeEvent.layout.height;
      if (__DEV__) {
        console.log(
          `${SHEET_LOG_TAG} surface h=${event.nativeEvent.layout.height.toFixed(
            0,
          )} keyboard=${keyboard}`,
        );
      }
    },
    [sheetHeight, keyboard],
  );

  /**
   * Says where the primary action ended up. A footer whose `y + height` runs
   * past the surface height is outside its parent and will be missing from
   * the accessibility tree even though it is still painted.
   */
  const onFooterLayout = useCallback((event: LayoutChangeEvent) => {
    if (!__DEV__) return;
    const { y, height } = event.nativeEvent.layout;
    console.log(
      `${SHEET_LOG_TAG} footer y=${y.toFixed(0)} h=${height.toFixed(0)}`,
    );
  }, []);

  // The drag only claims a clearly vertical movement and gives up on a
  // sideways one, so the measure chips keep their horizontal scroll; while
  // the keyboard is up the sheet stays put.
  const pan = Gesture.Pan()
    .enabled(keyboard === 0)
    .activeOffsetY([-DRAG_ACTIVE_OFFSET, DRAG_ACTIVE_OFFSET])
    .failOffsetX([-DRAG_FAIL_OFFSET, DRAG_FAIL_OFFSET])
    .onBegin(() => {
      dragStart.value = drag.value;
    })
    .onUpdate(event => {
      drag.value = Math.max(0, dragStart.value + event.translationY);
    })
    .onEnd(event => {
      if (
        event.translationY > SHEET_DISMISS_DP ||
        event.velocityY > SHEET_DISMISS_VELOCITY
      ) {
        runOnJS(close)();
        return;
      }
      drag.value = withTiming(0, SHEET_IN);
    });

  // With the keyboard up, 85 % of the screen would run under it: the ceiling
  // becomes the room that is actually visible.
  const maxHeight = Math.min(
    window.height * MAX_HEIGHT_RATIO,
    window.height - keyboard - insets.top,
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: (1 - progress.value) * sheetHeight.value + drag.value },
    ],
  }));

  return (
    // The keyboard is discounted here and nowhere else. The root is anchored
    // to the bottom of the screen, so its padding is what lifts the sheet;
    // subtracting the same keyboard again inside the sheet would leave
    // `window − 2 × keyboard` for the content and push the footer out.
    <View style={[styles.root, { paddingBottom: keyboard }]} testID={testID}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.scrim },
          scrimStyle,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel ?? t('portion.dismiss')}
          testID={testID ? `${testID}-scrim` : undefined}
        />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={onLayout}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight,
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              paddingHorizontal: theme.spacing.lg,
              // The home indicator only needs clearing when the keyboard is
              // not already holding the sheet above it.
              paddingBottom:
                (keyboard > 0 ? 0 : insets.bottom) + theme.spacing.lg,
            },
            floatingElevation(theme.mode, theme.colors),
            sheetStyle,
          ]}
          testID={testID ? `${testID}-surface` : undefined}
        >
          <View style={[styles.handleRow, { paddingTop: HANDLE_TOP }]}>
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.colors.inkSubtle },
              ]}
            />
          </View>
          {/*
            A plain View, not a scroller. A ScrollView here measures itself
            against unbounded content, so inside a column sized by `maxHeight`
            it took the whole box and laid the footer out past the sheet's
            bounds: still drawn, but pruned from the accessibility tree, which
            is exactly how "Adicionar · N kcal" kept disappearing from the
            dump. The content fits the ceiling in every supported state —
            keyboard up included, since the root already lifts the sheet.
          */}
          <View style={styles.body}>{children}</View>
          <View onLayout={onFooterLayout}>{footer}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  body: {
    flexShrink: 1,
  },
  handleRow: {
    alignItems: 'center',
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: HANDLE_HEIGHT / 2,
  },
});
