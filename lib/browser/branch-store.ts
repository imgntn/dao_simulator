/**
 * Branch Store (Zustand)
 *
 * Manages "What-If" branching: fork from a point in the main simulation,
 * run a divergent worker, and compare metrics.
 */

'use client';

import { create } from 'zustand';
import type { SimulationSnapshot, BrowserSimConfig } from './worker-protocol';

export interface BranchState {
  active: boolean;
  forkStep: number;
  mainHistory: SimulationSnapshot[];
  branchHistory: SimulationSnapshot[];
  branchWorker: Worker | null;
  branchConfig: BrowserSimConfig | null;
  branchStatus: 'idle' | 'running' | 'paused';

  // Actions
  startBranch: (forkSnapshot: SimulationSnapshot, config: BrowserSimConfig, mainHistory: SimulationSnapshot[]) => void;
  closeBranch: () => void;
  playBranch: () => void;
  pauseBranch: () => void;
  stepBranch: () => void;
}

export const useBranchStore = create<BranchState>((set, get) => ({
  active: false,
  forkStep: 0,
  mainHistory: [],
  branchHistory: [],
  branchWorker: null,
  branchConfig: null,
  branchStatus: 'idle',

  startBranch: (forkSnapshot, config, mainHistory) => {
    const existing = get().branchWorker;
    if (existing) {
      existing.terminate();
    }

    // The branch just records the fork point and tracks the main sim's
    // continued history vs. the user's mental model of "what if".
    // For a full implementation, we'd spin up a second worker.
    // Here we set up the state for the BranchView to render.
    set({
      active: true,
      forkStep: forkSnapshot.step,
      mainHistory: mainHistory.filter(s => s.step >= forkSnapshot.step),
      branchHistory: [forkSnapshot],
      branchConfig: config,
      branchStatus: 'paused',
    });
  },

  closeBranch: () => {
    const { branchWorker } = get();
    if (branchWorker) {
      branchWorker.terminate();
    }
    set({
      active: false,
      forkStep: 0,
      mainHistory: [],
      branchHistory: [],
      branchWorker: null,
      branchConfig: null,
      branchStatus: 'idle',
    });
  },

  playBranch: () => {
    set({ branchStatus: 'running' });
  },

  pauseBranch: () => {
    set({ branchStatus: 'paused' });
  },

  stepBranch: () => {
    // Placeholder for stepping the branch worker
  },
}));
