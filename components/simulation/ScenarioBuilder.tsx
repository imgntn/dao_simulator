'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

const EVENT_CATEGORIES = [
  { value: 'exploit', label: 'Smart Contract Exploit', color: '#ef4444' },
  { value: 'regulatory', label: 'Regulatory Action', color: '#f97316' },
  { value: 'market_crash', label: 'Market Crash', color: '#eab308' },
  { value: 'whale_exit', label: 'Whale Exit', color: '#a855f7' },
  { value: 'defi_contagion', label: 'DeFi Contagion', color: '#ec4899' },
  { value: 'oracle_failure', label: 'Oracle Failure', color: '#06b6d4' },
];

export function ScenarioBuilder() {
  const config = useSimulationStore(s => s.config);
  const updateConfig = useSimulationStore(s => s.updateConfig);
  const { trackEvent } = useAnalytics();

  const totalSteps = config.totalSteps;
  const events = useMemo(() => config.scheduledBlackSwans ?? [], [config.scheduledBlackSwans]);

  // Add event form state
  const [newStep, setNewStep] = useState(Math.round(totalSteps / 2));
  const [newCategory, setNewCategory] = useState(EVENT_CATEGORIES[0].value);
  const [newSeverity, setNewSeverity] = useState(5);

  const addEvent = useCallback(() => {
    const updated = [...events, { step: newStep, category: newCategory, severity: newSeverity }];
    updated.sort((a, b) => a.step - b.step);
    updateConfig({ scheduledBlackSwans: updated, blackSwanEnabled: true });
    trackEvent(`${ANALYTICS_EVENTS.SCENARIO_EVENT_ADDED}:${newCategory}`);
  }, [events, newStep, newCategory, newSeverity, updateConfig, trackEvent]);

  const removeEvent = useCallback(
    (index: number) => {
      const updated = events.filter((_, i) => i !== index);
      updateConfig({ scheduledBlackSwans: updated.length > 0 ? updated : undefined });
    },
    [events, updateConfig]
  );

  const getCategoryInfo = (cat: string) =>
    EVENT_CATEGORIES.find(c => c.value === cat) ?? EVENT_CATEGORIES[0];

  return (
    <div className="px-4 pb-3 space-y-3">
      {/* Timeline visualization */}
      <div className="relative h-8 bg-[var(--sim-surface)] rounded border border-[var(--sim-border)]">
        {/* Step markers */}
        {events.map((evt, i) => {
          const left = (evt.step / totalSteps) * 100;
          const info = getCategoryInfo(evt.category);
          return (
            <button
              key={i}
              onClick={() => removeEvent(i)}
              className="absolute top-1 -translate-x-1/2 group"
              style={{ left: `${left}%` }}
              title={`${info.label} at step ${evt.step} (severity ${evt.severity}) — click to remove`}
            >
              <div
                className="w-3 h-5 rounded-sm group-hover:scale-125 transition-transform"
                style={{ backgroundColor: info.color, opacity: 0.4 + evt.severity * 0.06 }}
              />
            </button>
          );
        })}
        {/* Step labels */}
        <div className="absolute bottom-0 left-1 text-[8px] text-[var(--sim-text-dim)]">0</div>
        <div className="absolute bottom-0 right-1 text-[8px] text-[var(--sim-text-dim)]">{totalSteps}</div>
      </div>

      {/* Add Event Form */}
      <div className="space-y-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-[var(--sim-text-dim)] mb-0.5">Step</label>
            <input
              type="range"
              min={1}
              max={totalSteps - 1}
              value={newStep}
              onChange={e => setNewStep(parseInt(e.target.value))}
              className="w-full h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
            />
            <div className="text-[9px] text-[var(--sim-text-dim)] text-right font-mono">{newStep}</div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-[var(--sim-text-dim)] mb-0.5">Severity</label>
            <input
              type="range"
              min={1}
              max={10}
              value={newSeverity}
              onChange={e => setNewSeverity(parseInt(e.target.value))}
              className="w-full h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
            />
            <div className="text-[9px] text-[var(--sim-text-dim)] text-right font-mono">{newSeverity}/10</div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="flex-1 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs focus:border-[var(--sim-accent-ring)] focus:outline-none"
          >
            {EVENT_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={addEvent}
            className="px-3 py-1 rounded text-xs font-medium bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Event list */}
      {events.length > 0 && (
        <div className="space-y-1">
          {events.map((evt, i) => {
            const info = getCategoryInfo(evt.category);
            return (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-[var(--sim-text-muted)]"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: info.color }}
                />
                <span className="font-mono text-[var(--sim-text-dim)]">
                  @{evt.step}
                </span>
                <span className="truncate">{info.label}</span>
                <span className="text-[var(--sim-text-dim)]">
                  sev:{evt.severity}
                </span>
                <button
                  onClick={() => removeEvent(i)}
                  className="ml-auto text-[var(--sim-text-dim)] hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
