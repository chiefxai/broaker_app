import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { Colors, type ThemePalette, type ThemeScheme } from './tokens';

export type ThemeMode = ThemeScheme | 'system';

interface AppThemeContextValue {
  mode: ThemeMode;
  scheme: ThemeScheme;
  colors: ThemePalette;
  isHydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleColorScheme: () => void;
}

const STORAGE_KEY = '@broaker/theme-mode/v1';
const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedMode) => {
        if (isMounted && isThemeMode(storedMode)) setMode(storedMode);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => undefined);
  }, [isHydrated, mode]);

  // Expo Router server-renders web with a light default. Keep the first browser
  // render identical, then apply the stored/system preference after hydration.
  const scheme: ThemeScheme = Platform.OS === 'web' && !isHydrated
    ? 'light'
    : mode === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : mode;
  const toggleColorScheme = useCallback(() => {
    setMode((currentMode) => {
      const currentScheme = currentMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : currentMode;
      return currentScheme === 'dark' ? 'light' : 'dark';
    });
  }, [systemScheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({ mode, scheme, colors: Colors[scheme], isHydrated, setMode, toggleColorScheme }),
    [mode, scheme, isHydrated, toggleColorScheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider');
  return context;
}

export function useTheme() {
  return useAppTheme().colors;
}
