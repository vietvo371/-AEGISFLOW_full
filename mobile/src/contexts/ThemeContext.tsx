/**
 * ThemeContext — AegisFlow AI
 * Global dark/light mode management with AsyncStorage persistence.
 *
 * Usage:
 *   const { colors, isDark, themeMode, setThemeMode } = useAppTheme();
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Appearance } from 'react-native';
import { lightTheme, darkTheme, LIGHT_COLORS, DARK_COLORS } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof LIGHT_COLORS;
  theme: typeof lightTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// ─── Storage key ─────────────────────────────────────────────────────────────
const THEME_STORAGE_KEY = '@aegisflow:theme_mode';

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  isDark: false,
  colors: LIGHT_COLORS,
  theme: lightTheme,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      } catch (_) {
        // fallback to light
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Resolve actual dark/light from mode
  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const theme = isDark ? darkTheme : lightTheme;

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  // Don't render children until theme is loaded (avoids flash)
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, theme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAppTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used inside <ThemeProvider>');
  }
  return ctx;
};

export default ThemeContext;
