'use client';

import { useState, useMemo } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { BrowserSimConfig } from '@/lib/browser/worker-protocol';
import { AGENT_FLOORS, TYPE_COLOR_MAP, AGENT_TYPE_INFO, AGENT_FLOOR_MAP } from './scene/constants';

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

/** Agent type → config key mapping */
const AGENT_CONFIG_KEYS: Record<string, keyof BrowserSimConfig> = {
  Developer: 'numDevelopers',
  Investor: 'numInvestors',
  Trader: 'numTraders',
  Delegator: 'numDelegators',
  ProposalCreator: 'numProposalCreators',
  Validator: 'numValidators',
  PassiveMember: 'numPassiveMembers',
  GovernanceExpert: 'numGovernanceExperts',
  GovernanceWhale: 'numGovernanceWhales',
  RiskManager: 'numRiskManagers',
  Speculator: 'numSpeculators',
  StakerAgent: 'numStakers',
};

const CONFIG_COMPARE_KEYS: (keyof BrowserSimConfig)[] = [
  'governanceRule', 'forumEnabled', 'blackSwanEnabled', 'blackSwanFrequency', 'seed',
  'numDevelopers', 'numInvestors', 'numTraders', 'numDelegators', 'numProposalCreators',
  'numValidators', 'numPassiveMembers', 'numGovernanceExperts', 'numGovernanceWhales',
  'numRiskManagers', 'numSpeculators', 'numStakers', 'scheduledBlackSwans',
];

function isConfigDirty(config: BrowserSimConfig, lastSent: BrowserSimConfig | null): boolean {
  if (!lastSent) return false;
  for (const key of CONFIG_COMPARE_KEYS) {
    const a = config[key];
    const b = lastSent[key];
    if (key === 'scheduledBlackSwans') {
      if (JSON.stringify(a) !== JSON.stringify(b)) return true;
    } else if (a !== b) {
      return true;
    }
  }
  return false;
}

export function ControlPanel() {
  const {
    status,
    config,
    selectedDao,
    availableDaos,
    snapshot,
    lastSentConfig,
    start,
    pause,
    step,
    reset,
    setSpeed,
    selectDao,
    updateConfig,
  } = useSimulationStore();

  const [agentsOpen, setAgentsOpen] = useState(false);

  const isRunning = status === 'running';
  const canInteract = status === 'running' || status === 'paused';

  const dirty = useMemo(
    () => isConfigDirty(config, lastSentConfig),
    [config, lastSentConfig]
  );

  // Group configurable agent types by floor
  const agentsByFloor = useMemo(() => {
    const result: Array<{ floorId: string; floorName: string; floorColor: string; agents: Array<{ type: string; displayName: string; color: string; configKey: keyof BrowserSimConfig }> }> = [];
    for (const floor of AGENT_FLOORS) {
      const floorAgents: typeof result[0]['agents'] = [];
      for (const type of floor.agentTypes) {
        const configKey = AGENT_CONFIG_KEYS[type];
        if (configKey) {
          floorAgents.push({
            type,
            displayName: AGENT_TYPE_INFO[type]?.displayName ?? type,
            color: TYPE_COLOR_MAP[type] ?? '#888',
            configKey,
          });
        }
      }
      if (floorAgents.length > 0) {
        result.push({
          floorId: floor.id,
          floorName: floor.name,
          floorColor: floor.color,
          agents: floorAgents,
        });
      }
    }
    return result;
  }, []);

  return (
    <div className="p-4 border-b border-[var(--sim-border)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--sim-accent)] uppercase tracking-wider">
          Simulation Control
        </h2>
        <span className="text-xs text-[var(--sim-text-muted)] font-mono">
          Step {snapshot?.step ?? 0}
        </span>
      </div>

      {/* Config Changed Banner */}
      {dirty && (
        <div className="bg-amber-900/40 border border-amber-600/50 rounded px-3 py-1.5 text-xs text-amber-300 text-center">
          Config changed — reset to apply
        </div>
      )}

      {/* Transport Controls */}
      <div className="flex gap-2">
        <button
          onClick={isRunning ? pause : start}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white'
          }`}
        >
          {isRunning ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={step}
          disabled={status === 'initializing'}
          className="px-3 py-2 rounded text-sm font-medium bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Step
        </button>
        <button
          onClick={reset}
          disabled={!canInteract}
          className="px-3 py-2 rounded text-sm font-medium bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* Speed Slider */}
      <div>
        <label className="flex justify-between text-xs text-[var(--sim-text-muted)] mb-1">
          <span>Speed</span>
          <span className="font-mono">{config.stepsPerSecond} steps/sec</span>
        </label>
        <input
          type="range"
          min={1}
          max={60}
          value={config.stepsPerSecond}
          onChange={e => setSpeed(parseInt(e.target.value))}
          className="w-full h-1.5 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
        />
      </div>

      {/* DAO Picker */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">DAO Preset</label>
        <select
          value={selectedDao}
          onChange={e => selectDao(e.target.value)}
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm focus:border-[var(--sim-accent-ring)] focus:outline-none"
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
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Governance Rule</label>
        <select
          value={config.governanceRule ?? ''}
          onChange={e =>
            updateConfig({ governanceRule: e.target.value || undefined })
          }
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm focus:border-[var(--sim-accent-ring)] focus:outline-none"
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
        <label className="flex items-center gap-2 text-xs text-[var(--sim-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={config.forumEnabled ?? true}
            onChange={e => updateConfig({ forumEnabled: e.target.checked })}
            className="rounded bg-[var(--sim-border-strong)] border-[var(--sim-border-strong)] text-[var(--sim-accent-hover)] focus:ring-[var(--sim-accent-ring)]"
          />
          Forum
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--sim-text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={config.blackSwanEnabled ?? false}
            onChange={e => updateConfig({ blackSwanEnabled: e.target.checked })}
            className="rounded bg-[var(--sim-border-strong)] border-[var(--sim-border-strong)] text-[var(--sim-accent-hover)] focus:ring-[var(--sim-accent-ring)]"
          />
          Black Swans
        </label>
      </div>

      {/* Seed */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Random Seed</label>
        <input
          type="number"
          value={config.seed ?? 42}
          onChange={e => updateConfig({ seed: parseInt(e.target.value) || 42 })}
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm font-mono focus:border-[var(--sim-accent-ring)] focus:outline-none"
        />
      </div>

      {/* Agent Counts (collapsible) */}
      <div>
        <button
          onClick={() => setAgentsOpen(!agentsOpen)}
          className="flex items-center justify-between w-full text-xs text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)] transition-colors"
        >
          <span className="uppercase tracking-wider font-medium">Agent Counts</span>
          <span className="text-sm">{agentsOpen ? '▾' : '▸'}</span>
        </button>
        {agentsOpen && (
          <div className="mt-2 space-y-3">
            {agentsByFloor.map(floor => (
              <div key={floor.floorId}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: floor.floorColor }}>
                  {floor.floorId} — {floor.floorName}
                </div>
                <div className="space-y-1">
                  {floor.agents.map(agent => (
                    <div key={agent.type} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span className="text-xs text-[var(--sim-text-muted)] flex-1 truncate">
                        {agent.displayName}
                      </span>
                      <span className="text-xs font-mono text-[var(--sim-text-muted)] w-4 text-right">
                        {(config[agent.configKey] as number | undefined) ?? '—'}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={(config[agent.configKey] as number | undefined) ?? 0}
                        onChange={e =>
                          updateConfig({ [agent.configKey]: parseInt(e.target.value) } as Partial<BrowserSimConfig>)
                        }
                        className="w-16 h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
