'use client';

import { useMemo, useState } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { BrowserSimConfig } from '@/lib/browser/worker-protocol';

interface ScenarioPresetWizardProps {
  onClose: () => void;
}

type StrategyKey = 'baseline' | 'growth' | 'community' | 'risk';
type RiskKey = 'calm' | 'volatile' | 'crisis';

const STRATEGIES: Array<{ id: StrategyKey; label: string; config: Partial<BrowserSimConfig> }> = [
  { id: 'baseline', label: 'Baseline', config: {} },
  {
    id: 'growth',
    label: 'Growth',
    config: {
      numDevelopers: 22,
      numInvestors: 16,
      numTraders: 18,
      numProposalCreators: 10,
      numValidators: 12,
      forumEnabled: true,
    },
  },
  {
    id: 'community',
    label: 'Community',
    config: {
      numDelegators: 18,
      numPassiveMembers: 28,
      numGovernanceExperts: 12,
      numProposalCreators: 12,
      forumEnabled: true,
    },
  },
  {
    id: 'risk',
    label: 'Risk Desk',
    config: {
      numRiskManagers: 18,
      numGovernanceExperts: 14,
      numValidators: 16,
      governanceQuorumPercentage: 0.22,
    },
  },
];

const RISKS: Array<{ id: RiskKey; label: string; config: Partial<BrowserSimConfig> }> = [
  { id: 'calm', label: 'Calm', config: { blackSwanEnabled: false, scheduledBlackSwans: [] } },
  {
    id: 'volatile',
    label: 'Volatile',
    config: {
      blackSwanEnabled: true,
      blackSwanFrequency: 7,
      blackSwanSeverityScale: 5,
      scheduledBlackSwans: [],
    },
  },
  {
    id: 'crisis',
    label: 'Crisis',
    config: {
      blackSwanEnabled: true,
      blackSwanFrequency: 4,
      blackSwanSeverityScale: 8,
      scheduledBlackSwans: [
        { step: 80, category: 'market_crash', severity: 8 },
        { step: 170, category: 'regulatory_shock', severity: 7 },
      ],
    },
  },
];

const GOVERNANCE = [
  { id: 'majority', label: 'Majority' },
  { id: 'supermajority', label: 'Supermajority' },
  { id: 'quadratic', label: 'Quadratic' },
  { id: 'conviction', label: 'Conviction' },
  { id: 'optimistic', label: 'Optimistic' },
  { id: 'futarchy', label: 'Futarchy' },
];

const COUNT_KEYS: Array<keyof BrowserSimConfig> = [
  'numDevelopers',
  'numInvestors',
  'numTraders',
  'numDelegators',
  'numProposalCreators',
  'numValidators',
  'numPassiveMembers',
  'numGovernanceExperts',
  'numGovernanceWhales',
  'numRiskManagers',
  'numSpeculators',
  'numStakers',
];

function scaleAgentCounts(config: BrowserSimConfig, scale: number): Partial<BrowserSimConfig> {
  const next: Partial<BrowserSimConfig> = {};
  for (const key of COUNT_KEYS) {
    const value = config[key];
    if (typeof value === 'number') {
      next[key] = Math.max(0, Math.round(value * scale)) as never;
    }
  }
  return next;
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[5.75rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-[var(--sim-text-muted)]">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ accentColor: 'var(--sim-accent)' }}
      />
      <span className="text-right tabular-nums text-[var(--sim-text-secondary)]">{value}{suffix}</span>
    </label>
  );
}

export function ScenarioPresetWizard({ onClose }: ScenarioPresetWizardProps) {
  const availableDaos = useSimulationStore(s => s.availableDaos);
  const selectedDao = useSimulationStore(s => s.selectedDao);
  const config = useSimulationStore(s => s.config);
  const status = useSimulationStore(s => s.status);
  const updateConfig = useSimulationStore(s => s.updateConfig);
  const selectDao = useSimulationStore(s => s.selectDao);
  const reset = useSimulationStore(s => s.reset);
  const start = useSimulationStore(s => s.start);

  const [daoId, setDaoId] = useState(selectedDao || config.daoId);
  const [strategy, setStrategy] = useState<StrategyKey>('baseline');
  const [risk, setRisk] = useState<RiskKey>(config.blackSwanEnabled ? 'volatile' : 'calm');
  const [governanceRule, setGovernanceRule] = useState(config.governanceRule || 'majority');
  const [populationScale, setPopulationScale] = useState(1);
  const [quorum, setQuorum] = useState(Math.round((config.governanceQuorumPercentage ?? 0.18) * 100));
  const [seed, setSeed] = useState(config.seed ?? 42);
  const [totalSteps, setTotalSteps] = useState(config.totalSteps);
  const [shockStep, setShockStep] = useState(120);
  const [shockSeverity, setShockSeverity] = useState(config.blackSwanSeverityScale ?? 6);
  const [savedScenarios, setSavedScenarios] = useState<Array<{ name: string; config: BrowserSimConfig }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('dao-sim-scenarios') ?? '[]');
    } catch {
      return [];
    }
  });
  const [autoStart, setAutoStart] = useState(status === 'running');

  const preview = useMemo(() => {
    const strategyConfig = STRATEGIES.find(s => s.id === strategy)?.config ?? {};
    const riskConfig = RISKS.find(r => r.id === risk)?.config ?? {};
    const scaledCounts = scaleAgentCounts({ ...config, ...strategyConfig }, populationScale);
    return {
      ...config,
      ...strategyConfig,
      ...scaledCounts,
      ...riskConfig,
      daoId,
      governanceRule,
      governanceQuorumPercentage: quorum / 100,
      seed,
      totalSteps,
      blackSwanSeverityScale: shockSeverity,
      scheduledBlackSwans: risk === 'calm'
        ? []
        : [{ step: shockStep, category: risk === 'crisis' ? 'regulatory_shock' : 'market_crash', severity: shockSeverity }],
    };
  }, [config, daoId, governanceRule, populationScale, quorum, risk, seed, shockSeverity, shockStep, strategy, totalSteps]);

  function saveScenario() {
    const name = `${daoId}-${strategy}-${risk}-s${seed}`;
    const next = [...savedScenarios.filter(item => item.name !== name), { name, config: preview }].slice(-8);
    setSavedScenarios(next);
    localStorage.setItem('dao-sim-scenarios', JSON.stringify(next));
  }

  function loadScenario(nextConfig: BrowserSimConfig) {
    setDaoId(nextConfig.daoId);
    setStrategy('baseline');
    setRisk(nextConfig.blackSwanEnabled ? (nextConfig.blackSwanSeverityScale ?? 0) >= 7 ? 'crisis' : 'volatile' : 'calm');
    setPopulationScale(1);
    setGovernanceRule(nextConfig.governanceRule || 'majority');
    setQuorum(Math.round((nextConfig.governanceQuorumPercentage ?? 0.18) * 100));
    setSeed(nextConfig.seed ?? 42);
    setTotalSteps(nextConfig.totalSteps);
    setShockSeverity(nextConfig.blackSwanSeverityScale ?? 6);
    setShockStep(nextConfig.scheduledBlackSwans?.[0]?.step ?? 120);
    updateConfig(nextConfig);
  }

  function applyScenario() {
    updateConfig(preview);
    if (daoId !== selectedDao) {
      selectDao(daoId);
    } else {
      reset();
    }
    if (autoStart) {
      window.setTimeout(() => start(), 80);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-ui-interactive>
      <div className="w-full max-w-3xl overflow-hidden rounded border bg-[var(--sim-bg)] text-[var(--sim-text)] shadow-2xl" style={{ borderColor: 'var(--sim-border)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--sim-border)' }}>
          <div>
            <div className="text-sm font-semibold text-[var(--sim-text-secondary)]">Scenario Presets</div>
            <div className="text-xs text-[var(--sim-text-muted)]">Configure the next run before the worker resets.</div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded border text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)]" style={{ borderColor: 'var(--sim-border)' }} aria-label="Close presets">
            x
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">DAO</h3>
            <select
              value={daoId}
              onChange={e => setDaoId(e.target.value)}
              className="w-full rounded border bg-[var(--sim-surface)] px-3 py-2 text-sm"
              style={{ borderColor: 'var(--sim-border)' }}
            >
              {(availableDaos.length > 0 ? availableDaos : [daoId]).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">Governance</h3>
            <div className="grid grid-cols-2 gap-2">
              {GOVERNANCE.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGovernanceRule(item.id)}
                  className="rounded border px-3 py-2 text-left text-xs"
                  style={{
                    borderColor: governanceRule === item.id ? 'var(--sim-accent)' : 'var(--sim-border)',
                    color: governanceRule === item.id ? 'var(--sim-accent)' : 'var(--sim-text-muted)',
                    background: governanceRule === item.id ? 'var(--sim-accent-bg)' : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">Strategy</h3>
            <div className="grid grid-cols-2 gap-2">
              {STRATEGIES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStrategy(item.id)}
                  className="rounded border px-3 py-2 text-left text-xs"
                  style={{
                    borderColor: strategy === item.id ? 'var(--sim-accent)' : 'var(--sim-border)',
                    color: strategy === item.id ? 'var(--sim-accent)' : 'var(--sim-text-muted)',
                    background: strategy === item.id ? 'var(--sim-accent-bg)' : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">Shock Profile</h3>
            <div className="grid grid-cols-3 gap-2">
              {RISKS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRisk(item.id)}
                  className="rounded border px-3 py-2 text-center text-xs"
                  style={{
                    borderColor: risk === item.id ? 'var(--sim-accent)' : 'var(--sim-border)',
                    color: risk === item.id ? 'var(--sim-accent)' : 'var(--sim-text-muted)',
                    background: risk === item.id ? 'var(--sim-accent-bg)' : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">Run Shape</h3>
            <div className="space-y-2 rounded border p-3 text-xs" style={{ borderColor: 'var(--sim-border)' }}>
              <RangeRow label="Population" value={populationScale} min={0.5} max={2} step={0.1} suffix="x" onChange={setPopulationScale} />
              <RangeRow label="Quorum" value={quorum} min={5} max={60} step={1} suffix="%" onChange={setQuorum} />
              <RangeRow label="Steps" value={totalSteps} min={120} max={1440} step={60} onChange={setTotalSteps} />
              <label className="flex items-center justify-between gap-3 text-[var(--sim-text-muted)]">
                <span>Seed</span>
                <input
                  type="number"
                  value={seed}
                  onChange={e => setSeed(Number(e.target.value))}
                  className="h-7 w-24 rounded border bg-[var(--sim-surface)] px-2 text-right tabular-nums"
                  style={{ borderColor: 'var(--sim-border)' }}
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">Crisis Authoring</h3>
            <div className="space-y-2 rounded border p-3 text-xs" style={{ borderColor: 'var(--sim-border)' }}>
              <RangeRow label="Shock step" value={shockStep} min={20} max={Math.max(60, totalSteps)} step={10} onChange={setShockStep} />
              <RangeRow label="Severity" value={shockSeverity} min={1} max={10} step={1} onChange={setShockSeverity} />
              <div className="text-[11px] leading-snug text-[var(--sim-text-muted)]">
                Scheduled shock: {risk === 'calm' ? 'disabled' : `s${shockStep}, severity ${shockSeverity}`}
              </div>
            </div>
          </section>

          <section className="md:col-span-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sim-text-muted)]">Saved Scenarios</h3>
            <div className="flex min-h-9 flex-wrap gap-2 rounded border p-2" style={{ borderColor: 'var(--sim-border)' }}>
              <button type="button" onClick={saveScenario} className="rounded border px-2 py-1 text-xs text-[var(--sim-accent)]" style={{ borderColor: 'var(--sim-accent)' }}>
                Save current
              </button>
              {savedScenarios.map(item => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => loadScenario(item.config)}
                  className="max-w-[12rem] truncate rounded border px-2 py-1 text-xs text-[var(--sim-text-muted)]"
                  style={{ borderColor: 'var(--sim-border)' }}
                  title={item.name}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--sim-border)' }}>
          <div className="mb-3 grid gap-2 text-[11px] text-[var(--sim-text-muted)] sm:grid-cols-4">
            <span className="rounded border px-2 py-1" style={{ borderColor: 'var(--sim-border)' }}>DAO {preview.daoId}</span>
            <span className="rounded border px-2 py-1" style={{ borderColor: 'var(--sim-border)' }}>Gov {preview.governanceRule}</span>
            <span className="rounded border px-2 py-1" style={{ borderColor: 'var(--sim-border)' }}>Black swan {preview.blackSwanEnabled ? 'on' : 'off'}</span>
            <span className="rounded border px-2 py-1" style={{ borderColor: 'var(--sim-border)' }}>Forum {preview.forumEnabled ? 'on' : 'off'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--sim-text-muted)]">
              <input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} />
              Start after apply
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-xs text-[var(--sim-text-muted)]" style={{ borderColor: 'var(--sim-border)' }}>
                Cancel
              </button>
              <button type="button" onClick={applyScenario} className="rounded border px-4 py-2 text-xs font-semibold text-[var(--sim-accent)]" style={{ borderColor: 'var(--sim-accent)', background: 'var(--sim-accent-bg)' }}>
                Apply Scenario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
