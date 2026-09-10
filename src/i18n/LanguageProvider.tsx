import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { prefs } from '../data/prefs/prefs';
import {
  currentLanguage,
  resolveLanguage,
  setLanguage,
  type AppLanguage,
  type LanguageSetting,
} from './index';

export interface LanguageState {
  /** What the user picked in "Metas": system, pt-BR or en-US. */
  setting: LanguageSetting;
  /** The table actually in use once the system setting is resolved. */
  resolved: AppLanguage;
  setSetting: (setting: LanguageSetting) => void;
}

const LanguageContext = createContext<LanguageState>({
  setting: 'system',
  resolved: currentLanguage(),
  setSetting: () => {},
});

/**
 * Holds the language choice for the whole app.
 *
 * `t()` reads a module-level table, so switching languages has to make every
 * screen render again. The provider sits above `ThemeProvider`, which takes
 * the resolved language as a dependency of the theme it publishes: a new
 * theme identity re-renders every `useTheme()` consumer — which is every
 * screen — without remounting the navigator, so the user stays where they are.
 *
 * `setLanguage` runs before the state update, so the render that follows
 * already reads the new table.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [setting, setStoredSetting] = useState<LanguageSetting>(() => {
    const stored = prefs.getLanguage();
    setLanguage(resolveLanguage(stored));
    return stored;
  });
  const [resolved, setResolved] = useState<AppLanguage>(() =>
    currentLanguage(),
  );

  const setSetting = useCallback((next: LanguageSetting) => {
    const language = resolveLanguage(next);
    setLanguage(language);
    prefs.setLanguage(next);
    setStoredSetting(next);
    setResolved(language);
  }, []);

  const value = useMemo(
    () => ({ setting, resolved, setSetting }),
    [setting, resolved, setSetting],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  return useContext(LanguageContext);
}
