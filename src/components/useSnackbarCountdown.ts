import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import {
  SNACKBAR_VISIBLE_MS,
  SNACKBAR_VISIBLE_SCREEN_READER_MS,
} from '../theme/motion';

export interface SnackbarCountdown {
  /** (Re)starts the countdown; `onExpire` runs when it ends. */
  start: () => void;
  /** Stops the countdown without running `onExpire`. */
  cancel: () => void;
}

/**
 * The snackbar's 4 s (SNACKBAR_VISIBLE_MS), adjusted for assistive tech the
 * way Android's own snackbar does it: with a screen reader on the window is
 * SNACKBAR_VISIBLE_SCREEN_READER_MS, so "Desfazer" can be reached by focus,
 * and on Android the system's "Time to take action" setting can only lengthen
 * it. The snackbar always expires; nothing here restarts the countdown.
 */
export function useSnackbarCountdown(onExpire: () => void): SnackbarCountdown {
  const expire = useRef(onExpire);
  expire.current = onExpire;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True from `start` until `cancel` or expiry: a countdown is wanted. */
  const armed = useRef(false);
  const screenReader = useRef(false);
  /** Bumped on every (re)start so a late recommended timeout is ignored. */
  const generation = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const schedule = useCallback(
    (ms: number) => {
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        armed.current = false;
        expire.current();
      }, ms);
    },
    [clear],
  );

  const arm = useCallback(() => {
    generation.current += 1;
    const run = generation.current;
    const base = screenReader.current
      ? SNACKBAR_VISIBLE_SCREEN_READER_MS
      : SNACKBAR_VISIBLE_MS;
    schedule(base);
    if (Platform.OS !== 'android') return;
    AccessibilityInfo.getRecommendedTimeoutMillis(base).then(
      recommended => {
        if (run !== generation.current || !armed.current) return;
        if (typeof recommended === 'number' && recommended > base)
          schedule(recommended);
      },
      () => undefined,
    );
  }, [schedule]);

  const start = useCallback(() => {
    armed.current = true;
    arm();
  }, [arm]);

  const cancel = useCallback(() => {
    armed.current = false;
    generation.current += 1;
    clear();
  }, [clear]);

  useEffect(() => {
    let mounted = true;
    // A change event is fresher than the answer to the initial question.
    let changed = false;
    const setScreenReader = (enabled: boolean) => {
      if (!mounted || screenReader.current === enabled) return;
      screenReader.current = enabled;
      if (armed.current) arm();
    };
    AccessibilityInfo.isScreenReaderEnabled().then(
      enabled => {
        if (!changed) setScreenReader(enabled);
      },
      () => undefined,
    );
    const reader = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      enabled => {
        changed = true;
        setScreenReader(enabled);
      },
    );
    return () => {
      mounted = false;
      reader.remove();
      clear();
    };
  }, [arm, clear]);

  return useMemo(() => ({ start, cancel }), [start, cancel]);
}
