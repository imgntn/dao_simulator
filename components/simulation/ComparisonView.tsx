'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useComparisonStore } from '@/lib/browser/comparison-store';
import type { BrowserSimConfig } from '@/lib/browser/worker-protocol';

const DAO_DISPLAY_NAMES: Record<string, string> = {
  aave: 'Aave', arbitrum: 'Arbitrum', balancer: 'Balancer', compound: 'Compound',
  curve: 'Curve', dydx: 'dYdX', ens: 'ENS', gitcoin: 'Gitcoin', lido: 'Lido',
  maker_sky: 'MakerDAO / Sky', nouns: 'Nouns', optimism: 'Optimism',
  sushiswap: 'SushiSwap', uniswap: 'Uniswap',
};

const GOVERNANCE_RULES = [
  { value: '', label: 'Default' },
  { value: 'majority', label: 'Majority' },
  { value: 'supermajority', label: 'Supermajority' },
  { value: 'quadratic', label: 'Quadratic' },
  { value: 'conviction', label: 'Conviction' },
  { value: 'optimistic', label: 'Optimistic' },
  { value: 'instant-runoff', label: 'IRV' },
  { value: 'futarchy', label: 'Futarchy' },
];

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function MetricRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <div className="flex items-center text-xs">
      <span className="w-24 text-[var(--sim-text-muted)]">{label}</span>
      <span className="flex-1 text-right font-mono text-[var(--sim-text)]">{valueA}</span>
      <span className="w-8 text-center text-[var(--sim-text-dim)]">vs</span>
      <span className="flex-1 font-mono text-[var(--sim-text)]">{valueB}</span>
    </div>
  );
}

function DeltaIndicator({ a, b }: { a: number; b: number }) {
  if (a === 0 && b === 0) return <span className="text-[var(--sim-text-dim)]">—</span>;
  const diff = b - a;
  const pct = a !== 0 ? (diff / a) * 100 : diff > 0 ? 100 : -100;
  const color = diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-[var(--sim-text-dim)]';
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
  return <span className={`text-[10px] font-mono ${color}`}>{arrow} {Math.abs(pct).toFixed(1)}%</span>;
}

export function ComparisonView() {
  const mainStatus = useSimulationStore(s => s.status);
  const mainSnap = useSimulationStore(s => s.snapshot);
  const mainConfig = useSimulationStore(s => s.config);
  const mainAvailableDaos = useSimulationStore(s => s.availableDaos);
  const mainCalibrationProfiles = useSimulationStore(s => s.calibrationProfiles);
  const mainMarketData = useSimulationStore(s => s.marketData);
  const mainStart = useSimulationStore(s => s.start);
  const mainPause = useSimulationStore(s => s.pause);
  const mainStep = useSimulationStore(s => s.step);
  const mainReset = useSimulationStore(s => s.reset);

  const compStatus = useComparisonStore(s => s.status);
  const compSnap = useComparisonStore(s => s.snapshot);
  const compConfig = useComparisonStore(s => s.config);
  const compInitialize = useComparisonStore(s => s.initialize);
  const compStart = useComparisonStore(s => s.start);
  const compPause = useComparisonStore(s => s.pause);
  const compStep = useComparisonStore(s => s.step);
  const compReset = useComparisonStore(s => s.reset);
  const compDispose = useComparisonStore(s => s.dispose);
  const compInitialized = useRef(false);
  const mainConfigRef = useRef(mainConfig);

  useEffect(() => {
    mainConfigRef.current = mainConfig;
  }, [mainConfig]);

  // Initialize comparison worker with same data
  useEffect(() => {
    if (compInitialized.current) return;
    if (!mainCalibrationProfiles || !mainMarketData) return;
    compInitialized.current = true;

    const initialCompConfig: BrowserSimConfig = {
      ...mainConfigRef.current,
      // Default to a different DAO for comparison
      daoId: mainConfigRef.current.daoId === 'aave' ? 'uniswap' : 'aave',
    };

    compInitialize(initialCompConfig, mainCalibrationProfiles, mainMarketData);

    return () => {
      compDispose();
      compInitialized.current = false;
    };
  }, [mainCalibrationProfiles, mainMarketData, compInitialize, compDispose]);

  // Synced transport controls
  const syncedStart = useCallback(() => {
    mainStart();
    compStart();
  }, [mainStart, compStart]);

  const syncedPause = useCallback(() => {
    mainPause();
    compPause();
  }, [mainPause, compPause]);

  const syncedStep = useCallback(() => {
    mainStep();
    compStep();
  }, [mainStep, compStep]);

  const syncedReset = useCallback(() => {
    mainReset();
    compReset(compConfig);
  }, [mainReset, compReset, compConfig]);

  const isRunning = mainStatus === 'running' || compStatus === 'running';
  const canInteract = (mainStatus === 'running' || mainStatus === 'paused') &&
    (compStatus === 'running' || compStatus === 'paused');

  const handleCompDaoChange = useCallback((daoId: string) => {
    if (!mainCalibrationProfiles || !mainMarketData) return;
    const newConfig = { ...compConfig, daoId };
    compDispose();
    compInitialized.current = false;
    setTimeout(() => {
      compInitialize(newConfig, mainCalibrationProfiles, mainMarketData);
      compInitialized.current = true;
    }, 100);
  }, [compConfig, compDispose, compInitialize, mainCalibrationProfiles, mainMarketData]);

  const handleCompGovChange = useCallback((rule: string) => {
    if (!mainCalibrationProfiles || !mainMarketData) return;
    const newConfig = { ...compConfig, governanceRule: rule || undefined };
    compDispose();
    compInitialized.current = false;
    setTimeout(() => {
      compInitialize(newConfig, mainCalibrationProfiles, mainMarketData);
      compInitialized.current = true;
    }, 100);
  }, [compConfig, compDispose, compInitialize, mainCalibrationProfiles, mainMarketData]);

  return (
    <div className="flex flex-col h-full">
      {/* Synced Transport */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--sim-border)]">
        <button
          onClick={isRunning ? syncedPause : syncedStart}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white'
          }`}
        >
          {isRunning ? 'Pause Both' : 'Play Both'}
        </button>
        <button
          onClick={syncedStep}
          className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)]"
        >
          Step
        </button>
        <button
          onClick={syncedReset}
          disabled={!canInteract}
          className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] disabled:opacity-40"
        >
          Reset
        </button>
        <span className="ml-auto text-xs text-[var(--sim-text-muted)] font-mono">
          A: Step {mainSnap?.step ?? 0} | B: Step {compSnap?.step ?? 0}
        </span>
      </div>

      {/* Config selectors */}
      <div className="flex border-b border-[var(--sim-border)]">
        {/* Config A (Main — read only) */}
        <div className="flex-1 p-3 border-r border-[var(--sim-border)]">
          <div className="text-[10px] text-[var(--sim-accent)] uppercase tracking-wider font-semibold mb-1">Config A (Main)</div>
          <div className="text-xs text-[var(--sim-text-muted)]">
            {DAO_DISPLAY_NAMES[mainConfig.daoId] ?? mainConfig.daoId}
            {mainConfig.governanceRule ? ` · ${mainConfig.governanceRule}` : ' · default'}
          </div>
        </div>
        {/* Config B (Comparison — editable) */}
        <div className="flex-1 p-3">
          <div className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold mb-1">Config B (Compare)</div>
          <div className="flex gap-2">
            <select
              value={compConfig.daoId}
              onChange={e => handleCompDaoChange(e.target.value)}
              className="flex-1 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs focus:outline-none"
            >
              {mainAvailableDaos.map(id => (
                <option key={id} value={id}>{DAO_DISPLAY_NAMES[id] || id}</option>
              ))}
            </select>
            <select
              value={compConfig.governanceRule ?? ''}
              onChange={e => handleCompGovChange(e.target.value)}
              className="flex-1 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs focus:outline-none"
            >
              {GOVERNANCE_RULES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison metrics */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mainSnap && compSnap ? (
          <>
            <div className="flex items-center gap-2 text-[10px] text-[var(--sim-text-dim)] uppercase tracking-wider mb-2">
              <span className="flex-1 text-right text-[var(--sim-accent)]">Config A</span>
              <span className="w-8" />
              <span className="flex-1 text-purple-400">Config B</span>
            </div>

            <MetricRow
              label="Treasury"
              valueA={formatCompact(mainSnap.treasuryFunds)}
              valueB={formatCompact(compSnap.treasuryFunds)}
            />
            <div className="flex justify-end">
              <DeltaIndicator a={mainSnap.treasuryFunds} b={compSnap.treasuryFunds} />
            </div>

            <MetricRow
              label="Token Price"
              valueA={`$${mainSnap.tokenPrice.toFixed(2)}`}
              valueB={`$${compSnap.tokenPrice.toFixed(2)}`}
            />
            <div className="flex justify-end">
              <DeltaIndicator a={mainSnap.tokenPrice} b={compSnap.tokenPrice} />
            </div>

            <MetricRow
              label="Members"
              valueA={mainSnap.memberCount.toString()}
              valueB={compSnap.memberCount.toString()}
            />

            <MetricRow
              label="Proposals"
              valueA={mainSnap.proposalCount.toString()}
              valueB={compSnap.proposalCount.toString()}
            />

            <MetricRow
              label="Gini"
              valueA={mainSnap.gini.toFixed(3)}
              valueB={compSnap.gini.toFixed(3)}
            />
            <div className="flex justify-end">
              <DeltaIndicator a={mainSnap.gini} b={compSnap.gini} />
            </div>

            <MetricRow
              label="Participation"
              valueA={`${(mainSnap.avgParticipationRate * 100).toFixed(1)}%`}
              valueB={`${(compSnap.avgParticipationRate * 100).toFixed(1)}%`}
            />
            <div className="flex justify-end">
              <DeltaIndicator a={mainSnap.avgParticipationRate} b={compSnap.avgParticipationRate} />
            </div>

            <MetricRow
              label="Approved"
              valueA={mainSnap.proposalsApproved.toString()}
              valueB={compSnap.proposalsApproved.toString()}
            />

            <MetricRow
              label="Rejected"
              valueA={mainSnap.proposalsRejected.toString()}
              valueB={compSnap.proposalsRejected.toString()}
            />

            <MetricRow
              label="Forum Topics"
              valueA={mainSnap.forumTopics.toString()}
              valueB={compSnap.forumTopics.toString()}
            />
          </>
        ) : (
          <div className="text-center text-[var(--sim-text-muted)] text-sm py-8">
            Press Play Both to start comparison
          </div>
        )}
      </div>
    </div>
  );
}
