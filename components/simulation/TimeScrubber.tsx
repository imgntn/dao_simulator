'use client';

import { useCallback } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';

export function TimeScrubber() {
  const history = useSimulationStore(s => s.history);
  const viewingStep = useSimulationStore(s => s.viewingStep);
  const setViewingStep = useSimulationStore(s => s.setViewingStep);
  const snapshot = useSimulationStore(s => s.snapshot);
  const status = useSimulationStore(s => s.status);
  const pause = useSimulationStore(s => s.pause);

  const isLive = viewingStep === null;
  const currentStep = viewingStep ?? snapshot?.step ?? 0;
  const minStep = history.length > 0 ? history[0].step : 0;
  const maxStep = history.length > 0 ? history[history.length - 1].step : 0;

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const step = parseInt(e.target.value);
      // Auto-pause when scrubbing
      if (status === 'running') {
        pause();
      }
      setViewingStep(step);
    },
    [status, pause, setViewingStep]
  );

  const goLive = useCallback(() => {
    setViewingStep(null);
  }, [setViewingStep]);

  if (history.length < 2) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--sim-bg)]/80 backdrop-blur-sm border-t border-[var(--sim-border)]">
      <button
        onClick={goLive}
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
          isLive
            ? 'bg-green-600/30 text-green-400 border border-green-500/50 animate-pulse'
            : 'text-[var(--sim-text-muted)] hover:text-green-400 border border-transparent hover:border-green-500/30'
        }`}
      >
        LIVE
      </button>
      <input
        type="range"
        min={minStep}
        max={maxStep}
        value={currentStep}
        onChange={handleScrub}
        className="flex-1 h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
      />
      <span className="text-[10px] font-mono text-[var(--sim-text-muted)] min-w-[5ch] text-right">
        {currentStep}
      </span>
    </div>
  );
}
