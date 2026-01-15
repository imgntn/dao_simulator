'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type SimulationSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface AppSettings {
  theme: Theme;
  simulationSpeed: SimulationSpeed;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  compactMode: boolean;
  showAdvancedMetrics: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // seconds
  animationsEnabled: boolean;
  accessibilityMode: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  simulationSpeed: 'normal',
  soundEnabled: false,
  notificationsEnabled: true,
  compactMode: false,
  showAdvancedMetrics: false,
  autoSaveEnabled: true,
  autoSaveInterval: 30,
  animationsEnabled: true,
  accessibilityMode: false,
};

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  effectiveTheme: 'light' | 'dark';
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'dao-simulator-app-settings';

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load app settings:', e);
    }
    setIsHydrated(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save app settings:', e);
      }
    }
  }, [settings, isHydrated]);

  // Handle theme changes
  useEffect(() => {
    const updateTheme = () => {
      let theme: 'light' | 'dark';
      if (settings.theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        theme = settings.theme;
      }
      setEffectiveTheme(theme);

      // Apply to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{ settings, updateSettings, resetSettings, effectiveTheme }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
