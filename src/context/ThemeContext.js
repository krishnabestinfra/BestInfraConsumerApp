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

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        setIsDarkModeState(stored === 'true');
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

  const theme = useMemo(() => ({
    isDark: isDarkMode,
    isLoaded,
    colors: isDarkMode ? darkColors : lightColors,
    setDarkMode,
  }), [isDarkMode, isLoaded, setDarkMode]);

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
