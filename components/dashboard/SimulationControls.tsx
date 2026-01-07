'use client';

interface SimulationControlsProps {
  connected: boolean;
  running: boolean;
  stepsPerSecond: number;
  onStepsPerSecondChange: (value: number) => void;
  onStart: () => void;
  onStop: () => void;
  onStep: () => void;
  onReset: () => void;
}

export function SimulationControls({
  connected,
  running,
  stepsPerSecond,
  onStepsPerSecondChange,
  onStart,
  onStop,
  onStep,
  onReset,
}: SimulationControlsProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-300">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span className={`font-semibold ${running ? 'text-green-400' : 'text-orange-400'}`}>
          {running ? 'Running' : 'Paused'}
        </span>
        <span className="text-gray-500">|</span>
        <span>
          Speed:
          <select
            className="ml-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200"
            value={stepsPerSecond}
            onChange={(event) => onStepsPerSecondChange(Number(event.target.value))}
          >
            {[1, 2, 4, 8].map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onStart}
          className="px-5 py-3 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          disabled={!connected || running}
        >
          <span>Start (Space)</span>
        </button>
        <button
          onClick={onStop}
          className="px-5 py-3 text-base font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          disabled={!connected || !running}
        >
          <span>Stop</span>
        </button>
        <button
          onClick={onStep}
          className="px-5 py-3 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          disabled={!connected}
        >
          <span>Step (F)</span>
        </button>
        <button
          onClick={onReset}
          className="px-5 py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          disabled={!connected}
        >
          <span>Reset (R)</span>
        </button>
      </div>
    </div>
  );
}
