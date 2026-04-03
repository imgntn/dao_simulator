'use client';

import { useState } from 'react';
import type { ExperimentConfigSummary } from '@/lib/research/experiment-listing';
import { PRETEXT_FONTS } from '@/lib/ui/pretext';
import { usePretextText } from '@/lib/ui/usePretextText';

interface Props {
  experiment: ExperimentConfigSummary;
  onRun: (path: string) => void;
}

export function ExperimentCard({ experiment, onRun }: Props) {
  const [confirming, setConfirming] = useState(false);
  const titleText = usePretextText<HTMLHeadingElement>({
    text: experiment.name,
    font: PRETEXT_FONTS.simSans14,
    lineHeight: 18,
    maxLines: 2,
  });
  const descriptionText = usePretextText<HTMLParagraphElement>({
    text: experiment.description ?? '',
    font: PRETEXT_FONTS.simSans12,
    lineHeight: 16,
    maxLines: 2,
  });

  return (
    <div className="rounded-lg border border-[var(--sim-border)] bg-[var(--sim-surface)] p-4 flex flex-col">
      <h3
        ref={titleText.ref}
        className={`text-sm font-semibold text-[var(--sim-text)] ${titleText.ready ? '' : 'truncate'}`}
        style={titleText.ready ? { whiteSpace: 'pre-line' } : undefined}
        title={titleText.truncated ? experiment.name : undefined}
      >
        {titleText.displayText}
      </h3>
      {experiment.description && (
        <p
          ref={descriptionText.ref}
          className={`mt-1 text-xs text-[var(--sim-text-muted)] ${descriptionText.ready ? '' : 'line-clamp-2'}`}
          style={descriptionText.ready ? { whiteSpace: 'pre-line' } : undefined}
          title={descriptionText.truncated ? experiment.description : undefined}
        >
          {descriptionText.displayText}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {experiment.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-[var(--sim-border)] text-[var(--sim-text-muted)] rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-2 text-[10px] text-[var(--sim-text-dim)] space-y-0.5">
        {experiment.sweepParameter && (
          <p>Sweep: <span className="text-[var(--sim-text-muted)]">{experiment.sweepParameter}</span></p>
        )}
        {experiment.sweepType && experiment.sweepType !== 'none' && (
          <p>Type: <span className="text-[var(--sim-text-muted)]">{experiment.sweepType}</span></p>
        )}
        <p>
          {experiment.runsPerConfig ?? '?'} runs
          {' / '}{experiment.stepsPerRun ?? '?'} steps
          {experiment.workers ? ` / ${experiment.workers}w` : ''}
        </p>
      </div>

      <div className="mt-auto pt-3">
        {confirming ? (
          <div className="flex gap-2">
            <button
              onClick={() => { onRun(experiment.path); setConfirming(false); }}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full px-3 py-1.5 text-xs font-medium rounded bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)] transition-colors"
          >
            Run
          </button>
        )}
      </div>
    </div>
  );
}
