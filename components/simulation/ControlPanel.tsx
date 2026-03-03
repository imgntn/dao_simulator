'use client';

import { useSimulationStore } from '@/lib/browser/simulation-store';

const DAO_DISPLAY_NAMES: Record<string, string> = {
  aave: 'Aave',
  arbitrum: 'Arbitrum',
  balancer: 'Balancer',
  compound: 'Compound',
  curve: 'Curve',
  dydx: 'dYdX',
  ens: 'ENS',
  gitcoin: 'Gitcoin',
  lido: 'Lido',
  maker_sky: 'MakerDAO / Sky',
  nouns: 'Nouns',
  optimism: 'Optimism',
  sushiswap: 'SushiSwap',
  uniswap: 'Uniswap',
};

const GOVERNANCE_RULES = [
  { value: '', label: 'Default (from calibration)' },
  { value: 'majority', label: 'Simple Majority' },
  { value: 'supermajority', label: 'Supermajority (67%)' },
  { value: 'quadratic', label: 'Quadratic Voting' },
  { value: 'conviction', label: 'Conviction Voting' },
  { value: 'optimistic', label: 'Optimistic Approval' },
  { value: 'instant-runoff', label: 'Instant Runoff (IRV)' },
  { value: 'futarchy', label: 'Futarchy' },
];

export function ControlPanel() {
  const {
    status,
    config,
    selectedDao,
    availableDaos,
    snapshot,
    start,
    pause,
    step,
    reset,
    setSpeed,
    selectDao,
    updateConfig,
  } = useSimulationStore();

  const isRunning = status === 'running';
  const canInteract = status === 'running' || status === 'paused';

  return (
    <div className="p-4 border-b border-gray-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
          Simulation Control
        </h2>
        <span className="text-xs text-gray-500 font-mono">
          Step {snapshot?.step ?? 0}
        </span>
      </div>

      {/* Transport Controls */}
      <div className="flex gap-2">
        <button
          onClick={isRunning ? pause : start}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {isRunning ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={step}
          disabled={status === 'initializing'}
          className="px-3 py-2 rounded text-sm font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Step
        </button>
        <button
          onClick={reset}
          disabled={!canInteract}
          className="px-3 py-2 rounded text-sm font-medium bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* Speed Slider */}
      <div>
        <label className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Speed</span>
          <span className="font-mono">{config.stepsPerSecond} steps/sec</span>
        </label>
        <input
          type="range"
          min={1}
          max={60}
          value={config.stepsPerSecond}
          onChange={e => setSpeed(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      {/* DAO Picker */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">DAO Preset</label>
        <select
          value={selectedDao}
          onChange={e => selectDao(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
        >
          {availableDaos.map(id => (
            <option key={id} value={id}>
              {DAO_DISPLAY_NAMES[id] || id}
            </option>
          ))}
        </select>
      </div>

      {/* Governance Rule */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Governance Rule</label>
        <select
          value={config.governanceRule ?? ''}
          onChange={e =>
            updateConfig({ governanceRule: e.target.value || undefined })
          }
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
        >
          {GOVERNANCE_RULES.map(r => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={config.forumEnabled ?? true}
            onChange={e => updateConfig({ forumEnabled: e.target.checked })}
            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
          />
          Forum
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={config.blackSwanEnabled ?? false}
            onChange={e => updateConfig({ blackSwanEnabled: e.target.checked })}
            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
          />
          Black Swans
        </label>
      </div>

      {/* Seed */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Random Seed</label>
        <input
          type="number"
          value={config.seed ?? 42}
          onChange={e => updateConfig({ seed: parseInt(e.target.value) || 42 })}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono focus:border-cyan-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
