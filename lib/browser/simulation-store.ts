/**
 * Simulation Store (Zustand)
 *
 * Client-side state management for the browser simulation.
 * Manages Web Worker lifecycle, simulation snapshots, and history.
 */

'use client';

import { create } from 'zustand';
import type {
  SimulationSnapshot,
  BrowserSimConfig,
  WorkerOutMessage,
} from './worker-protocol';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';

// =============================================================================
// STATE TYPES
// =============================================================================

export type SimulationStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'error';

export interface Annotation {
  id: string;
  step: number;
  text: string;
}

export interface MetricAlert {
  id: string;
  metric: string;
  operator: '>' | '<';
  value: number;
  triggered: boolean;
}

export interface SimulationState {
  // Core state
  status: SimulationStatus;
  snapshot: SimulationSnapshot | null;
  history: SimulationSnapshot[];
  error: string | null;

  // Configuration
  config: BrowserSimConfig;
  selectedDao: string;
  availableDaos: string[];

  // Data
  calibrationProfiles: Record<string, CalibrationProfile> | null;
  marketData: Record<string, Array<{ step: number; price: number }>> | null;

  // Worker
  worker: Worker | null;

  // Config change tracking
  lastSentConfig: BrowserSimConfig | null;

  // Time-travel
  viewingStep: number | null;
  setViewingStep: (step: number | null) => void;

  // Camera navigation
  targetFloor: string | null;
  setTargetFloor: (floorId: string | null) => void;

  // Renderer info
  rendererType: 'webgpu' | 'webgl' | null;
  setRendererType: (type: 'webgpu' | 'webgl') => void;

  // Annotations
  annotations: Annotation[];
  addAnnotation: (step: number, text: string) => void;
  removeAnnotation: (id: string) => void;

  // Metric Alerts
  alerts: MetricAlert[];
  addAlert: (alert: Omit<MetricAlert, 'id' | 'triggered'>) => void;
  removeAlert: (id: string) => void;
  checkAlerts: (snapshot: SimulationSnapshot) => MetricAlert[];

  // Theme
  simTheme: 'dark' | 'light';
  setSimTheme: (theme: 'dark' | 'light') => void;

  // Actions
  initialize: (
    calibrationProfiles: Record<string, CalibrationProfile>,
    marketData: Record<string, Array<{ step: number; price: number }>>
  ) => void;
  start: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (stepsPerSecond: number) => void;
  selectDao: (daoId: string) => void;
  updateConfig: (config: Partial<BrowserSimConfig>) => void;
  dispose: () => void;
  injectConfig: (changes: Partial<BrowserSimConfig>) => void;
  injectAgent: (profile: { type: string; tokens: number; optimism: number; oppositionBias: number; name?: string }) => void;
  forkState: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_HISTORY_LENGTH = 500;

const DEFAULT_CONFIG: BrowserSimConfig = {
  daoId: 'aave',
  seed: 42,
  stepsPerSecond: 10,
  totalSteps: 720,
  forumEnabled: true,
  blackSwanEnabled: false,
  blackSwanFrequency: 2,
};

// =============================================================================
// STORE
// =============================================================================

export const useSimulationStore = create<SimulationState>((set, get) => ({
  // Initial state
  status: 'idle',
  snapshot: null,
  history: [],
  error: null,
  config: { ...DEFAULT_CONFIG },
  selectedDao: DEFAULT_CONFIG.daoId,
  availableDaos: [],
  calibrationProfiles: null,
  marketData: null,
  worker: null,
  lastSentConfig: null,
  viewingStep: null,
  targetFloor: null,
  rendererType: null,
  annotations: [],
  alerts: [],
  simTheme: 'dark',

  setViewingStep: (step) => set({ viewingStep: step }),
  setTargetFloor: (floorId) => set({ targetFloor: floorId }),
  setRendererType: (type) => set({ rendererType: type }),
  setSimTheme: (theme) => {
    set({ simTheme: theme });
    try { localStorage.setItem('sim-theme', theme); } catch { /* noop */ }
  },

  addAnnotation: (step, text) => {
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set(prev => ({
      annotations: [...prev.annotations, { id, step, text }].slice(-50),
    }));
  },
  removeAnnotation: (id) => {
    set(prev => ({
      annotations: prev.annotations.filter(a => a.id !== id),
    }));
  },

  addAlert: (alert) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set(prev => ({
      alerts: [...prev.alerts, { ...alert, id, triggered: false }],
    }));
  },
  removeAlert: (id) => {
    set(prev => ({
      alerts: prev.alerts.filter(a => a.id !== id),
    }));
  },
  checkAlerts: (snapshot) => {
    const triggered: MetricAlert[] = [];
    const metricValues: Record<string, number> = {
      Treasury: snapshot.treasuryFunds,
      'Token Price': snapshot.tokenPrice,
      Gini: snapshot.gini,
      Participation: snapshot.avgParticipationRate,
      Members: snapshot.memberCount,
      Proposals: snapshot.proposalCount,
    };

    set(prev => ({
      alerts: prev.alerts.map(alert => {
        if (alert.triggered) return alert;
        const val = metricValues[alert.metric];
        if (val === undefined) return alert;
        const shouldTrigger = alert.operator === '>' ? val > alert.value : val < alert.value;
        if (shouldTrigger) {
          triggered.push({ ...alert, triggered: true });
          return { ...alert, triggered: true };
        }
        return alert;
      }),
    }));
    return triggered;
  },

  initialize: (calibrationProfiles, marketData) => {
    const state = get();

    // Dispose existing worker if any
    if (state.worker) {
      state.worker.terminate();
    }

    const availableDaos = Object.keys(calibrationProfiles).sort();

    const currentConfig = get().config;
    set({
      status: 'initializing',
      calibrationProfiles,
      marketData,
      availableDaos,
      error: null,
      history: [],
      snapshot: null,
      lastSentConfig: { ...currentConfig },
    });

    // Create Web Worker
    const worker = new Worker(
      new URL('./simulation-worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'ready':
          // Worker is loaded, send init
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
            // Trim history to max length
            if (newHistory.length > MAX_HISTORY_LENGTH) {
              newHistory.splice(0, newHistory.length - MAX_HISTORY_LENGTH);
            }
            return {
              snapshot: msg.snapshot,
              history: newHistory,
            };
          });
          break;

        case 'error':
          set({ status: 'error', error: msg.message });
          console.error('[SimWorker]', msg.message, msg.stack);
          break;

        case 'forkedState':
          // Handled by branch-store listener externally
          break;

        case 'disposed':
          set({ status: 'idle', worker: null });
          break;
      }
    };

    worker.onerror = (event) => {
      set({ status: 'error', error: event.message });
      console.error('[SimWorker error]', event);
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
      // Pause first, then step
      worker.postMessage({ type: 'pause' });
      set({ status: 'paused' });
    }
    worker.postMessage({ type: 'step' });
  },

  reset: () => {
    const { worker, config, calibrationProfiles, marketData } = get();
    if (!worker || !calibrationProfiles || !marketData) return;

    set({ status: 'initializing', history: [], snapshot: null, error: null, lastSentConfig: { ...config }, viewingStep: null });
    worker.postMessage({ type: 'reset', config });
  },

  setSpeed: (stepsPerSecond: number) => {
    const { worker } = get();
    const clamped = Math.max(1, Math.min(60, stepsPerSecond));
    set(prev => ({ config: { ...prev.config, stepsPerSecond: clamped } }));
    if (worker) {
      worker.postMessage({ type: 'setSpeed', stepsPerSecond: clamped });
    }
  },

  selectDao: (daoId: string) => {
    const state = get();
    if (daoId === state.selectedDao) return;

    const newConfig = { ...state.config, daoId };
    set({ selectedDao: daoId, config: newConfig });

    // Reset simulation with new DAO
    if (state.worker && state.calibrationProfiles && state.marketData) {
      set({ status: 'initializing', history: [], snapshot: null, error: null, lastSentConfig: { ...newConfig }, viewingStep: null });
      state.worker.postMessage({ type: 'reset', config: newConfig });
    }
  },

  updateConfig: (partial: Partial<BrowserSimConfig>) => {
    set(prev => ({
      config: { ...prev.config, ...partial },
    }));
  },

  injectConfig: (changes) => {
    const { worker } = get();
    if (!worker) return;
    worker.postMessage({ type: 'injectConfig', changes });
    // Also update local config
    set(prev => ({ config: { ...prev.config, ...changes } }));
  },

  injectAgent: (profile) => {
    const { worker } = get();
    if (!worker) return;
    worker.postMessage({ type: 'injectAgent', profile });
  },

  forkState: () => {
    const { worker } = get();
    if (!worker) return;
    worker.postMessage({ type: 'forkState' });
  },

  dispose: () => {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'dispose' });
      worker.terminate();
    }
    set({
      status: 'idle',
      worker: null,
      snapshot: null,
      history: [],
      error: null,
    });
  },
}));
