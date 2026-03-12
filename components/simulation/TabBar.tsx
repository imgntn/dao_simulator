'use client';

import type { SimMode } from '@/components/simulation/panels/panel-registry';
import { useLayoutStore } from '@/lib/browser/layout-store';

// Re-export for backwards compat
export type SimTab = SimMode;

interface TabBarProps {
  activeTab: SimTab;
  onTabChange: (tab: SimTab) => void;
}

const tabs: { id: SimTab; label: string }[] = [
  { id: 'interactive', label: 'Interactive' },
  { id: 'compare', label: 'Compare' },
  { id: 'branch', label: 'Branch' },
  { id: 'multirun', label: 'Multi-Run' },
  { id: 'research', label: 'Research' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const setMode = useLayoutStore(s => s.setMode);

  const handleTabChange = (tab: SimTab) => {
    onTabChange(tab);
    setMode(tab);
  };

  return (
    <div className="flex px-4 overflow-x-auto scrollbar-none -mb-px">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
            activeTab === tab.id
              ? 'text-[var(--sim-accent)]'
              : 'text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)]'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--sim-accent)]" />
          )}
        </button>
      ))}
    </div>
  );
}
