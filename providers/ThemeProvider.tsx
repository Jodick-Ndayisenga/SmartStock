// providers/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof lightColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Color constants for easy access
export const lightColors = {
  surface: '#ffffff',
  surfaceSoft: '#f8fafc',
  surfaceMuted: '#f1f5f9',
  text: '#0f172a',
  textSoft: '#475569',
  textMuted: '#64748b',
  brand: '#0ea5e9',
  brandSoft: '#e0f2fe',
  success: '#22c55e',
  successSoft: '#dcfce7',
  warning: '#f59e0b',
  warningSoft: '#fef3c7',
  error: '#ef4444',
  errorSoft: '#fee2e2',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
};

export const darkColors = {
  surface: '#0f172a',
  surfaceSoft: '#1e293b',
  surfaceMuted: '#334155',
  text: '#f1f5f9',
  textSoft: '#cbd5e1',
  textMuted: '#94a3b8',
  brand: '#38bdf8',
  brandSoft: '#1e3a5c',
  success: '#4ade80',
  successSoft: '#1a4532',
  warning: '#fbbf24',
  warningSoft: '#453209',
  error: '#f87171',
  errorSoft: '#4c1d1d',
  border: '#475569',
  borderStrong: '#64748b',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const router = useGlobalSearchParams();

  // Sync with system theme changes
  useEffect(() => {
    setIsDark(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};