'use client';

import type { SimMode } from '@/components/simulation/panels/panel-registry';
import { useLayoutStore } from '@/lib/browser/layout-store';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

// Re-export for backwards compat
export type SimTab = SimMode;

interface TabBarProps {
  activeTab: SimTab;
  onTabChange: (tab: SimTab) => void;
}

const primaryTabs: { id: SimTab; label: string; glyph: string }[] = [
  { id: 'interactive', label: 'Explore · Sanctum', glyph: '◈' },
  { id: 'research', label: 'Evidence', glyph: '⊛' },
];

const analysisTabs: { id: SimTab; label: string; glyph: string }[] = [
  { id: 'compare', label: 'Compare', glyph: '⊕' },
  { id: 'branch', label: 'Branch', glyph: '⋈' },
  { id: 'multirun', label: 'Multi-Run', glyph: '⟳' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const setMode = useLayoutStore(s => s.setMode);
  const { trackEvent } = useAnalytics();

  const handleTabChange = (tab: SimTab) => {
    onTabChange(tab);
    setMode(tab);
    trackEvent(`${ANALYTICS_EVENTS.TAB_CHANGED}:${tab}`);
  };

  return (
    <div className="flex px-4 overflow-x-auto scrollbar-none -mb-px" role="tablist">
      {primaryTabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleTabChange(tab.id)}
            className="relative px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
            style={{
              color: isActive ? 'var(--mucha-gold-lt, #E8C050)' : 'var(--sim-text-muted)',
              textShadow: isActive ? '0 0 10px rgba(196,144,32,0.5)' : 'none',
              letterSpacing: isActive ? '0.03em' : '0',
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: '0.7em', opacity: isActive ? 1 : 0.45 }}
            >
              {tab.glyph}
            </span>
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-2 right-2"
                style={{
                  height: '1.5px',
                  background: 'linear-gradient(to right, transparent, var(--mucha-gold, #C49020) 30%, var(--mucha-gold-lt, #E8C050) 50%, var(--mucha-gold, #C49020) 70%, transparent)',
                  borderRadius: '1px',
                }}
              />
            )}
          </button>
        );
      })}
      <details className="relative flex-shrink-0">
        <summary className="list-none cursor-pointer px-4 py-2.5 text-sm font-medium text-[var(--sim-text-muted)]">
          Analysis tools ▾
        </summary>
        <div className="absolute z-50 left-0 top-full min-w-44 rounded-b border border-[var(--sim-border)] bg-[var(--sim-surface)] shadow-xl p-1">
          {analysisTabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="w-full text-left rounded px-3 py-2 text-sm hover:bg-[var(--sim-surface-hover)]"
              style={{ color: activeTab === tab.id ? 'var(--mucha-gold-lt, #E8C050)' : 'var(--sim-text-muted)' }}
            >
              <span className="mr-2" aria-hidden="true">{tab.glyph}</span>{tab.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
