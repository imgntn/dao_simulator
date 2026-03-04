'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Read what the inline script already applied (source of truth)
    const current = document.documentElement.classList.contains('theme-dark')
      ? 'dark'
      : 'light';
    setTheme(current);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';

      // Gate transitions behind a class so page-load has no flash
      document.documentElement.classList.add('theme-transitioning');
      document.documentElement.classList.toggle('theme-dark', next === 'dark');
      localStorage.setItem('theme', next);

      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);

      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + Shift + D
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'D' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        // Skip when focus is in a form field
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if ((e.target as HTMLElement)?.isContentEditable) return;

        e.preventDefault();
        toggleTheme();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
