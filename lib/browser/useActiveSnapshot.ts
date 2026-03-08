'use client';

import { useSimulationStore } from './simulation-store';
import type { SimulationSnapshot } from './worker-protocol';

/**
 * Returns the active snapshot — either the time-travel snapshot (if scrubbing)
 * or the live snapshot.
 */
export function useActiveSnapshot(): SimulationSnapshot | null {
  const viewingStep = useSimulationStore(s => s.viewingStep);
  const snapshot = useSimulationStore(s => s.snapshot);
  const history = useSimulationStore(s => s.history);

  if (viewingStep === null) return snapshot;
  return history.find(h => h.step === viewingStep) ?? snapshot;
}
