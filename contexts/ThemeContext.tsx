import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { themes } from '../themes';
import type { Theme, ThemeName } from '../types';

interface ThemeContextType {
  theme: Theme;
  setThemeName: (name: ThemeName) => void;
  setCustomTheme: (colors: Theme['colors']) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [customTheme, setCustomTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const savedThemeName = localStorage.getItem('themeName') as ThemeName;
    if (savedThemeName) {
      setThemeName(savedThemeName);
    }
    const savedCustomTheme = localStorage.getItem('customTheme');
    if (savedCustomTheme) {
      setCustomTheme(JSON.parse(savedCustomTheme));
    }
  }, []);

  const theme = useMemo(() => {
    if (themeName === 'custom' && customTheme) {
      return customTheme;
    }
    return themes[themeName] || themes.dark;
  }, [themeName, customTheme]);

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--color-${key}`, value);
    }
    localStorage.setItem('themeName', themeName);
    if(themeName === 'custom' && customTheme) {
        localStorage.setItem('customTheme', JSON.stringify(customTheme));
    }
  }, [theme, themeName, customTheme]);

  const handleSetThemeName = (name: ThemeName) => {
    setThemeName(name);
  };
  
  const handleSetCustomTheme = (colors: Theme['colors']) => {
    const newCustomTheme = { name: 'Custom', colors };
    setCustomTheme(newCustomTheme);
    setThemeName('custom');
  };

  const value = {
    theme,
    setThemeName: handleSetThemeName,
    setCustomTheme: handleSetCustomTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};