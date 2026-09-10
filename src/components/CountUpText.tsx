import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatKcal } from '../i18n/format';
import { COUNT_UP } from '../theme/motion';

export interface CountUpTextProps {
  value: number;
  /** `false` on the first paint so numbers do not roll up from zero. */
  animate: boolean;
  style: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * A number that rolls to its new value with `COUNT_UP` (300 ms). The shared
 * value runs on the UI thread; only the rounded, formatted text crosses back.
 * Always paired with tabular numerals so the width does not jitter.
 */
export function CountUpText({
  value,
  animate,
  style,
  testID,
}: CountUpTextProps) {
  const [shown, setShown] = useState(() => Math.round(value));
  const progress = useSharedValue(value);

  useEffect(() => {
    if (animate) {
      progress.value = withTiming(value, COUNT_UP);
    } else {
      progress.value = value;
      setShown(Math.round(value));
    }
  }, [value, animate, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setShown)(current);
    },
    [],
  );

  return (
    <Text style={style} testID={testID} maxFontSizeMultiplier={1.3}>
      {formatKcal(shown)}
    </Text>
  );
}
