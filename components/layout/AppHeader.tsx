'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { GlossaryButton } from '@/components/designer/GlossaryModal';
import { useTooltipSettings } from '@/lib/contexts/TooltipSettingsContext';
import { useAppSettings } from '@/lib/contexts/AppSettingsContext';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
  onOpenSettings?: () => void;
  onOpenGlossary?: () => void;
  actions?: React.ReactNode;
}

export function AppHeader({
  title,
  showBackButton,
  backHref = '/dashboard',
  onOpenSettings,
  onOpenGlossary,
  actions,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { settings: tooltipSettings, toggleTooltips } = useTooltipSettings();
  const { settings: appSettings, updateSettings: updateAppSettings } = useAppSettings();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for settings (Ctrl+,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        onOpenGlossary?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSettings, onOpenGlossary]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Link
                href={backHref}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            )}
            {title && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Glossary Button */}
            {onOpenGlossary && (
              <GlossaryButton onClick={onOpenGlossary} />
            )}

            {/* Tooltip Toggle */}
            <button
              onClick={toggleTooltips}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                tooltipSettings.enabled
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title={`Tooltips ${tooltipSettings.enabled ? 'On' : 'Off'} (Ctrl+Shift+T)`}
            >
              <span>💬</span>
              <span className="hidden sm:inline">{tooltipSettings.enabled ? 'Tooltips On' : 'Tooltips Off'}</span>
            </button>

            {/* Custom Actions */}
            {actions}

            {/* Settings Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Quick Settings</p>
                  </div>

                  {/* Theme Toggle */}
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Theme</p>
                    <div className="flex gap-1">
                      {(['light', 'dark', 'system'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => updateAppSettings({ theme })}
                          className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                            appSettings.theme === theme
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️'} {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  {/* Menu Items */}
                  <MenuButton
                    icon="⚙️"
                    label="Settings"
                    shortcut="Ctrl+,"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings?.();
                    }}
                  />
                  <MenuButton
                    icon="📚"
                    label="Glossary"
                    shortcut="Ctrl+G"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenGlossary?.();
                    }}
                  />
                  <MenuButton
                    icon="💬"
                    label={tooltipSettings.enabled ? 'Disable Tooltips' : 'Enable Tooltips'}
                    shortcut="Ctrl+Shift+T"
                    onClick={() => {
                      toggleTooltips();
                      setMenuOpen(false);
                    }}
                  />

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  <MenuButton
                    icon="❓"
                    label="Help & Documentation"
                    onClick={() => {
                      setMenuOpen(false);
                      window.open('/docs', '_blank');
                    }}
                  />
                  <MenuButton
                    icon="🐛"
                    label="Report an Issue"
                    onClick={() => {
                      setMenuOpen(false);
                      window.open('https://github.com/your-repo/issues', '_blank');
                    }}
                  />

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      DAO Simulator v0.1.0
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuButton({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <span>{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{shortcut}</span>
      )}
    </button>
  );
}
