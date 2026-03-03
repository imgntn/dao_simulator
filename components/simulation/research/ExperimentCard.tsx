'use client';

import { useState } from 'react';
import type { ExperimentConfigSummary } from '@/lib/research/experiment-listing';

interface Props {
  experiment: ExperimentConfigSummary;
  onRun: (path: string) => void;
}

export function ExperimentCard({ experiment, onRun }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-200 truncate" title={experiment.name}>
        {experiment.name}
      </h3>
      {experiment.description && (
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{experiment.description}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {experiment.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-2 text-[10px] text-gray-600 space-y-0.5">
        {experiment.sweepParameter && (
          <p>Sweep: <span className="text-gray-400">{experiment.sweepParameter}</span></p>
        )}
        {experiment.sweepType && experiment.sweepType !== 'none' && (
          <p>Type: <span className="text-gray-400">{experiment.sweepType}</span></p>
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
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full px-3 py-1.5 text-xs font-medium rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Run
          </button>
        )}
      </div>
    </div>
  );
}
