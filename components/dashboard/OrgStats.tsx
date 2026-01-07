'use client';

export interface OrgStatsData {
  totalRuns: number;
  totalSteps: number;
  peakTreasury: number;
  maxShocksInRun: number;
  wins: number;
  losses: number;
}

interface OrgStatsProps {
  stats: OrgStatsData | null;
}

export function OrgStats({ stats }: OrgStatsProps) {
  if (!stats) return null;

  const winRate = stats.totalRuns > 0
    ? `${Math.round((stats.wins / stats.totalRuns) * 100)}%`
    : 'N/A';

  return (
    <section className="w-full">
      <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Org History & KPIs</h3>
          <span className="text-xs text-gray-400">
            Total runs: {stats.totalRuns}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-200 mb-3">
          <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
            <p className="text-xs text-gray-400">Total steps simulated</p>
            <p className="text-lg font-semibold">
              {stats.totalSteps.toLocaleString('en-US')}
            </p>
          </div>
          <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
            <p className="text-xs text-gray-400">Peak treasury</p>
            <p className="text-lg font-semibold">
              {stats.peakTreasury.toLocaleString('en-US')}
            </p>
          </div>
          <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
            <p className="text-xs text-gray-400">Max shocks in a run</p>
            <p className="text-lg font-semibold">
              {stats.maxShocksInRun.toLocaleString('en-US')}
            </p>
          </div>
          <div className="p-3 rounded border border-gray-700 bg-gray-900/60">
            <p className="text-xs text-gray-400">Win rate</p>
            <p className="text-lg font-semibold">{winRate}</p>
          </div>
        </div>
        <div className="text-xs text-gray-300">
          <p className="font-semibold mb-1">Milestones</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              {stats.totalRuns > 0
                ? 'First simulation completed.'
                : 'Run at least one simulation.'}
            </li>
            <li>
              {stats.totalSteps >= 500
                ? 'Sustained operator: 500+ total steps.'
                : 'Reach 500 total simulated steps.'}
            </li>
            <li>
              {stats.peakTreasury >= 10_000
                ? 'Capitalized: treasury peaked above 10,000.'
                : 'Grow peak treasury above 10,000.'}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
