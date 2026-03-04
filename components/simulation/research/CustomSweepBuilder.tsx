'use client';

import { useState } from 'react';
import { useResearchStore } from '@/lib/browser/research-store';

const DAO_OPTIONS = [
  'aave', 'arbitrum', 'balancer', 'compound', 'curve', 'dydx', 'ens',
  'gitcoin', 'lido', 'maker_sky', 'nouns', 'optimism', 'sushiswap', 'uniswap',
];

const GOVERNANCE_OPTIONS = [
  { value: 'majority', label: 'Simple Majority' },
  { value: 'supermajority', label: 'Supermajority (67%)' },
  { value: 'quadratic', label: 'Quadratic Voting' },
  { value: 'conviction', label: 'Conviction Voting' },
  { value: 'optimistic', label: 'Optimistic Approval' },
  { value: 'instant-runoff', label: 'Instant Runoff (IRV)' },
  { value: 'futarchy', label: 'Futarchy' },
  { value: 'category-quorum', label: 'Category Quorum' },
];

const SWEEP_PARAMS = [
  { value: 'governance_rule', label: 'Governance Rule' },
  { value: 'calibration_dao_id', label: 'DAO Preset' },
  { value: 'governance_config.quorumPercentage', label: 'Quorum %' },
  { value: 'participation_rate', label: 'Participation Rate' },
  { value: 'num_agents', label: 'Number of Agents' },
  { value: 'token_initial_price', label: 'Initial Token Price' },
];

export function CustomSweepBuilder() {
  const { launchCustomSweep } = useResearchStore();

  const [dao, setDao] = useState('aave');
  const [governance, setGovernance] = useState('majority');
  const [sweepParam, setSweepParam] = useState('governance_rule');
  const [sweepValues, setSweepValues] = useState('majority, supermajority, quadratic');
  const [runsPerConfig, setRunsPerConfig] = useState(30);
  const [stepsPerRun, setStepsPerRun] = useState(720);
  const [workers, setWorkers] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const values = sweepValues.split(',').map(v => v.trim()).filter(Boolean);
    const numericValues = values.map(v => Number(v));
    const isNumeric = numericValues.every(n => !isNaN(n));

    const config = {
      name: `Custom: ${sweepParam} sweep (${dao})`,
      description: `Custom sweep of ${sweepParam} over [${values.join(', ')}] for ${dao}`,
      tags: ['custom', dao],
      baseConfig: {
        template: dao,
        overrides: {
          governance_rule: governance,
        },
      },
      sweep: {
        parameter: sweepParam,
        values: isNumeric ? numericValues : values,
      },
      execution: {
        runsPerConfig,
        stepsPerRun,
        seedStrategy: 'sequential',
        baseSeed: 12345,
        workers,
      },
      metrics: [
        { name: 'Proposal Pass Rate', type: 'builtin', builtin: 'proposal_pass_rate' },
        { name: 'Average Turnout', type: 'builtin', builtin: 'average_turnout' },
        { name: 'Final Treasury', type: 'builtin', builtin: 'final_treasury' },
        { name: 'Final Token Price', type: 'builtin', builtin: 'final_token_price' },
        { name: 'Final Gini', type: 'builtin', builtin: 'final_gini' },
        { name: 'Quorum Reach Rate', type: 'builtin', builtin: 'quorum_reach_rate' },
        { name: 'Whale Influence', type: 'builtin', builtin: 'whale_influence' },
        { name: 'Governance Activity Index', type: 'builtin', builtin: 'governance_activity_index' },
      ],
      output: {
        directory: 'results',
        formats: ['json'],
        includeRawRuns: false,
        includeManifest: true,
      },
    };

    await launchCustomSweep(config);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* DAO Preset */}
        <div>
          <label className="block text-xs text-[var(--sim-text-muted)] mb-1">DAO Preset</label>
          <select
            value={dao}
            onChange={e => setDao(e.target.value)}
            className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] focus:border-[var(--sim-accent-ring)] focus:outline-none"
          >
            {DAO_OPTIONS.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>

        {/* Governance Rule */}
        <div>
          <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Governance Rule</label>
          <select
            value={governance}
            onChange={e => setGovernance(e.target.value)}
            className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] focus:border-[var(--sim-accent-ring)] focus:outline-none"
          >
            {GOVERNANCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sweep Parameter */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Sweep Parameter</label>
        <select
          value={sweepParam}
          onChange={e => setSweepParam(e.target.value)}
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] focus:border-[var(--sim-accent-ring)] focus:outline-none"
        >
          {SWEEP_PARAMS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Sweep Values */}
      <div>
        <label className="block text-xs text-[var(--sim-text-muted)] mb-1">
          Sweep Values <span className="text-[var(--sim-text-dim)]">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={sweepValues}
          onChange={e => setSweepValues(e.target.value)}
          placeholder="e.g. majority, supermajority, quadratic"
          className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] font-mono focus:border-[var(--sim-accent-ring)] focus:outline-none"
        />
      </div>

      {/* Execution params */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Runs per Config</label>
          <input
            type="number"
            min={1}
            max={200}
            value={runsPerConfig}
            onChange={e => setRunsPerConfig(parseInt(e.target.value) || 30)}
            className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] font-mono focus:border-[var(--sim-accent-ring)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Steps per Run</label>
          <input
            type="number"
            min={100}
            max={5000}
            step={100}
            value={stepsPerRun}
            onChange={e => setStepsPerRun(parseInt(e.target.value) || 720)}
            className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] font-mono focus:border-[var(--sim-accent-ring)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--sim-text-muted)] mb-1">Workers</label>
          <input
            type="number"
            min={1}
            max={8}
            value={workers}
            onChange={e => setWorkers(parseInt(e.target.value) || 2)}
            className="w-full bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-3 py-1.5 text-sm text-[var(--sim-text)] font-mono focus:border-[var(--sim-accent-ring)] focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !sweepValues.trim()}
        className="px-6 py-2 text-sm font-medium rounded bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Launching...' : 'Launch Sweep'}
      </button>
    </form>
  );
}
