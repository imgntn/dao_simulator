'use client';

import { create } from 'zustand';
import type { ExperimentConfigSummary, ResultSummary } from '../research/experiment-listing';

export type ResearchView = 'list' | 'custom' | 'results' | 'detail';

interface RunningExperiment {
  path: string;
  pid: number | null;
  logFile: string | null;
  startedAt: string;
}

interface ResultDetail {
  status: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
}

export interface ResearchState {
  experiments: ExperimentConfigSummary[];
  results: ResultSummary[];
  selectedResult: ResultDetail | null;
  view: ResearchView;
  selectedResultPath: string | null;
  runningExperiments: RunningExperiment[];
  loading: { experiments: boolean; results: boolean; detail: boolean };
  error: string | null;

  fetchExperiments: () => Promise<void>;
  fetchResults: () => Promise<void>;
  fetchResultDetail: (resultPath: string) => Promise<void>;
  launchExperiment: (configPath: string) => Promise<void>;
  launchCustomSweep: (config: Record<string, unknown>) => Promise<void>;
  setView: (view: ResearchView) => void;
  clearError: () => void;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

function startPolling(get: () => ResearchState) {
  if (pollInterval) return;
  pollInterval = setInterval(() => {
    const state = get();
    if (state.runningExperiments.length === 0) {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      return;
    }
    state.fetchResults();
  }, 5000);
}

export const useResearchStore = create<ResearchState>((set, get) => ({
  experiments: [],
  results: [],
  selectedResult: null,
  view: 'list',
  selectedResultPath: null,
  runningExperiments: [],
  loading: { experiments: false, results: false, detail: false },
  error: null,

  fetchExperiments: async () => {
    set(s => ({ loading: { ...s.loading, experiments: true }, error: null }));
    try {
      const res = await fetch('/api/research/experiments');
      if (!res.ok) throw new Error(`Failed to fetch experiments: ${res.status}`);
      const data = await res.json();
      set(s => ({
        experiments: data.experiments ?? [],
        loading: { ...s.loading, experiments: false },
      }));
    } catch (err) {
      set(s => ({
        error: err instanceof Error ? err.message : 'Failed to fetch experiments',
        loading: { ...s.loading, experiments: false },
      }));
    }
  },

  fetchResults: async () => {
    set(s => ({ loading: { ...s.loading, results: true } }));
    try {
      const res = await fetch('/api/research/results');
      if (!res.ok) throw new Error(`Failed to fetch results: ${res.status}`);
      const data = await res.json();
      const results: ResultSummary[] = data.results ?? [];
      set(s => ({
        results,
        loading: { ...s.loading, results: false },
      }));

      // Check if any running experiments have completed
      const { runningExperiments } = get();
      if (runningExperiments.length > 0) {
        const runningPaths = new Set(results.filter(r => r.state === 'running').map(r => r.path));
        const stillRunning = runningExperiments.filter(e => {
          // If we can find a matching running result, keep it
          return runningPaths.has(e.path) || results.every(r => !r.path.includes(e.path));
        });
        if (stillRunning.length !== runningExperiments.length) {
          set({ runningExperiments: stillRunning });
        }
      }
    } catch (err) {
      set(s => ({
        error: err instanceof Error ? err.message : 'Failed to fetch results',
        loading: { ...s.loading, results: false },
      }));
    }
  },

  fetchResultDetail: async (resultPath: string) => {
    set(s => ({
      loading: { ...s.loading, detail: true },
      selectedResultPath: resultPath,
      view: 'detail',
      error: null,
    }));
    try {
      const res = await fetch(`/api/research/results/${resultPath}`);
      if (!res.ok) throw new Error(`Failed to fetch result detail: ${res.status}`);
      const data = await res.json();
      set(s => ({
        selectedResult: data,
        loading: { ...s.loading, detail: false },
      }));
    } catch (err) {
      set(s => ({
        error: err instanceof Error ? err.message : 'Failed to fetch result detail',
        loading: { ...s.loading, detail: false },
      }));
    }
  },

  launchExperiment: async (configPath: string) => {
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', configPath }),
      });
      if (!res.ok) throw new Error(`Failed to launch experiment: ${res.status}`);
      const data = await res.json();
      set(s => ({
        runningExperiments: [
          ...s.runningExperiments,
          {
            path: data.target ?? configPath,
            pid: data.pid ?? null,
            logFile: data.logFile ?? null,
            startedAt: new Date().toISOString(),
          },
        ],
      }));
      startPolling(get);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to launch experiment',
      });
    }
  },

  launchCustomSweep: async (config: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-custom', inlineConfig: config }),
      });
      if (!res.ok) throw new Error(`Failed to launch custom sweep: ${res.status}`);
      const data = await res.json();
      set(s => ({
        runningExperiments: [
          ...s.runningExperiments,
          {
            path: data.target ?? 'custom',
            pid: data.pid ?? null,
            logFile: data.logFile ?? null,
            startedAt: new Date().toISOString(),
          },
        ],
        view: 'results',
      }));
      startPolling(get);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to launch custom sweep',
      });
    }
  },

  setView: (view: ResearchView) => set({ view }),

  clearError: () => set({ error: null }),
}));
