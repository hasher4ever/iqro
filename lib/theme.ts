import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';

// ─── Color definitions ───────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

export type Colors = typeof lightColors;

export const lightColors = {
  primary: '#0D9488',
  primaryLight: '#CCFBF1',
  primaryDark: '#0F766E',
  secondary: '#D97706',
  secondaryLight: '#FEF3C7',
  accent: '#6366F1',
  accentLight: '#EEF2FF',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#6366F1',
  infoLight: '#EEF2FF',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',

  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
  excused: '#64748B',

  pending: '#F59E0B',
  confirmed: '#10B981',
  reversed: '#EF4444',
};

export const darkColors: Colors = {
  primary: '#2DD4BF',
  primaryLight: '#134E4A',
  primaryDark: '#5EEAD4',
  secondary: '#FBBF24',
  secondaryLight: '#451A03',
  accent: '#A5B4FC',
  accentLight: '#1E1B4B',

  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  error: '#F87171',
  errorLight: '#7F1D1D',
  info: '#A5B4FC',
  infoLight: '#1E1B4B',

  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',

  present: '#34D399',
  absent: '#F87171',
  late: '#FBBF24',
  excused: '#94A3B8',

  pending: '#FBBF24',
  confirmed: '#34D399',
  reversed: '#F87171',
};

// ─── Mutable module-level colors (updated by ThemeProvider) ──────────

let _currentColors: Colors = lightColors;

/** Proxy object that always reads from the current theme's colors */
export const colors: Colors = new Proxy({} as Colors, {
  get(_target, prop: string) {
    return (_currentColors as any)[prop];
  },
  ownKeys() {
    return Object.keys(_currentColors);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (prop in _currentColors) {
      return { configurable: true, enumerable: true, value: (_currentColors as any)[prop] };
    }
    return undefined;
  },
});

export function _setColors(c: Colors) {
  _currentColors = c;
}

// ─── Static tokens (shared between themes) ──────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// ─── Theme Context ──────────────────────────────────────────────────

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  colors: Colors;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
