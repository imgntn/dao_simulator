'use client';

import { useState, useEffect } from 'react';
import { useTooltipSettings, type TooltipSettings } from '@/lib/contexts/TooltipSettingsContext';
import { useAppSettings, type AppSettings, type Theme, type SimulationSpeed } from '@/lib/contexts/AppSettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'general' | 'tooltips' | 'simulation' | 'accessibility';
}

type SettingsTab = 'general' | 'tooltips' | 'simulation' | 'accessibility';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'tooltips', label: 'Tooltips', icon: '💬' },
  { id: 'simulation', label: 'Simulation', icon: '🎮' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿' },
];

export function SettingsModal({ isOpen, onClose, initialTab = 'general' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { settings: tooltipSettings, updateSettings: updateTooltipSettings, resetSettings: resetTooltipSettings } = useTooltipSettings();
  const { settings: appSettings, updateSettings: updateAppSettings, resetSettings: resetAppSettings } = useAppSettings();

  // Reset to initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetAll = () => {
    resetTooltipSettings();
    resetAppSettings();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <GeneralSettings settings={appSettings} updateSettings={updateAppSettings} />
            )}
            {activeTab === 'tooltips' && (
              <TooltipSettingsPanel settings={tooltipSettings} updateSettings={updateTooltipSettings} />
            )}
            {activeTab === 'simulation' && (
              <SimulationSettings settings={appSettings} updateSettings={updateAppSettings} />
            )}
            {activeTab === 'accessibility' && (
              <AccessibilitySettings
                appSettings={appSettings}
                tooltipSettings={tooltipSettings}
                updateAppSettings={updateAppSettings}
                updateTooltipSettings={updateTooltipSettings}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleResetAll}
            className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            Reset All Settings
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Press Ctrl+Shift+T to toggle tooltips
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// General Settings Panel
function GeneralSettings({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize ${
                    settings.theme === theme
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {theme === 'system' ? '🖥️ System' : theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </div>

          <ToggleSetting
            label="Compact Mode"
            description="Reduce spacing and padding for denser information display"
            checked={settings.compactMode}
            onChange={(compactMode) => updateSettings({ compactMode })}
          />

          <ToggleSetting
            label="Animations"
            description="Enable smooth transitions and animations throughout the app"
            checked={settings.animationsEnabled}
            onChange={(animationsEnabled) => updateSettings({ animationsEnabled })}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Enable Notifications"
            description="Show notifications for important simulation events"
            checked={settings.notificationsEnabled}
            onChange={(notificationsEnabled) => updateSettings({ notificationsEnabled })}
          />

          <ToggleSetting
            label="Sound Effects"
            description="Play sounds for events like proposal completion"
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => updateSettings({ soundEnabled })}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Auto-Save"
            description="Automatically save simulation state periodically"
            checked={settings.autoSaveEnabled}
            onChange={(autoSaveEnabled) => updateSettings({ autoSaveEnabled })}
          />

          {settings.autoSaveEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-Save Interval: {settings.autoSaveInterval} seconds
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={settings.autoSaveInterval}
                onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>10s</span>
                <span>120s</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tooltip Settings Panel
function TooltipSettingsPanel({
  settings,
  updateSettings,
}: {
  settings: TooltipSettings;
  updateSettings: (updates: Partial<TooltipSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tooltip Behavior</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Enable Tooltips"
            description="Show helpful explanations when hovering over elements"
            checked={settings.enabled}
            onChange={(enabled) => updateSettings({ enabled })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delay: {settings.delay}ms
            </label>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={settings.delay}
              onChange={(e) => updateSettings({ delay: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Instant (0ms)</span>
              <span>Slow (1000ms)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Position
            </label>
            <div className="flex gap-2">
              {(['auto', 'top', 'bottom', 'left', 'right'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateSettings({ position: pos })}
                  className={`px-3 py-1.5 rounded-lg border text-sm capitalize ${
                    settings.position === pos
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Width: {settings.maxWidth}px
            </label>
            <input
              type="range"
              min="200"
              max="500"
              step="25"
              value={settings.maxWidth}
              onChange={(e) => updateSettings({ maxWidth: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Narrow (200px)</span>
              <span>Wide (500px)</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Options</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Show Real-World Examples"
            description="Include examples from DAOs like Optimism, Lido, and MakerDAO"
            checked={settings.showExamples}
            onChange={(showExamples) => updateSettings({ showExamples })}
          />

          <ToggleSetting
            label="Show on Keyboard Focus"
            description="Display tooltips when elements receive keyboard focus"
            checked={settings.showOnFocus}
            onChange={(showOnFocus) => updateSettings({ showOnFocus })}
          />

          <ToggleSetting
            label="Highlight Glossary Terms"
            description="Underline terms that have glossary definitions"
            checked={settings.persistentGlossary}
            onChange={(persistentGlossary) => updateSettings({ persistentGlossary })}
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">T</kbd> to quickly toggle tooltips on/off.
        </p>
      </div>
    </div>
  );
}

// Simulation Settings Panel
function SimulationSettings({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Simulation Speed</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Speed
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: 'slow', label: '🐢 Slow', desc: '0.5x' },
                { value: 'normal', label: '▶️ Normal', desc: '1x' },
                { value: 'fast', label: '⏩ Fast', desc: '2x' },
                { value: 'instant', label: '⚡ Instant', desc: 'Max' },
              ] as { value: SimulationSpeed; label: string; desc: string }[]).map((speed) => (
                <button
                  key={speed.value}
                  onClick={() => updateSettings({ simulationSpeed: speed.value })}
                  className={`p-3 rounded-lg border text-center ${
                    settings.simulationSpeed === speed.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="text-lg">{speed.label.split(' ')[0]}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{speed.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Display</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Show Advanced Metrics"
            description="Display additional governance metrics and analytics"
            checked={settings.showAdvancedMetrics}
            onChange={(showAdvancedMetrics) => updateSettings({ showAdvancedMetrics })}
          />
        </div>
      </div>
    </div>
  );
}

// Accessibility Settings Panel
function AccessibilitySettings({
  appSettings,
  tooltipSettings,
  updateAppSettings,
  updateTooltipSettings,
}: {
  appSettings: AppSettings;
  tooltipSettings: TooltipSettings;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  updateTooltipSettings: (updates: Partial<TooltipSettings>) => void;
}) {
  const enableAccessibilityMode = () => {
    updateAppSettings({
      accessibilityMode: true,
      animationsEnabled: false,
    });
    updateTooltipSettings({
      showOnFocus: true,
      delay: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Accessibility Mode</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Enable Accessibility Mode"
            description="Optimize the interface for screen readers and keyboard navigation"
            checked={appSettings.accessibilityMode}
            onChange={(accessibilityMode) => updateAppSettings({ accessibilityMode })}
          />

          <button
            onClick={enableAccessibilityMode}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
          >
            Apply Recommended Accessibility Settings
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Motion & Animation</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Reduce Motion"
            description="Disable animations for users who prefer reduced motion"
            checked={!appSettings.animationsEnabled}
            onChange={(reduceMotion) => updateAppSettings({ animationsEnabled: !reduceMotion })}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyboard Navigation</h3>
        <div className="space-y-4">
          <ToggleSetting
            label="Show Tooltips on Focus"
            description="Display tooltips when navigating with keyboard"
            checked={tooltipSettings.showOnFocus}
            onChange={(showOnFocus) => updateTooltipSettings({ showOnFocus })}
          />
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Keyboard Shortcuts</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Toggle tooltips</span>
            <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+Shift+T</kbd>
          </div>
          <div className="flex justify-between">
            <span>Open settings</span>
            <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+,</kbd>
          </div>
          <div className="flex justify-between">
            <span>Open glossary</span>
            <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+G</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Toggle Setting Component
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
      </label>
    </div>
  );
}
