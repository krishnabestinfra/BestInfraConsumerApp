/**
 * ThemeContext – app-wide light/dark theme with persistence.
 * Dashboard and header use this to match the Energy Dashboard dark design.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'settings:darkMode';

const lightColors = {
  screen: '#FFFFFF',
  screenSecondary: '#eef8f0',
  card: '#eef8f0',
  cardBorder: '#F1F3F4',
  cardSecondary: '#FAFAFA',
  inputBg: '#F8F8F8',
  textPrimary: 'rgba(38, 38, 38, 1)',
  textSecondary: 'rgba(126, 126, 126, 1)',
  textOnPrimary: '#FFFFFF',
  accent: '#55B56C',
  accentGreen: '#3BBA6B',
  brandBlue: 'rgba(22, 59, 124, 1)',
  danger: 'rgba(220, 39, 44, 1)',
  progressBarTrack: '#E5E7EB',
  savingsText: '#6B9E78',
  headerBg: '#eef8f0',
  dueCardBg: 'rgba(22, 59, 124, 1)',
  meterCardBg: 'rgba(22, 59, 124, 1)',
};

const darkColors = {
  screen: '#1A1A1A',
  screenSecondary: '#1A1A1A',
  card: '#2C2C2E',
  cardBorder: 'rgba(255,255,255,0.08)',
  cardSecondary: '#2C2C2E',
  inputBg: '#1A1F2E',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textOnPrimary: '#FFFFFF',
  accent: '#3BBA6B',
  accentGreen: '#3BBA6B',
  brandBlue: '#3465B2',
  danger: 'rgba(220, 39, 44, 1)',
  progressBarTrack: 'rgba(255,255,255,0.12)',
  savingsText: '#3BBA6B',
  headerBg: '#1A1A1A',
  dueCardBg: '#2C2C2E',
  meterCardBg: '#1C3D6E',
};

const FONT_SIZE_STORAGE_KEY = 'settings:fontSize';
const DEFAULT_BODY_SIZE = 14;
const FONT_OPTIONS = ['default', 14, 15, 16];

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fontSizePreference, setFontSizePreferenceState] = useState('default');

  useEffect(() => {
    const load = async () => {
      try {
        const [storedTheme, storedFont] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY),
        ]);
        setIsDarkModeState(storedTheme === 'true');
        if (storedFont !== null) {
          if (storedFont === 'default' || ['14', '15', '16'].includes(storedFont)) {
            setFontSizePreferenceState(storedFont === 'default' ? 'default' : parseInt(storedFont, 10));
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const setDarkMode = useCallback(async (value) => {
    setIsDarkModeState(!!value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(!!value));
    } catch (e) {
      // ignore
    }
  }, []);

  const setFontSizePreference = useCallback(async (value) => {
    const next = value === 'default' || value === 14 || value === 15 || value === 16 ? value : 'default';
    setFontSizePreferenceState(next);
    try {
      await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, String(next));
    } catch (e) {
      // ignore
    }
  }, []);

  const getScaledFontSize = useCallback((baseSize) => {
    if (fontSizePreference === 'default') return baseSize;
    const scale = fontSizePreference / DEFAULT_BODY_SIZE;
    return Math.round(baseSize * scale);
  }, [fontSizePreference]);

  const theme = useMemo(() => ({
    isDark: isDarkMode,
    isLoaded,
    colors: isDarkMode ? darkColors : lightColors,
    setDarkMode,
    fontSizePreference,
    setFontSizePreference,
    getScaledFontSize,
    fontOptions: FONT_OPTIONS,
  }), [isDarkMode, isLoaded, setDarkMode, fontSizePreference, setFontSizePreference, getScaledFontSize]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};

export default ThemeContext;
