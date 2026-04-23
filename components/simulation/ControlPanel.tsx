'use client';

import { useState, useMemo } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { BrowserSimConfig } from '@/lib/browser/worker-protocol';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { AGENT_FLOORS, TYPE_COLOR_MAP, AGENT_TYPE_INFO } from './scene/constants';

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
  'governanceRule', 'governanceQuorumPercentage', 'votePowerQuadraticThreshold',
  'forumEnabled', 'blackSwanEnabled', 'blackSwanFrequency', 'blackSwanSeverityScale',
  'learningEnabled', 'seed',
  'numDevelopers', 'numInvestors', 'numTraders', 'numDelegators', 'numProposalCreators',
  'numValidators', 'numPassiveMembers', 'numGovernanceExperts', 'numGovernanceWhales',
  'numRiskManagers', 'numSpeculators', 'numStakers', 'scheduledBlackSwans',
];

// =============================================================================
// SCENARIO PRESETS
// =============================================================================

interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  config: Partial<BrowserSimConfig>;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: '',
    label: 'None (manual config)',
    description: 'Configure all settings manually.',
    config: {},
  },
  {
    id: 'quadratic-vs-majority',
    label: 'Quadratic vs Majority',
    description: 'Quadratic voting reduces whale influence by 43%. Threshold at 250 tokens.',
    config: {
      governanceRule: 'quadratic',
      votePowerQuadraticThreshold: 250,
    },
  },
  {
    id: 'black-swan-stress',
    label: 'Black Swan Stress Test',
    description: 'High crisis frequency (5 events/720 steps) at 0.8x severity to test resilience.',
    config: {
      blackSwanEnabled: true,
      blackSwanFrequency: 5,
      blackSwanSeverityScale: 0.8,
      scheduledBlackSwans: [
        { step: 5, category: 'market_contagion', severity: 0.8 },
      ],
    },
  },
  {
    id: 'scale-small',
    label: 'Scale Effect: Small DAO',
    description: '50 members — exposes governance vulnerability from low participation.',
    config: {
      numDevelopers: 8,
      numInvestors: 5,
      numTraders: 2,
      numDelegators: 5,
      numProposalCreators: 5,
      numValidators: 5,
      numPassiveMembers: 10,
      numGovernanceExperts: 2,
      numGovernanceWhales: 2,
      numRiskManagers: 2,
      numSpeculators: 2,
      numStakers: 2,
    },
  },
  {
    id: 'scale-large',
    label: 'Scale Effect: Large DAO',
    description: '500 members — demonstrates governance safety at scale.',
    config: {
      numDevelopers: 80,
      numInvestors: 50,
      numTraders: 30,
      numDelegators: 50,
      numProposalCreators: 30,
      numValidators: 40,
      numPassiveMembers: 100,
      numGovernanceExperts: 20,
      numGovernanceWhales: 20,
      numRiskManagers: 20,
      numSpeculators: 30,
      numStakers: 30,
    },
  },
  {
    id: 'rl-learning',
    label: 'RL Learning Enabled',
    description: 'Q-learning agents adapt over time, showing +8pt pass rate improvement.',
    config: {
      learningEnabled: true,
    },
  },
  {
    id: 'high-quorum-cliff',
    label: 'High Quorum Cliff',
    description: '20% quorum threshold demonstrates the governance cliff effect.',
    config: {
      governanceQuorumPercentage: 0.20,
    },
  },
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
    injectConfig,
    forkState,
  } = useSimulationStore();

  const { trackEvent } = useAnalytics();
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState('');

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

      {/* Config Changed Banner + Live Apply */}
      {dirty && (
        <div className="bg-amber-900/40 border border-amber-600/50 rounded px-3 py-1.5 text-xs text-amber-300 flex items-center justify-between">
          <span>Config changed</span>
          <div className="flex gap-1.5">
            {canInteract && (
              <button
                onClick={() => {
                  const changes: Partial<BrowserSimConfig> = {};
                  if (config.governanceRule !== lastSentConfig?.governanceRule) changes.governanceRule = config.governanceRule;
                  if (config.forumEnabled !== lastSentConfig?.forumEnabled) changes.forumEnabled = config.forumEnabled;
                  if (config.blackSwanEnabled !== lastSentConfig?.blackSwanEnabled) changes.blackSwanEnabled = config.blackSwanEnabled;
                  if (Object.keys(changes).length > 0) injectConfig(changes);
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white"
              >
                Apply Changes
              </button>
            )}
            <button
              onClick={reset}
              className="px-2 py-0.5 rounded text-[10px] bg-amber-700 hover:bg-amber-600 text-white"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Transport Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (isRunning) {
              pause();
            } else {
              start();
              trackEvent(ANALYTICS_EVENTS.SIMULATION_STARTED);
            }
          }}
          aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-[var(--sim-accent-pause)] hover:brightness-110 text-white'
              : 'bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white'
          }`}
        >
          {isRunning ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={step}
          disabled={status === 'initializing'}
          aria-label="Step simulation forward"
          className="px-3 py-2 rounded text-sm font-medium transition-colors bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Step
        </button>
        <button
          onClick={() => { if (window.confirm('Reset simulation? This will lose current state.')) { reset(); trackEvent(ANALYTICS_EVENTS.SIMULATION_RESET); } }}
          disabled={!canInteract}
          aria-label="Reset simulation"
          className="px-3 py-2 rounded text-sm font-medium transition-colors bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        {status === 'paused' && snapshot && (
          <button
            onClick={forkState}
            className="px-3 py-2 rounded text-sm font-medium bg-purple-700 hover:bg-purple-600 text-white"
            title="Fork current state for branching"
          >
            Fork
          </button>
        )}
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
          aria-label="Simulation speed"
          aria-valuetext={`${config.stepsPerSecond} steps per second`}
          className="w-full h-1.5 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
        />
      </div>

      {/* DAO Picker */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">DAO Preset</label>
        <select
          value={selectedDao}
          onChange={e => { selectDao(e.target.value); trackEvent(`${ANALYTICS_EVENTS.DAO_SELECTED}:${e.target.value}`); }}
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm focus:border-[var(--sim-accent-ring)] focus:outline-none"
        >
          {availableDaos.map(id => (
            <option key={id} value={id}>
              {DAO_DISPLAY_NAMES[id] || id}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario Preset */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Scenario Preset</label>
        <select
          value={activeScenario}
          onChange={e => {
            const preset = SCENARIO_PRESETS.find(p => p.id === e.target.value);
            setActiveScenario(e.target.value);
            if (preset && preset.id !== '') {
              // Clear scenario-specific fields before applying new preset
              updateConfig({
                governanceRule: undefined,
                governanceQuorumPercentage: undefined,
                votePowerQuadraticThreshold: undefined,
                blackSwanEnabled: undefined,
                blackSwanFrequency: undefined,
                blackSwanSeverityScale: undefined,
                learningEnabled: undefined,
                numDevelopers: undefined,
                numInvestors: undefined,
                numTraders: undefined,
                numDelegators: undefined,
                numProposalCreators: undefined,
                numValidators: undefined,
                numPassiveMembers: undefined,
                numGovernanceExperts: undefined,
                numGovernanceWhales: undefined,
                numRiskManagers: undefined,
                numSpeculators: undefined,
                numStakers: undefined,
                ...preset.config,
              });
              trackEvent(`${ANALYTICS_EVENTS.SCENARIO_EVENT_ADDED}:preset:${preset.id}`);
            }
          }}
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm focus:border-[var(--sim-accent-ring)] focus:outline-none"
        >
          {SCENARIO_PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {activeScenario !== '' && (
          <p className="mt-1 text-[10px] text-[var(--sim-text-dim)] leading-tight">
            {SCENARIO_PRESETS.find(p => p.id === activeScenario)?.description}
          </p>
        )}
      </div>

      {/* Governance Rule */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Governance Rule</label>
        <select
          value={config.governanceRule ?? ''}
          onChange={e => {
            updateConfig({ governanceRule: e.target.value || undefined });
            trackEvent(`${ANALYTICS_EVENTS.GOV_RULE_CHANGED}:${e.target.value || 'default'}`);
          }}
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
          aria-label={agentsOpen ? 'Collapse agent counts' : 'Expand agent counts'}
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
