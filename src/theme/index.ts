import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Appearance,
  AppState,
  useColorScheme,
  type ColorSchemeName,
} from 'react-native';

import { prefs } from '../data/prefs/prefs';
import { useLanguage } from '../i18n/LanguageProvider';
import { setNightMode } from '../native/appearance';
import {
  darkColors,
  lightColors,
  type AppearanceMode,
  type AppearanceSetting,
  type ThemeColors,
} from './colors';
import { radii, spacing, touchTarget } from './spacing';
import { fontFamily, typeScale } from './type';

export * from './colors';
export * from './spacing';
export * from './type';
export * from './icons';
export * from './elevation';
import * as motion from './motion';

export { motion };

export interface AppTheme {
  mode: AppearanceMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  type: typeof typeScale;
  fonts: typeof fontFamily;
  touchTarget: number;
}

export function buildTheme(mode: AppearanceMode): AppTheme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    type: typeScale,
    fonts: fontFamily,
    touchTarget,
  };
}

const ThemeContext = createContext<AppTheme>(buildTheme('light'));

export interface AppearanceState {
  /** What the user picked in "Metas": system, light or dark. */
  setting: AppearanceSetting;
  /** The palette actually in use once "system" is resolved. */
  resolved: AppearanceMode;
  setSetting: (setting: AppearanceSetting) => void;
}

const AppearanceContext = createContext<AppearanceState>({
  setting: 'system',
  resolved: 'light',
  setSetting: () => {},
});

/**
 * Holds the appearance for the whole app.
 *
 * The choice wins over the device; only "system" listens to it. The system
 * side is still asked again on every appearance event and every return to the
 * foreground, because a night-mode switch that lands while the app is being
 * resumed delivers no event and the app would stay on the old palette.
 *
 * The stored choice is read synchronously from MMKV while the first state is
 * built, so the first frame is already on the right palette — nothing flashes
 * light before turning dark. Switching publishes a new theme identity, which
 * re-renders every `useTheme()` consumer without remounting the navigator, so
 * the user stays on "Metas" while the app changes colour around them.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [reported, setReported] = useState<ColorSchemeName | null>(null);
  const [setting, setStoredSetting] = useState<AppearanceSetting>(() =>
    prefs.getAppearance(),
  );
  // Not a colour: the theme is the one context every screen already reads, so
  // publishing a new identity when the language changes is what re-renders
  // the whole app with the new copy table (src/i18n/LanguageProvider.tsx).
  const { resolved: language } = useLanguage();

  useEffect(() => {
    const appearance = Appearance.addChangeListener(({ colorScheme }) => {
      setReported(colorScheme);
    });
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') setReported(Appearance.getColorScheme());
    });
    return () => {
      appearance.remove();
      app.remove();
    };
  }, []);

  const system = reported ?? scheme;
  const mode: AppearanceMode =
    setting === 'system' ? (system === 'dark' ? 'dark' : 'light') : setting;

  useEffect(() => {
    // Both halves, because `setDefaultNightMode` makes the platform report the
    // choice: without the setting, the log cannot tell "the device never
    // switched" from "the user picked this".
    if (__DEV__) {
      console.log(`[bocado:theme] setting=${setting} resolved=${mode}`);
    }
  }, [setting, mode]);

  useEffect(() => {
    // Once per launch: MMKV is the truth, and the Android mirror has to catch
    // up with it when the choice was made in a build where the native module
    // was not answering. A no-op when it still is not.
    setNightMode(prefs.getAppearance());
  }, []);

  const setSetting = useCallback((next: AppearanceSetting) => {
    prefs.setAppearance(next);
    // Mirrors the choice on the Android side, so the next cold start opens the
    // splash on the same palette. A no-op when the module is not there.
    setNightMode(next);
    setStoredSetting(next);
  }, []);

  const theme = useMemo(() => {
    // Read on purpose: a new theme identity per language is what re-renders
    // every screen with the new copy table. Nothing here depends on its value.
    void language;
    return buildTheme(mode);
  }, [mode, language]);

  const appearance = useMemo(
    () => ({ setting, resolved: mode, setSetting }),
    [setting, mode, setSetting],
  );

  return React.createElement(
    AppearanceContext.Provider,
    { value: appearance },
    React.createElement(ThemeContext.Provider, { value: theme }, children),
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}

export function useAppearance(): AppearanceState {
  return useContext(AppearanceContext);
}
