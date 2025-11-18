type MissionSummary = { id: string; title: string; achieved: boolean; currentLabel: string; targetLabel: string };
type LogEntry = {
  label: string;
  value: string | number;
  step?: number;
  severity?: 'info' | 'warning' | 'incident' | 'critical';
};

interface RunSummaryModalProps {
  open: boolean;
  outcome: 'won' | 'lost';
  steps: number;
  treasury: number;
  seed?: number | string;
  preset?: string;
  strategyName?: string;
  outcomeCause?: string;
  missions?: MissionSummary[];
  log?: LogEntry[];
  onRetry: () => void;
  onClose: () => void;
}

export function RunSummaryModal({
  open,
  outcome,
  steps,
  treasury,
  seed,
  preset,
  strategyName,
  outcomeCause,
  missions = [],
  log = [],
  onRetry,
  onClose,
}: RunSummaryModalProps) {
  if (!open) return null;

  const score = Math.max(0, Math.round(treasury + steps * 2));
  const tone = outcome === 'won' ? 'text-green-300' : 'text-red-300';

  const title =
    outcome === 'won'
      ? outcomeCause === 'missions_completed'
        ? 'Objectives achieved'
        : 'Run complete'
      : outcomeCause === 'treasury_insolvency'
      ? 'Run ended – treasury insolvent'
      : outcomeCause === 'price_collapse'
      ? 'Run ended – token price collapse'
      : outcomeCause === 'governance_backlog'
      ? 'Run ended – governance backlog'
      : 'Run ended';

  const subtitle =
    outcome === 'won'
      ? 'All key objectives were met without breaching failure thresholds.'
      : outcomeCause === 'treasury_insolvency'
      ? 'Treasury resources were exhausted; the organization could no longer operate within its constraints.'
      : outcomeCause === 'price_collapse'
      ? 'Token price fell below the minimum health threshold, triggering an operational shutdown.'
      : outcomeCause === 'governance_backlog'
      ? 'Governance throughput could not keep up with demand, and the backlog became unmanageable.'
      : 'One or more health thresholds were breached during this run.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-700 bg-gray-900/95 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">{outcome.toUpperCase()}</p>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tone}`}>
            Score: {score.toLocaleString('en-US')}
          </span>
        </div>

        <p className="text-xs text-gray-400">{subtitle}</p>

        <div className="grid grid-cols-2 gap-3 text-sm text-gray-200">
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">Steps</p>
            <p className="text-lg font-semibold">{steps}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">Treasury</p>
            <p className="text-lg font-semibold">{treasury.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">Preset</p>
            <p className="text-lg font-semibold">{preset ?? 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">Seed</p>
            <p className="text-lg font-semibold">{seed ?? 'N/A'}</p>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
            <p className="text-xs text-gray-400">Strategy</p>
            <p className="text-lg font-semibold">{strategyName ?? 'Baseline'}</p>
          </div>
          {outcomeCause && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
              <p className="text-xs text-gray-400">Outcome</p>
              <p className="text-sm font-semibold capitalize">
                {outcomeCause.replace(/_/g, ' ')}
              </p>
            </div>
          )}
        </div>

        {missions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Missions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {missions.map((mission) => (
                <div key={mission.id} className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-sm text-gray-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{mission.title}</p>
                    <p className="text-xs text-gray-400">{mission.currentLabel} / {mission.targetLabel}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${mission.achieved ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                    {mission.achieved ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {log.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Timeline</p>
            <div className="space-y-2 text-sm text-gray-200 max-h-64 overflow-y-auto pr-1">
              {[...log]
                .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
                .map((entry, idx) => (
                  <div
                    key={`${entry.label}-${idx}`}
                    className={`rounded border p-2 flex items-center justify-between ${
                      entry.severity === 'critical'
                        ? 'border-red-500 bg-red-900/40'
                        : entry.severity === 'incident'
                        ? 'border-amber-500 bg-amber-900/30'
                        : entry.severity === 'warning'
                        ? 'border-yellow-500 bg-yellow-900/30'
                        : 'border-gray-700 bg-gray-800/60'
                    }`}
                  >
                    <div>
                      <p className="text-xs text-gray-400">{typeof entry.step === 'number' ? `Step ${entry.step}` : 'Event'}</p>
                      <p className="font-semibold">{entry.label}</p>
                    </div>
                    <p className="text-right text-gray-200">{entry.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 hover:border-gray-500 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Retry with same preset
          </button>
        </div>
      </div>
    </div>
  );
}
