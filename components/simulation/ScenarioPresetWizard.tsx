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
  const [autoStart, setAutoStart] = useState(status === 'running');

  const preview = useMemo(() => {
    const strategyConfig = STRATEGIES.find(s => s.id === strategy)?.config ?? {};
    const riskConfig = RISKS.find(r => r.id === risk)?.config ?? {};
    return {
      ...config,
      ...strategyConfig,
      ...riskConfig,
      daoId,
      governanceRule,
    };
  }, [config, daoId, governanceRule, risk, strategy]);

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
