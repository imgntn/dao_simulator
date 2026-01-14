'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { messages as m } from '@/lib/i18n';

type TabId = 'overview' | '3d' | 'charts' | 'strategy' | 'reports';

interface NavSection {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  tab: TabId; // Which tab this section belongs to
}

const SECTIONS: NavSection[] = [
  { id: 'controls', label: 'Controls', icon: 'C', shortcut: 'C', tab: 'overview' },
  { id: 'token', label: 'Token', icon: 'T', shortcut: 'T', tab: 'overview' },
  { id: 'tower', label: m.panels.tower, icon: 'W', shortcut: 'W', tab: '3d' },
  { id: 'city', label: m.panels.city, icon: 'I', shortcut: 'I', tab: '3d' },
  { id: 'network', label: m.panels.network, icon: 'N', shortcut: 'N', tab: '3d' },
  { id: 'price', label: m.panels.price, icon: 'P', shortcut: 'P', tab: 'charts' },
  { id: 'heatmap', label: m.panels.heatmap, icon: 'H', shortcut: 'H', tab: 'charts' },
  { id: 'report', label: m.panels.daoReport, icon: 'R', shortcut: 'R', tab: 'reports' },
  { id: 'history', label: m.panels.runHistory, icon: 'Y', shortcut: 'Y', tab: 'reports' },
];

interface DashboardNavProps {
  activeSection?: string;
  onNavigate?: (sectionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  currentTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  sections?: NavSection[];
  showQuickJump?: boolean;
  quickJumpMode?: 'fixed' | 'inline';
  showSidebar?: boolean;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export function DashboardNav({
  activeSection,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  currentTab,
  onTabChange,
  sections,
  showQuickJump = false,
  quickJumpMode = 'fixed',
  showSidebar = true,
  scrollContainerRef,
}: DashboardNavProps) {
  const navSections = sections ?? SECTIONS;
  const [currentSection, setCurrentSection] = useState(activeSection || navSections[0]?.id || 'controls');
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
        const section = navSections.find(s => s.shortcut?.toLowerCase() === e.key.toLowerCase());
        if (section) {
          e.preventDefault();
          scrollToSection(section.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navSections]);

  // Track scroll position to highlight current section
  useEffect(() => {
    if (!navSections.length) return () => undefined;
    const handleScroll = () => {
      const container = scrollContainerRef?.current;
      const scrollTop = container ? container.scrollTop : window.scrollY;
      const scrollPosition = scrollTop + 150;

      for (const section of navSections) {
        const element = document.getElementById(`section-${section.id}`);
        if (element) {
          const offsetTop = container
            ? element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
            : element.offsetTop;
          const offsetHeight = element.offsetHeight;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setCurrentSection(section.id);
            break;
          }
        }
      }
    };

    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navSections, scrollContainerRef]);

  useEffect(() => {
    if (!currentTab) return;
    const section = navSections.find((navSection) => navSection.tab === currentTab);
    if (section) {
      setCurrentSection(section.id);
    }
  }, [currentTab, navSections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const section = navSections.find(s => s.id === sectionId);

    // Switch to the correct tab first if needed
    if (section && onTabChange && currentTab !== section.tab) {
      onTabChange(section.tab);
      // Wait for tab content to render before scrolling
      setTimeout(() => {
        const element = document.getElementById(`section-${sectionId}`);
        const container = scrollContainerRef?.current;
        if (!element) return;
        if (container) {
          const containerTop = container.getBoundingClientRect().top;
          const elementTop = element.getBoundingClientRect().top;
          const targetTop = elementTop - containerTop + container.scrollTop - 16;
          container.scrollTo({ top: targetTop, behavior: 'smooth' });
        } else {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      const element = document.getElementById(`section-${sectionId}`);
      if (element) {
        const container = scrollContainerRef?.current;
        if (container) {
          const containerTop = container.getBoundingClientRect().top;
          const elementTop = element.getBoundingClientRect().top;
          const targetTop = elementTop - containerTop + container.scrollTop - 16;
          container.scrollTo({ top: targetTop, behavior: 'smooth' });
        } else {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    setCurrentSection(sectionId);
    onNavigate?.(sectionId);
  }, [navSections, onNavigate, onTabChange, currentTab, scrollContainerRef]);

  const quickJumpClassName =
    quickJumpMode === 'inline'
      ? 'w-full bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-2 shrink-0'
      : 'fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-2';

  return (
    <>
      {/* Fixed Navigation Sidebar */}
      {showSidebar && (
        <nav
          className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 hidden md:block ${
            collapsed ? 'w-12' : 'w-14'
          }`}
        >
          <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-r-xl shadow-xl py-2">
            {/* Toggle button */}
            <button
              onClick={onToggleCollapse}
              className="w-full px-3 py-2 text-gray-400 hover:text-white transition-colors border-b border-gray-700 mb-1"
              title={collapsed ? m.a11y.expandNavigation : m.a11y.collapseNavigation}
            >
              {collapsed ? '>>' : '<<'}
            </button>

            {/* Navigation items */}
            <div className="space-y-1 px-1">
              {navSections.map((section) => (
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
      )}

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
              <h3 className="text-lg font-bold text-white">{m.shortcuts.title}</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <div className="border-b border-gray-700 pb-3">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">{m.shortcuts.simulation}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{m.shortcuts.startStop}</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">Space</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{m.shortcuts.step}</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{m.shortcuts.reset}</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-300">R</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">{m.shortcuts.navigation}</h4>
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
      {showQuickJump && (
        <div className={quickJumpClassName}>
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {navSections.map((section) => (
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
              {m.shortcuts.buttonLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardNav;
