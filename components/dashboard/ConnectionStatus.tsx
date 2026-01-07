'use client';

interface ConnectionStatusProps {
  connected: boolean;
  stepsPerSecond: number;
  strategyName?: string;
}

export function ConnectionStatus({ connected, stepsPerSecond, strategyName }: ConnectionStatusProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 shadow-lg flex flex-col justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Connection</p>
        <h3 className="text-lg font-semibold text-white">Socket.IO Status</h3>
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <div>
          <p className="text-sm text-gray-300">
            {connected ? 'Connected to simulation stream' : 'Disconnected'}
          </p>
          <p className="text-xs text-gray-500">Steps per second: {stepsPerSecond}x</p>
        </div>
      </div>
      <div className="text-xs text-gray-400 space-y-1">
        <p>Use Start/Stop to control the run. Reset clears local progress.</p>
        <p>Goals track this session only. Hotkeys: Space (start/stop), F (step), R (reset).</p>
        {strategyName && (
          <p className="text-emerald-300">Active strategy: {strategyName}</p>
        )}
      </div>
    </div>
  );
}
