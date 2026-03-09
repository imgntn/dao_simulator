/**
 * Multi-Run Store
 *
 * Manages parallel simulation runs for computing mean, std, 95% CI.
 */

'use client';

import { create } from 'zustand';
import type { BrowserSimConfig } from './worker-protocol';

export interface RunResult {
  seed: number;
  treasury: number;
  tokenPrice: number;
  gini: number;
  participation: number;
  proposalsApproved: number;
  proposalsRejected: number;
  memberCount: number;
}

export interface MetricStats {
  mean: number;
  std: number;
  ci95Low: number;
  ci95High: number;
  values: number[];
}

export interface MultiRunState {
  running: boolean;
  totalRuns: number;
  completedRuns: number;
  results: RunResult[];
  stats: Record<string, MetricStats> | null;
  workers: Worker[];

  // Actions
  startRuns: (config: BrowserSimConfig, numRuns: number, calibrationProfiles: Record<string, unknown>, marketData: Record<string, unknown>) => void;
  cancelRuns: () => void;
  reset: () => void;
}

function computeStats(values: number[]): MetricStats {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, ci95Low: 0, ci95High: 0, values: [] };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);
  const se = std / Math.sqrt(n);
  const t = 1.96; // ~95% CI for normal
  return {
    mean,
    std,
    ci95Low: mean - t * se,
    ci95High: mean + t * se,
    values,
  };
}

export const useMultiRunStore = create<MultiRunState>((set, get) => ({
  running: false,
  totalRuns: 0,
  completedRuns: 0,
  results: [],
  stats: null,
  workers: [],

  startRuns: (config, numRuns, calibrationProfiles, marketData) => {
    const state = get();
    if (state.running) return;

    // Clean up any existing workers
    for (const w of state.workers) w.terminate();

    const results: RunResult[] = [];
    const workers: Worker[] = [];
    const baseSeed = config.seed ?? 42;

    set({
      running: true,
      totalRuns: numRuns,
      completedRuns: 0,
      results: [],
      stats: null,
      workers: [],
    });

    for (let i = 0; i < numRuns; i++) {
      const seed = baseSeed + i * 1000;
      const runConfig = { ...config, seed };

      const worker = new Worker(
        new URL('./simulation-worker.ts', import.meta.url),
        { type: 'module' }
      );
      workers.push(worker);

      let stepCount = 0;
      let lastSnapshot: RunResult | null = null;

      worker.onmessage = (event) => {
        const msg = event.data;

        if (msg.type === 'ready') {
          worker.postMessage({
            type: 'init',
            config: runConfig,
            calibrationProfiles,
            marketData,
          });
        } else if (msg.type === 'initialized') {
          worker.postMessage({ type: 'start' });
        } else if (msg.type === 'stepComplete') {
          stepCount++;
          lastSnapshot = {
            seed,
            treasury: msg.snapshot.treasuryFunds,
            tokenPrice: msg.snapshot.tokenPrice,
            gini: msg.snapshot.gini,
            participation: msg.snapshot.avgParticipationRate,
            proposalsApproved: msg.snapshot.proposalsApproved,
            proposalsRejected: msg.snapshot.proposalsRejected,
            memberCount: msg.snapshot.memberCount,
          };

          if (stepCount >= config.totalSteps) {
            // Run complete
            worker.postMessage({ type: 'dispose' });
            worker.terminate();

            if (lastSnapshot) {
              results.push(lastSnapshot);
            }

            const completed = results.length;
            set({ completedRuns: completed, results: [...results] });

            if (completed >= numRuns) {
              // All done — compute statistics
              const metricKeys: Array<{ key: keyof RunResult; label: string }> = [
                { key: 'treasury', label: 'Treasury' },
                { key: 'tokenPrice', label: 'Token Price' },
                { key: 'gini', label: 'Gini' },
                { key: 'participation', label: 'Participation' },
                { key: 'proposalsApproved', label: 'Approved' },
                { key: 'proposalsRejected', label: 'Rejected' },
                { key: 'memberCount', label: 'Members' },
              ];

              const stats: Record<string, MetricStats> = {};
              for (const { key, label } of metricKeys) {
                stats[label] = computeStats(results.map(r => r[key] as number));
              }

              set({ running: false, stats, workers: [] });
            }
          }
        } else if (msg.type === 'error') {
          console.error(`[MultiRun worker ${i}]`, msg.message);
        }
      };
    }

    set({ workers });
  },

  cancelRuns: () => {
    const { workers } = get();
    for (const w of workers) w.terminate();
    set({ running: false, workers: [], completedRuns: 0 });
  },

  reset: () => {
    const { workers } = get();
    for (const w of workers) w.terminate();
    set({
      running: false,
      totalRuns: 0,
      completedRuns: 0,
      results: [],
      stats: null,
      workers: [],
    });
  },
}));
