'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface TooltipSettings {
  enabled: boolean;
  delay: number; // ms before showing tooltip
  showExamples: boolean; // show real-world examples in tooltips
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  maxWidth: number;
  showOnFocus: boolean; // show tooltips on keyboard focus
  persistentGlossary: boolean; // keep glossary terms highlighted
}

const DEFAULT_SETTINGS: TooltipSettings = {
  enabled: true,
  delay: 200,
  showExamples: true,
  position: 'auto',
  maxWidth: 300,
  showOnFocus: true,
  persistentGlossary: false,
};

interface TooltipSettingsContextType {
  settings: TooltipSettings;
  updateSettings: (updates: Partial<TooltipSettings>) => void;
  resetSettings: () => void;
  toggleTooltips: () => void;
}

const TooltipSettingsContext = createContext<TooltipSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'dao-simulator-tooltip-settings';

export function TooltipSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TooltipSettings>(DEFAULT_SETTINGS);
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
      console.warn('Failed to load tooltip settings:', e);
    }
    setIsHydrated(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save tooltip settings:', e);
      }
    }
  }, [settings, isHydrated]);

  const updateSettings = useCallback((updates: Partial<TooltipSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const toggleTooltips = useCallback(() => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Global keyboard shortcut to toggle tooltips (Ctrl/Cmd + Shift + T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTooltips();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTooltips]);

  return (
    <TooltipSettingsContext.Provider
      value={{ settings, updateSettings, resetSettings, toggleTooltips }}
    >
      {children}
    </TooltipSettingsContext.Provider>
  );
}

export function useTooltipSettings() {
  const context = useContext(TooltipSettingsContext);
  if (context === undefined) {
    throw new Error('useTooltipSettings must be used within a TooltipSettingsProvider');
  }
  return context;
}

// Hook for components that want to gracefully handle missing provider
export function useTooltipSettingsOptional() {
  return useContext(TooltipSettingsContext);
}
