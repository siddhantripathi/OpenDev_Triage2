import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  colors: ColorScheme;
}

interface ColorScheme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  error: string;
  success: string;
  cardBackground: string;
}

const lightColors: ColorScheme = {
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
  primary: '#007AFF',
  error: '#ff6b6b',
  success: '#4CAF50',
  cardBackground: '#ffffff',
};

const darkColors: ColorScheme = {
  background: '#1a1a1a',
  surface: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  border: '#404040',
  primary: '#0A84FF',
  error: '#ff6b6b',
  success: '#4CAF50',
  cardBackground: '#2d2d2d',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('auto');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      console.log('[ThemeContext] Loading saved theme...');
      const saved = await AsyncStorage.getItem('theme');
      console.log('[ThemeContext] Saved theme:', saved);
      if (saved) setThemeState(saved as Theme);
    } catch (error) {
      console.error('[ThemeContext] Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem('theme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const isDark = theme === 'auto'
    ? systemTheme === 'dark'
    : theme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

