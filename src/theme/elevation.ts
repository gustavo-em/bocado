import { Platform, type ViewStyle } from 'react-native';

import type { AppearanceMode, ThemeColors } from './colors';

/**
 * Design system §2.10 / §8: the only shadow in the app belongs to floating
 * surfaces (tray, sheet). Light theme only — in the dark theme surfaces are
 * told apart by tone, never by a shadow.
 */
export function floatingElevation(
  mode: AppearanceMode,
  colors: ThemeColors,
): ViewStyle {
  if (mode === 'dark') return {};
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: -2 },
      shadowRadius: 8,
      shadowOpacity: 0.08,
    },
    default: { elevation: 8 },
  });
}
