'use client';

import { useEffect } from 'react';
import { useSimulationStore } from './simulation-store';

export interface ShortcutCallbacks {
  onToggleHelp?: () => void;
  onToggleExport?: () => void;
  onNavigateFloor?: (floorIndex: number) => void;
}

const FLOOR_IDS = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5'];

/**
 * Keyboard shortcuts for the simulation page.
 * Skips when focus is on input/textarea/select.
 */
export function useKeyboardShortcuts(callbacks: ShortcutCallbacks = {}) {
  const start = useSimulationStore(s => s.start);
  const pause = useSimulationStore(s => s.pause);
  const step = useSimulationStore(s => s.step);
  const reset = useSimulationStore(s => s.reset);
  const status = useSimulationStore(s => s.status);
  const setViewingStep = useSimulationStore(s => s.setViewingStep);
  const setTargetFloor = useSimulationStore(s => s.setTargetFloor);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when in form fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (status === 'running') {
            pause();
          } else if (status === 'paused' || status === 'idle') {
            start();
          }
          break;

        case 'ArrowRight':
        case '.':
          e.preventDefault();
          step();
          break;

        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            reset();
          }
          break;

        case '1': case '2': case '3': case '4': case '5': case '6': {
          const idx = parseInt(e.key) - 1;
          if (idx >= 0 && idx < FLOOR_IDS.length) {
            e.preventDefault();
            setTargetFloor(FLOOR_IDS[idx]);
            callbacks.onNavigateFloor?.(idx);
          }
          break;
        }

        case 'Escape':
          e.preventDefault();
          // Clear time-travel
          setViewingStep(null);
          break;

        case 'e':
        case 'E':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            callbacks.onToggleExport?.();
          }
          break;

        case '?':
          e.preventDefault();
          callbacks.onToggleHelp?.();
          break;

        case 'l':
        case 'L':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setViewingStep(null); // Go to LIVE
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, start, pause, step, reset, setViewingStep, setTargetFloor, callbacks]);
}
