import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Appearance } from 'react-native';
import { ThemeContext, ThemeMode, lightColors, darkColors, _setColors } from '../lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => sub?.remove();
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const themeColors = isDark ? darkColors : lightColors;

  // Keep the module-level proxy in sync
  useEffect(() => {
    _setColors(themeColors);
  }, [isDark]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
  }, []);

  const value = useMemo(
    () => ({ mode, isDark, colors: themeColors, setMode }),
    [mode, isDark, themeColors, setMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
