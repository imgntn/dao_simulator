/**
 * Branch Store (Zustand)
 *
 * Manages "What-If" branching: fork from a point in the main simulation,
 * mark the baseline state, and compare later trajectory.
 */

'use client';

import { create } from 'zustand';
import type { SimulationSnapshot, BrowserSimConfig } from './worker-protocol';

export interface BranchState {
  active: boolean;
  forkStep: number;
  mainHistory: SimulationSnapshot[];
  branchHistory: SimulationSnapshot[];
  branchConfig: BrowserSimConfig | null;

  // Actions
  startBranch: (forkSnapshot: SimulationSnapshot, config: BrowserSimConfig, mainHistory: SimulationSnapshot[]) => void;
  closeBranch: () => void;
}

export const useBranchStore = create<BranchState>((set) => ({
  active: false,
  forkStep: 0,
  mainHistory: [],
  branchHistory: [],
  branchConfig: null,

  startBranch: (forkSnapshot, config, mainHistory) => {
    set({
      active: true,
      forkStep: forkSnapshot.step,
      mainHistory: mainHistory.filter(s => s.step >= forkSnapshot.step),
      branchHistory: [forkSnapshot],
      branchConfig: config,
    });
  },

  closeBranch: () => {
    set({
      active: false,
      forkStep: 0,
      mainHistory: [],
      branchHistory: [],
      branchConfig: null,
    });
  },
}));
