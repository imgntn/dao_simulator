'use client';

import { useState, useCallback } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { TYPE_COLOR_MAP, AGENT_TYPE_INFO } from './scene/constants';

const AGENT_TYPES = Object.keys(AGENT_TYPE_INFO);

export function CustomAgentForm() {
  const { injectAgent, status } = useSimulationStore();
  const [type, setType] = useState(AGENT_TYPES[0]);
  const [tokens, setTokens] = useState(1000);
  const [optimism, setOptimism] = useState(0.5);
  const [oppositionBias, setOppositionBias] = useState(0);
  const [name, setName] = useState('');

  const canInject = status === 'running' || status === 'paused';

  const handleInject = useCallback(() => {
    if (!canInject) return;
    injectAgent({
      type,
      tokens,
      optimism,
      oppositionBias,
      name: name || undefined,
    });
    // Reset form
    setName('');
  }, [type, tokens, optimism, oppositionBias, name, canInject, injectAgent]);

  return (
    <div className="px-4 pb-3 space-y-2">
      {/* Type */}
      <div>
        <label className="block text-[10px] text-[var(--sim-text-muted)] mb-0.5">Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs focus:outline-none"
        >
          {AGENT_TYPES.map(t => (
            <option key={t} value={t}>
              {AGENT_TYPE_INFO[t]?.displayName ?? t}
            </option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[10px] text-[var(--sim-text-muted)] mb-0.5">Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Custom name..."
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--sim-accent-ring)]"
          maxLength={40}
        />
      </div>

      {/* Tokens */}
      <div>
        <label className="flex justify-between text-[10px] text-[var(--sim-text-muted)] mb-0.5">
          <span>Tokens</span>
          <span className="font-mono">{tokens}</span>
        </label>
        <input
          type="range"
          min={0}
          max={10000}
          step={100}
          value={tokens}
          onChange={e => setTokens(parseInt(e.target.value))}
          className="w-full h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
        />
      </div>

      {/* Optimism */}
      <div>
        <label className="flex justify-between text-[10px] text-[var(--sim-text-muted)] mb-0.5">
          <span>Optimism</span>
          <span className="font-mono">{optimism.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={optimism}
          onChange={e => setOptimism(parseFloat(e.target.value))}
          className="w-full h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
        />
      </div>

      {/* Opposition Bias */}
      <div>
        <label className="flex justify-between text-[10px] text-[var(--sim-text-muted)] mb-0.5">
          <span>Opposition Bias</span>
          <span className="font-mono">{oppositionBias.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={oppositionBias}
          onChange={e => setOppositionBias(parseFloat(e.target.value))}
          className="w-full h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
        />
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2 py-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: TYPE_COLOR_MAP[type] ?? '#888' }}
        />
        <span className="text-xs text-[var(--sim-text-secondary)]">
          {name || AGENT_TYPE_INFO[type]?.displayName || type}
        </span>
      </div>

      {/* Inject button */}
      <button
        onClick={handleInject}
        disabled={!canInject}
        className="w-full px-3 py-1.5 text-xs rounded bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Inject Agent
      </button>

      {!canInject && (
        <div className="text-[10px] text-[var(--sim-text-muted)] text-center">
          Start simulation first
        </div>
      )}
    </div>
  );
}
