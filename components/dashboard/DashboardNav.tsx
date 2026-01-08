'use client';

import { useState, useEffect, useCallback } from 'react';

interface NavSection {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
}

const SECTIONS: NavSection[] = [
  { id: 'controls', label: 'Controls', icon: '🎮', shortcut: 'C' },
  { id: 'token', label: 'Token', icon: '💰', shortcut: 'T' },
  { id: 'tower', label: 'Tower', icon: '🏢', shortcut: 'W' },
  { id: 'missions', label: 'Missions', icon: '🎯', shortcut: 'M' },
  { id: 'report', label: 'Report', icon: '📊', shortcut: 'R' },
  { id: 'price', label: 'Price', icon: '📈', shortcut: 'P' },
  { id: 'network', label: 'Network', icon: '🌐', shortcut: 'N' },
  { id: 'heatmap', label: 'Heatmap', icon: '🗺️', shortcut: 'H' },
  { id: 'history', label: 'History', icon: '📜', shortcut: 'Y' },
];

interface DashboardNavProps {
  activeSection?: string;
  onNavigate?: (sectionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DashboardNav({
  activeSection,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: DashboardNavProps) {
  const [currentSection, setCurrentSection] = useState(activeSection || 'controls');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Show shortcuts hint on ? key
      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
        return;
      }

      // Alt + key for navigation
      if (e.altKey) {
        const section = SECTIONS.find(s => s.shortcut?.toLowerCase() === e.key.toLowerCase());
        if (section) {
          e.preventDefault();
          scrollToSection(section.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track scroll position to highlight current section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      for (const section of SECTIONS) {
        const element = document.getElementById(`section-${section.id}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setCurrentSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(sectionId);
      onNavigate?.(sectionId);
    }
  }, [onNavigate]);

  return (
    <>
      {/* Fixed Navigation Sidebar */}
      <nav
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
          collapsed ? 'w-12' : 'w-14'
        }`}
      >
        <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-r-xl shadow-xl py-2">
          {/* Toggle button */}
          <button
            onClick={onToggleCollapse}
            className="w-full px-3 py-2 text-gray-400 hover:text-white transition-colors border-b border-gray-700 mb-1"
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? '→' : '←'}
          </button>

          {/* Navigation items */}
          <div className="space-y-1 px-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all
                  ${currentSection === section.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
                title={`${section.label}${section.shortcut ? ` (Alt+${section.shortcut})` : ''}`}
              >
                <span className="text-base">{section.icon}</span>
                {!collapsed && (
                  <span className="text-xs font-medium truncate">{section.label}</span>
                )}
              </button>
            ))}
          </div>

          {/* Shortcut hint */}
          <button
            onClick={() => setShowShortcuts(prev => !prev)}
            className="w-full px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors border-t border-gray-700 mt-1 text-xs"
            title="Show keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </nav>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="border-b border-gray-700 pb-3">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Simulation</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Start/Stop</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Step</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reset</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">R</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Navigation (Alt + Key)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {SECTIONS.filter(s => s.shortcut).map((section) => (
                    <div key={section.id} className="flex justify-between">
                      <span className="text-gray-400">{section.label}</span>
                      <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                        Alt+{section.shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">?</kbd> to toggle this menu
            </p>
          </div>
        </div>
      )}

      {/* Quick jump bar (top) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                  ${currentSection === section.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }
                `}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowShortcuts(true)}
            className="ml-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-300 bg-gray-800 rounded"
          >
            ⌘ Shortcuts
          </button>
        </div>
      </div>
    </>
  );
}

export default DashboardNav;
