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

const tabs: { id: SimTab; label: string; glyph: string }[] = [
  { id: 'interactive', label: 'The Sanctum', glyph: '◈' },
  { id: 'compare',     label: 'Compare',     glyph: '⊕' },
  { id: 'branch',      label: 'Branch',      glyph: '⋈' },
  { id: 'multirun',    label: 'Multi-Run',   glyph: '⟳' },
  { id: 'research',    label: 'Research',    glyph: '⊛' },
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
      {tabs.map(tab => {
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
            <span style={{ fontSize: '0.7em', opacity: isActive ? 1 : 0.45 }}>{tab.glyph}</span>
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
    </div>
  );
}
