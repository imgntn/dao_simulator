'use client';

export type SimTab = 'interactive' | 'research' | 'compare';

interface TabBarProps {
  activeTab: SimTab;
  onTabChange: (tab: SimTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs: { id: SimTab; label: string }[] = [
    { id: 'interactive', label: 'Interactive' },
    { id: 'compare', label: 'Compare' },
    { id: 'research', label: 'Research' },
  ];

  return (
    <div className="flex px-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
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
