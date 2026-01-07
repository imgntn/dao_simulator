'use client';

export interface OpsLogEntry {
  label: string;
  value: string | number;
  step?: number;
  severity?: 'info' | 'warning' | 'incident' | 'critical';
}

interface OpsLogProps {
  entries: OpsLogEntry[];
  maxDisplay?: number;
}

export function OpsLog({ entries, maxDisplay = 12 }: OpsLogProps) {
  if (entries.length === 0) return null;

  const displayEntries = [...entries]
    .slice(-maxDisplay)
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

  return (
    <section className="w-full">
      <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Operations Log</h3>
          <span className="text-xs text-gray-400">
            Most recent {Math.min(entries.length, maxDisplay)} events
          </span>
        </div>
        <div className="space-y-2 text-sm text-gray-200 max-h-64 overflow-y-auto pr-1">
          {displayEntries.map((entry, idx) => (
            <div
              key={`${entry.label}-${idx}`}
              className={`flex items-center justify-between rounded border px-2 py-1 ${
                entry.severity === 'critical'
                  ? 'border-red-500 bg-red-900/40'
                  : entry.severity === 'incident'
                  ? 'border-amber-500 bg-amber-900/30'
                  : entry.severity === 'warning'
                  ? 'border-yellow-500 bg-yellow-900/30'
                  : 'border-gray-700 bg-gray-900/60'
              }`}
            >
              <div>
                <p className="text-[11px] text-gray-400">
                  {typeof entry.step === 'number' ? `Step ${entry.step}` : 'Event'}
                </p>
                <p className="font-semibold">{entry.label}</p>
              </div>
              <p className="text-xs text-gray-200 text-right max-w-xs truncate">
                {entry.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
