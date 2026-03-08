'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useComparisonStore } from '@/lib/browser/comparison-store';
import type { SimulationSnapshot, BrowserSimConfig } from '@/lib/browser/worker-protocol';

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
  const mainStore = useSimulationStore();
  const compStore = useComparisonStore();
  const compInitialized = useRef(false);

  const mainSnap = mainStore.snapshot;
  const compSnap = compStore.snapshot;

  // Initialize comparison worker with same data
  useEffect(() => {
    if (compInitialized.current) return;
    if (!mainStore.calibrationProfiles || !mainStore.marketData) return;
    compInitialized.current = true;

    const compConfig: BrowserSimConfig = {
      ...mainStore.config,
      // Default to a different DAO for comparison
      daoId: mainStore.config.daoId === 'aave' ? 'uniswap' : 'aave',
    };

    compStore.initialize(compConfig, mainStore.calibrationProfiles, mainStore.marketData);

    return () => {
      compStore.dispose();
      compInitialized.current = false;
    };
  }, [mainStore.calibrationProfiles, mainStore.marketData]);

  // Synced transport controls
  const syncedStart = useCallback(() => {
    mainStore.start();
    compStore.start();
  }, []);

  const syncedPause = useCallback(() => {
    mainStore.pause();
    compStore.pause();
  }, []);

  const syncedStep = useCallback(() => {
    mainStore.step();
    compStore.step();
  }, []);

  const syncedReset = useCallback(() => {
    mainStore.reset();
    compStore.reset(compStore.config);
  }, []);

  const isRunning = mainStore.status === 'running' || compStore.status === 'running';
  const canInteract = (mainStore.status === 'running' || mainStore.status === 'paused') &&
    (compStore.status === 'running' || compStore.status === 'paused');

  const handleCompDaoChange = useCallback((daoId: string) => {
    if (!mainStore.calibrationProfiles || !mainStore.marketData) return;
    const newConfig = { ...compStore.config, daoId };
    compStore.dispose();
    compInitialized.current = false;
    setTimeout(() => {
      compStore.initialize(newConfig, mainStore.calibrationProfiles!, mainStore.marketData!);
      compInitialized.current = true;
    }, 100);
  }, [mainStore.calibrationProfiles, mainStore.marketData]);

  const handleCompGovChange = useCallback((rule: string) => {
    if (!mainStore.calibrationProfiles || !mainStore.marketData) return;
    const newConfig = { ...compStore.config, governanceRule: rule || undefined };
    compStore.dispose();
    compInitialized.current = false;
    setTimeout(() => {
      compStore.initialize(newConfig, mainStore.calibrationProfiles!, mainStore.marketData!);
      compInitialized.current = true;
    }, 100);
  }, [mainStore.calibrationProfiles, mainStore.marketData]);

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
            {DAO_DISPLAY_NAMES[mainStore.config.daoId] ?? mainStore.config.daoId}
            {mainStore.config.governanceRule ? ` · ${mainStore.config.governanceRule}` : ' · default'}
          </div>
        </div>
        {/* Config B (Comparison — editable) */}
        <div className="flex-1 p-3">
          <div className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold mb-1">Config B (Compare)</div>
          <div className="flex gap-2">
            <select
              value={compStore.config.daoId}
              onChange={e => handleCompDaoChange(e.target.value)}
              className="flex-1 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs focus:outline-none"
            >
              {mainStore.availableDaos.map(id => (
                <option key={id} value={id}>{DAO_DISPLAY_NAMES[id] || id}</option>
              ))}
            </select>
            <select
              value={compStore.config.governanceRule ?? ''}
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
