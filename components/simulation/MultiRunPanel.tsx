'use client';

import { useState, useCallback } from 'react';
import { useMultiRunStore } from '@/lib/browser/multi-run-store';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

const RUN_COUNTS = [3, 5, 10];

export function MultiRunPanel() {
  const { running, totalRuns, completedRuns, stats, startRuns, cancelRuns, reset: resetMulti } = useMultiRunStore();
  const { config, calibrationProfiles, marketData } = useSimulationStore();
  const [numRuns, setNumRuns] = useState(5);
  const { trackEvent } = useAnalytics();

  const handleStart = useCallback(() => {
    if (!calibrationProfiles || !marketData) return;
    startRuns(config, numRuns, calibrationProfiles as Record<string, unknown>, marketData as Record<string, unknown>);
    trackEvent(`${ANALYTICS_EVENTS.MULTI_RUN_STARTED}:${numRuns}`);
  }, [config, numRuns, calibrationProfiles, marketData, startRuns, trackEvent]);

  const progress = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--sim-text)]">Multi-Run Statistics</h3>
        {stats && (
          <button
            onClick={resetMulti}
            className="px-2 py-1 text-xs rounded bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-muted)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Controls */}
      {!running && !stats && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--sim-text-muted)]">Runs:</span>
            {RUN_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => setNumRuns(n)}
                className={`px-2 py-1 text-xs rounded ${
                  numRuns === n
                    ? 'bg-[var(--sim-accent-bold)] text-white'
                    : 'bg-[var(--sim-border)] text-[var(--sim-text-muted)] hover:bg-[var(--sim-surface-hover)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={handleStart}
            disabled={!calibrationProfiles}
            className="px-3 py-1.5 text-xs rounded bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white disabled:opacity-40"
          >
            Run {numRuns}&times;
          </button>
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--sim-text-muted)]">
            <span>Running {completedRuns}/{totalRuns}...</span>
            <button
              onClick={cancelRuns}
              className="text-red-400 hover:text-red-300"
            >
              Cancel
            </button>
          </div>
          <div className="h-1.5 bg-[var(--sim-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--sim-accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {stats && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(stats).map(([label, s]) => (
              <div
                key={label}
                className="flex items-center justify-between px-3 py-1.5 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded text-xs"
              >
                <span className="text-[var(--sim-text-muted)] w-24">{label}</span>
                <span className="font-mono text-[var(--sim-text)]">
                  {formatStat(s.mean)}
                </span>
                <span className="font-mono text-[var(--sim-text-muted)] text-[10px]">
                  &plusmn;{formatStat(s.std)}
                </span>
                <span className="font-mono text-[10px] text-[var(--sim-accent)]">
                  [{formatStat(s.ci95Low)}, {formatStat(s.ci95High)}]
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-[var(--sim-text-muted)] text-center">
            {totalRuns} runs, {config.totalSteps} steps each | 95% confidence intervals
          </div>
        </div>
      )}
    </div>
  );
}

function formatStat(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  if (Math.abs(v) < 1) return v.toFixed(3);
  return v.toFixed(1);
}
