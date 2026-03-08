'use client';

import { create } from 'zustand';
import type {
  SimulationSnapshot,
  BrowserSimConfig,
  WorkerOutMessage,
} from './worker-protocol';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';

export type ComparisonStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'error';

export interface ComparisonState {
  status: ComparisonStatus;
  snapshot: SimulationSnapshot | null;
  history: SimulationSnapshot[];
  error: string | null;
  config: BrowserSimConfig;
  worker: Worker | null;

  initialize: (
    config: BrowserSimConfig,
    calibrationProfiles: Record<string, CalibrationProfile>,
    marketData: Record<string, Array<{ step: number; price: number }>>
  ) => void;
  start: () => void;
  pause: () => void;
  step: () => void;
  reset: (config: BrowserSimConfig) => void;
  updateConfig: (config: Partial<BrowserSimConfig>) => void;
  dispose: () => void;
}

const MAX_HISTORY = 500;

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  status: 'idle',
  snapshot: null,
  history: [],
  error: null,
  config: {
    daoId: 'aave',
    stepsPerSecond: 10,
    totalSteps: 720,
    seed: 42,
    forumEnabled: true,
    blackSwanEnabled: false,
  },
  worker: null,

  initialize: (config, calibrationProfiles, marketData) => {
    const state = get();
    if (state.worker) state.worker.terminate();

    set({ status: 'initializing', config, history: [], snapshot: null, error: null });

    const worker = new Worker(
      new URL('./simulation-worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'ready':
          worker.postMessage({
            type: 'init',
            config: get().config,
            calibrationProfiles,
            marketData,
          });
          break;
        case 'initialized':
          set({ status: 'paused' });
          break;
        case 'stepComplete':
          set(prev => {
            const newHistory = [...prev.history, msg.snapshot];
            if (newHistory.length > MAX_HISTORY) {
              newHistory.splice(0, newHistory.length - MAX_HISTORY);
            }
            return { snapshot: msg.snapshot, history: newHistory };
          });
          break;
        case 'error':
          set({ status: 'error', error: msg.message });
          break;
        case 'disposed':
          set({ status: 'idle', worker: null });
          break;
      }
    };

    worker.onerror = (event) => {
      set({ status: 'error', error: event.message });
    };

    set({ worker });
  },

  start: () => {
    const { worker, status } = get();
    if (!worker || (status !== 'paused' && status !== 'idle')) return;
    worker.postMessage({ type: 'start' });
    set({ status: 'running' });
  },

  pause: () => {
    const { worker, status } = get();
    if (!worker || status !== 'running') return;
    worker.postMessage({ type: 'pause' });
    set({ status: 'paused' });
  },

  step: () => {
    const { worker, status } = get();
    if (!worker || status === 'initializing') return;
    if (status === 'running') {
      worker.postMessage({ type: 'pause' });
      set({ status: 'paused' });
    }
    worker.postMessage({ type: 'step' });
  },

  reset: (config) => {
    const { worker } = get();
    if (!worker) return;
    set({ status: 'initializing', history: [], snapshot: null, error: null, config });
    worker.postMessage({ type: 'reset', config });
  },

  updateConfig: (partial) => {
    set(prev => ({ config: { ...prev.config, ...partial } }));
  },

  dispose: () => {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'dispose' });
      worker.terminate();
    }
    set({ status: 'idle', worker: null, snapshot: null, history: [], error: null });
  },
}));
