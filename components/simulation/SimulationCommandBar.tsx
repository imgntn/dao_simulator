'use client';

import { useSimulationStore } from '@/lib/browser/simulation-store';
import { ExportButton } from './ExportButton';

interface SimulationCommandBarProps {
  onOpenWizard: () => void;
}

function money(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '--';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function SimulationCommandBar({ onOpenWizard }: SimulationCommandBarProps) {
  const status = useSimulationStore(s => s.status);
  const snapshot = useSimulationStore(s => s.snapshot);
  const config = useSimulationStore(s => s.config);
  const start = useSimulationStore(s => s.start);
  const pause = useSimulationStore(s => s.pause);
  const step = useSimulationStore(s => s.step);
  const reset = useSimulationStore(s => s.reset);
  const setSpeed = useSimulationStore(s => s.setSpeed);
  const forkState = useSimulationStore(s => s.forkState);

  const isRunning = status === 'running';
  const canRun = status === 'paused' || status === 'running';
  const currentStep = snapshot?.step ?? 0;

  return (
    <div
      className="flex min-h-[42px] items-center gap-2 border-b px-3 text-xs"
      style={{
        background: 'rgba(6,4,18,0.94)',
        borderColor: 'rgba(196,144,32,0.22)',
      }}
      data-ui-interactive
    >
      <button
        type="button"
        onClick={() => (isRunning ? pause() : start())}
        disabled={!canRun}
        data-testid="command-play"
        className="h-7 min-w-[4.5rem] rounded border px-3 font-semibold text-[var(--sim-text-secondary)] disabled:opacity-40"
        style={{ borderColor: 'var(--sim-border)', background: 'var(--sim-surface)' }}
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        onClick={step}
        disabled={status === 'initializing'}
        data-testid="command-step"
        className="h-7 rounded border px-2.5 text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] disabled:opacity-40"
        style={{ borderColor: 'var(--sim-border)' }}
      >
        Step
      </button>
      <button
        type="button"
        onClick={reset}
        data-testid="command-reset"
        className="h-7 rounded border px-2.5 text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)]"
        style={{ borderColor: 'var(--sim-border)' }}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={forkState}
        disabled={!snapshot}
        className="h-7 rounded border px-2.5 text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] disabled:opacity-40"
        style={{ borderColor: 'var(--sim-border)' }}
      >
        Fork
      </button>
      <button
        type="button"
        onClick={onOpenWizard}
        data-testid="command-presets"
        className="h-7 rounded border px-2.5 text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)]"
        style={{ borderColor: 'var(--sim-border)' }}
      >
        Presets
      </button>

      <div className="mx-1 h-6 w-px bg-[var(--sim-border)] opacity-70" />

      <label className="hidden items-center gap-2 text-[var(--sim-text-muted)] md:flex">
        <span className="uppercase tracking-wider">Speed</span>
        <input
          type="range"
          min={1}
          max={60}
          value={config.stepsPerSecond}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-28"
          style={{ accentColor: 'var(--sim-accent)' }}
        />
        <span className="w-8 tabular-nums text-[var(--sim-text-secondary)]">{config.stepsPerSecond}x</span>
      </label>

      <div className="ml-auto flex min-w-0 items-center gap-2 text-[11px] text-[var(--sim-text-muted)]">
        <span className="hidden rounded border px-2 py-1 tabular-nums sm:inline" style={{ borderColor: 'var(--sim-border)' }}>
          s{currentStep}
        </span>
        <span className="hidden rounded border px-2 py-1 tabular-nums lg:inline" style={{ borderColor: 'var(--sim-border)' }}>
          Token ${snapshot?.tokenPrice?.toFixed(2) ?? '--'}
        </span>
        <span className="hidden rounded border px-2 py-1 tabular-nums xl:inline" style={{ borderColor: 'var(--sim-border)' }}>
          Treasury {money(snapshot?.treasuryFunds)}
        </span>
        <ExportButton />
      </div>
    </div>
  );
}
