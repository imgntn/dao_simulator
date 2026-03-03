'use client';

import { useResearchStore } from '@/lib/browser/research-store';

export function RunningExperiments() {
  const { runningExperiments, results, setView } = useResearchStore();

  if (runningExperiments.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-cyan-800/40 bg-cyan-950/20 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-cyan-400" />
        <span className="text-xs font-medium text-cyan-400">
          {runningExperiments.length} experiment{runningExperiments.length > 1 ? 's' : ''} running
        </span>
      </div>
      <div className="space-y-2">
        {runningExperiments.map((exp, i) => {
          // Find matching result for progress
          const match = results.find(r => exp.path.includes(r.path) || r.path.includes(exp.path));
          const progress = match?.progress ?? null;
          const runs = match ? `${match.completedRuns ?? 0}/${match.totalRuns ?? '?'}` : null;

          return (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="text-gray-400 truncate flex-1" title={exp.path}>
                {exp.path.split('/').pop() ?? exp.path}
              </span>
              {progress !== null && (
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              )}
              {runs && <span className="text-gray-500 w-12 text-right">{runs}</span>}
              <button
                onClick={() => {
                  if (match) setView('results');
                }}
                className="text-cyan-400 hover:text-cyan-300"
              >
                View
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
