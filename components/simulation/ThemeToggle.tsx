'use client';

import { useEffect } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

export function ThemeToggle() {
  const simTheme = useSimulationStore(s => s.simTheme);
  const setSimTheme = useSimulationStore(s => s.setSimTheme);
  const { trackEvent } = useAnalytics();

  // Load saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sim-theme');
      if (saved === 'light' || saved === 'dark') {
        setSimTheme(saved);
      }
    } catch { /* noop */ }
  }, [setSimTheme]);

  // Apply class to simulation container
  useEffect(() => {
    const el = document.querySelector('[data-sim-root]');
    if (el) {
      if (simTheme === 'light') {
        el.classList.add('sim-theme-light');
      } else {
        el.classList.remove('sim-theme-light');
      }
    }
  }, [simTheme]);

  return (
    <button
      onClick={() => { setSimTheme(simTheme === 'dark' ? 'light' : 'dark'); trackEvent(ANALYTICS_EVENTS.THEME_TOGGLED); }}
      className="w-7 h-7 rounded-full border border-[var(--sim-border)] text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] hover:border-[var(--sim-accent)] text-sm transition-colors"
      title={`Switch to ${simTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {simTheme === 'dark' ? (
        <span className="text-xs">&#x2600;</span>
      ) : (
        <span className="text-xs">&#x1F319;</span>
      )}
    </button>
  );
}
