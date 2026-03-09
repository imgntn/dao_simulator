/**
 * Tutorial Store
 *
 * Manages the guided tutorial state for the simulation page.
 */

'use client';

import { create } from 'zustand';

export interface TutorialStep {
  title: string;
  description: string;
  targetSelector: string | null; // CSS selector for spotlight, null = center screen
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to DAO Simulator',
    description: 'This interactive 3D simulator lets you explore how decentralized organizations work. Let\'s take a quick tour of the key features.',
    targetSelector: null,
    position: 'bottom',
  },
  {
    title: 'Play Controls',
    description: 'Use Play/Pause to start the simulation, Step to advance one tick at a time, and Reset to start over. Adjust the speed slider to run faster or slower.',
    targetSelector: '[data-tutorial="transport"]',
    position: 'left',
  },
  {
    title: '3D Scene',
    description: 'The skyscraper represents your DAO. Each floor houses different agent types. Hover over agents to see their stats, click to pin details. Orbit and zoom with mouse drag and scroll.',
    targetSelector: 'canvas',
    position: 'right',
  },
  {
    title: 'Sidebar Controls',
    description: 'Choose a DAO preset (Uniswap, Aave, etc.), change governance rules, toggle the forum and black swan events. Adjust agent counts to customize your simulation.',
    targetSelector: '[data-tutorial="controls"]',
    position: 'left',
  },
  {
    title: 'Metrics Dashboard',
    description: 'Monitor treasury, token price, Gini coefficient, participation, and more. Each card has a sparkline showing recent trends. Toggle "Trends" for regression overlays.',
    targetSelector: '[data-tutorial="metrics"]',
    position: 'left',
  },
  {
    title: 'Timeline & Events',
    description: 'The time scrubber at the bottom lets you travel back in time. Click LIVE to return to the present. Double-click the timeline to add annotations. The event feed shows real-time activity.',
    targetSelector: '[data-tutorial="timeline"]',
    position: 'top',
  },
  {
    title: 'Advanced Features',
    description: 'Explore tabs for Compare mode (split-screen A/B testing), Research (batch experiments), and Branch view (what-if analysis). Use Export to download data, and keyboard shortcuts (press ? for help).',
    targetSelector: null,
    position: 'bottom',
  },
];

export interface TutorialState {
  active: boolean;
  currentStep: number;
  steps: TutorialStep[];
  completed: boolean;

  // Actions
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
}

const STORAGE_KEY = 'sim-tutorial-complete';

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: false,
  currentStep: 0,
  steps: TUTORIAL_STEPS,
  completed: typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true',

  start: () => {
    set({ active: true, currentStep: 0 });
  },

  next: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().finish();
    }
  },

  prev: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skip: () => {
    get().finish();
  },

  finish: () => {
    set({ active: false, currentStep: 0, completed: true });
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* noop */ }
  },
}));
