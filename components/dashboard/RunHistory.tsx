'use client';

export interface RunHistoryEntry {
  id: string;
  preset: string;
  steps: number;
  treasury: number;
  score: number;
  seed: string | number;
  when: string;
  outcome?: 'won' | 'lost';
  cause?: string;
  strategy?: string;
}

interface RunHistoryProps {
  entries: RunHistoryEntry[];
}

export function RunHistory({ entries }: RunHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <section className="w-full">
      <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Run History (session)</h3>
          <span className="text-xs text-gray-400">Last {entries.length} runs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-200">
          {entries.map((run) => (
            <div key={run.id} className="p-3 rounded border border-gray-700 bg-gray-900/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">
                  {run.preset}
                  {run.strategy ? ` + ${run.strategy}` : ''}
                </span>
                <span className="text-xs text-gray-500">{run.when}</span>
              </div>
              <p className="text-gray-300">Steps: {run.steps}</p>
              <p className="text-gray-300">Treasury: {run.treasury}</p>
              <p className="text-gray-400 text-xs">Score: {run.score}</p>
              {run.outcome && (
                <p className="text-gray-400 text-xs">
                  Outcome: {run.outcome === 'won' ? 'Objectives met' : 'Run ended'}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-white mb-2">Leaderboard (session)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-200">
            {entries
              .slice()
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
              .slice(0, 5)
              .map((run, idx) => (
                <div
                  key={`${run.id}-lb`}
                  className="p-3 rounded border border-gray-700 bg-gray-900/70 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs text-gray-400">#{idx + 1} - {run.when}</p>
                    <p className="font-semibold">{run.preset}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-300">Score {run.score}</p>
                    <p className="text-xs text-gray-400">Steps {run.steps}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
