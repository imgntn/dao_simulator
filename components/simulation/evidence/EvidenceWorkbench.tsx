'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type EvidenceView = 'overview' | 'effects' | 'claims' | 'compare' | 'runs' | 'metrics';

const EVIDENCE_VIEWS: Array<{ id: EvidenceView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'effects', label: 'Effects' },
  { id: 'claims', label: 'Claims' },
  { id: 'compare', label: 'Compare' },
  { id: 'runs', label: 'Source runs' },
  { id: 'metrics', label: 'Metrics' },
];

interface CampaignRecord {
  path: string;
  manifest: {
    campaignId: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    identitySha256: string;
    provenance: {
      gitCommit: string;
      gitDirty: boolean;
      lockfileSha256: string;
      configSha256: string;
      inputHashes: Record<string, string>;
      nodeVersion: string;
      platform: string;
      architecture: string;
      workerCount: number;
      rngAlgorithm: string;
      rngSchemaVersion: number;
    };
    accounting: {
      expected: number;
      attempted: number;
      completed: number;
      skipped: number;
      failed: number;
    };
    runs: Array<{
      runId: string;
      experimentId: string;
      conditionId: string;
      replicateIndex: number;
      seed: number;
      path: string;
      sha256: string;
    }>;
    failedRuns: Array<{ runId: string; experimentId: string; error?: string }>;
  };
  verification: { valid: boolean; errors: string[]; manifestSha256?: string } | null;
  conditionCounts: Record<string, number>;
  analysis: unknown | null;
  claims: unknown | null;
  runMetadataOmitted: boolean;
  totalRunMetadata: number;
}

interface MetricDefinition {
  id: string;
  definitionVersion: string;
  construct: string;
  formula: string;
  unit: string;
  timeBasis: string;
  interpretationLimits: string;
}

export function EvidenceWorkbench() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [excludedCampaignCount, setExcludedCampaignCount] = useState(0);
  const [view, setView] = useState<EvidenceView>('overview');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignResponse, metricResponse] = await Promise.all([
        fetch('/api/research/campaigns?verify=1', { cache: 'no-store' }),
        fetch('/api/research/metrics', { cache: 'no-store' }),
      ]);
      if (!campaignResponse.ok) {
        throw new Error(`Campaign API returned HTTP ${campaignResponse.status}`);
      }
      if (!metricResponse.ok) {
        throw new Error(`Metric API returned HTTP ${metricResponse.status}`);
      }
      const campaignPayload = await campaignResponse.json();
      const metricPayload = await metricResponse.json();
      const allCampaigns = (campaignPayload.campaigns ?? []) as CampaignRecord[];
      const nextCampaigns = allCampaigns.filter(campaign =>
        campaign.manifest.state === 'verified' && campaign.verification?.valid === true
      );
      setExcludedCampaignCount(allCampaigns.length - nextCampaigns.length);
      setCampaigns(nextCampaigns);
      setMetrics(metricPayload.metrics ?? []);
      const params = new URLSearchParams(window.location.search);
      const requestedCampaign = params.get('campaign');
      const requestedComparison = params.get('compare');
      const requestedView = params.get('view');
      if (EVIDENCE_VIEWS.some(candidate => candidate.id === requestedView)) {
        setView(requestedView as EvidenceView);
      }
      setSelectedId(current => {
        if (current && nextCampaigns.some(campaign => campaign.manifest.campaignId === current)) {
          return current;
        }
        if (
          requestedCampaign
          && nextCampaigns.some(campaign => campaign.manifest.campaignId === requestedCampaign)
        ) {
          return requestedCampaign;
        }
        return nextCampaigns[0]?.manifest.campaignId ?? null;
      });
      setComparisonId(current => {
        const valid = (value: string | null) =>
          value && nextCampaigns.some(campaign => campaign.manifest.campaignId === value);
        if (valid(current)) return current;
        if (valid(requestedComparison)) return requestedComparison;
        return nextCampaigns[1]?.manifest.campaignId ?? null;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  useEffect(() => {
    if (!selectedId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('campaign', selectedId);
    url.searchParams.set('view', view);
    if (comparisonId && comparisonId !== selectedId) {
      url.searchParams.set('compare', comparisonId);
    } else {
      url.searchParams.delete('compare');
    }
    window.history.replaceState(null, '', url);
  }, [comparisonId, selectedId, view]);

  useEffect(() => {
    if (!selectedId || comparisonId !== selectedId) return;
    setComparisonId(
      campaigns.find(campaign => campaign.manifest.campaignId !== selectedId)
        ?.manifest.campaignId ?? null,
    );
  }, [campaigns, comparisonId, selectedId]);

  const selected = campaigns.find(item => item.manifest.campaignId === selectedId) ?? null;
  const analysis = asRecord(selected?.analysis);
  const pairedEffects = Array.isArray(analysis?.pairedEffects) ? analysis.pairedEffects : [];
  const factorialModels = Array.isArray(analysis?.factorialModels) ? analysis.factorialModels : [];
  const hierarchical = Array.isArray(analysis?.hierarchical) ? analysis.hierarchical : [];
  const timeSeries = arrayOfRecords(analysis?.timeSeries);

  const exportBundle = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const response = await fetch(
        `/api/research/campaigns?verify=1&includeRuns=1&campaignId=${encodeURIComponent(selected.manifest.campaignId)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(`Evidence export returned HTTP ${response.status}`);
      const payload = await response.json();
      const fullCampaign = (payload.campaigns as CampaignRecord[] | undefined)?.[0];
      if (!fullCampaign) throw new Error('Selected campaign is unavailable for export');
      const contents = JSON.stringify({
        exportedAt: new Date().toISOString(),
        campaign: fullCampaign,
        metricRegistry: metrics,
      }, null, 2);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      link.download = `${selected.manifest.campaignId}-evidence-bundle.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <EvidenceState title="Loading verified evidence…" detail="Checking manifests and run hashes." />;
  }
  if (error) {
    return (
      <EvidenceState
        title="Evidence could not be loaded"
        detail={`${error}. Attempt ${attempt + 1}.`}
        action={<button className="evidence-button" onClick={() => setAttempt(value => value + 1)}>Retry</button>}
      />
    );
  }
  if (campaigns.length === 0) {
    return (
      <EvidenceState
        title="No immutable campaigns yet"
        detail="The Evidence workbench only presents campaign manifests. Legacy summaries are intentionally excluded."
        action={<button className="evidence-button" onClick={() => setAttempt(value => value + 1)}>Check again</button>}
      />
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-[var(--sim-bg)] text-[var(--sim-text)] p-4 md:p-6" aria-label="Evidence workbench">
      <header className="flex flex-wrap gap-3 items-start justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--sim-accent)]">Evidence mode</p>
          <h1 className="text-xl font-semibold">Verified campaign workbench</h1>
          <p className="text-xs text-[var(--sim-text-muted)] mt-1">Inference is loaded from immutable artifacts; this interface does not recompute results.</p>
          {excludedCampaignCount > 0 && (
            <p className="text-[10px] text-[var(--sim-text-muted)] mt-1">
              {excludedCampaignCount} incomplete or unverified campaign{excludedCampaignCount === 1 ? '' : 's'} excluded.
            </p>
          )}
        </div>
        <button
          className="evidence-button"
          onClick={() => void exportBundle()}
          disabled={exporting}
        >
          {exporting ? 'Verifying export…' : 'Export research bundle'}
        </button>
      </header>

      <div className="grid xl:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <nav className="evidence-card p-2 h-fit" aria-label="Campaign browser">
          <h2 className="text-xs font-semibold px-2 py-1">Campaigns</h2>
          {campaigns.map(campaign => (
            <button
              key={campaign.manifest.campaignId}
              onClick={() => {
                setSelectedId(campaign.manifest.campaignId);
                setView('overview');
              }}
              aria-current={campaign.manifest.campaignId === selectedId ? 'page' : undefined}
              className="w-full text-left rounded p-2 mt-1 border"
              style={{
                borderColor: campaign.manifest.campaignId === selectedId ? 'var(--sim-accent)' : 'var(--sim-border)',
                background: campaign.manifest.campaignId === selectedId ? 'var(--sim-surface-hover)' : 'transparent',
              }}
            >
              <span className="block text-xs font-mono break-all">{campaign.manifest.campaignId}</span>
              <span className="text-[10px] text-[var(--sim-text-muted)]">
                {campaign.manifest.state} · {campaign.manifest.accounting.completed}/{campaign.manifest.accounting.expected}
              </span>
            </button>
          ))}
        </nav>

        {selected && (
          <div className="space-y-4 min-w-0">
            <CampaignHeader campaign={selected} />
            <nav
              className="evidence-card flex gap-1 overflow-x-auto p-1"
              aria-label="Evidence views"
            >
              {EVIDENCE_VIEWS.map(item => (
                <button
                  key={item.id}
                  className="rounded px-3 py-2 text-xs whitespace-nowrap"
                  style={{
                    color: view === item.id ? 'var(--sim-accent)' : 'var(--sim-text-muted)',
                    background: view === item.id ? 'var(--sim-surface-hover)' : 'transparent',
                  }}
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => setView(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {view === 'overview' && (
              <>
                <AnalysisOverview analysis={analysis} />
                <ConditionTable campaign={selected} analysis={analysis} />
                <AnalysisDiagnostics analysis={analysis} />
              </>
            )}
            {view === 'effects' && (
              <section className="grid lg:grid-cols-2 gap-4" aria-label="Inferential results">
                <EvidencePanel title="Paired effects" empty={pairedEffects.length === 0}>
                  {pairedEffects.map((effect, index) => (
                    <PairedEffectPlot key={index} effect={asRecord(effect) ?? {}} />
                  ))}
                </EvidencePanel>
                <EvidencePanel title="Cross-DAO forest" empty={hierarchical.length === 0}>
                  {hierarchical.map((model, index) => (
                    <ForestPlot key={index} model={asRecord(model) ?? {}} />
                  ))}
                </EvidencePanel>
                <EvidencePanel title="Factorial effects" empty={factorialModels.length === 0}>
                  {factorialModels.map((model, index) => (
                    <CoefficientPlot key={index} model={asRecord(model) ?? {}} />
                  ))}
                </EvidencePanel>
                <EvidencePanel title="Time-series uncertainty and events" empty={timeSeries.length === 0}>
                  <TimeSeriesExplorer series={timeSeries} />
                </EvidencePanel>
              </section>
            )}
            {view === 'claims' && (
              <EvidencePanel title="Claims" empty={!selected.claims}>
                <ClaimCards
                  registry={asRecord(selected.claims)}
                  metrics={metrics}
                  onMetricSelect={setSelectedMetric}
                />
              </EvidencePanel>
            )}
            {view === 'compare' && (
              <CampaignComparison
                primary={selected}
                campaigns={campaigns}
                comparisonId={comparisonId}
                onComparisonChange={setComparisonId}
              />
            )}
            {view === 'runs' && <RunDrilldown campaign={selected} />}
            {view === 'metrics' && (
              <MetricRegistry metrics={metrics} onSelect={setSelectedMetric} />
            )}
          </div>
        )}
      </div>

      {selectedMetric && (
        <MetricDialog metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
      )}
    </main>
  );
}

function CampaignHeader({ campaign }: { campaign: CampaignRecord }) {
  const { manifest, verification } = campaign;
  const status = verification?.valid ? 'Verified' : verification ? 'Verification failed' : 'Not checked';
  return (
    <section className="evidence-card p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm break-all">{manifest.campaignId}</h2>
          <p className="text-xs text-[var(--sim-text-muted)]">{campaign.path}</p>
        </div>
        <span className="text-xs font-semibold" style={{ color: verification?.valid ? '#4ade80' : '#f87171' }}>{status}</span>
      </div>
      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
        {Object.entries(manifest.accounting).map(([key, value]) => (
          <div key={key} className="rounded border border-[var(--sim-border)] p-2">
            <div className="text-[9px] uppercase text-[var(--sim-text-muted)]">{key}</div>
            <div className="font-mono text-sm">{value}</div>
          </div>
        ))}
      </div>
      <dl className="grid md:grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-[10px] mt-4">
        <dt>Commit</dt><dd className="font-mono break-all">{manifest.provenance.gitCommit}{manifest.provenance.gitDirty ? ' (dirty)' : ''}</dd>
        <dt>Configuration</dt><dd className="font-mono break-all">{manifest.provenance.configSha256}</dd>
        <dt>Dependencies</dt><dd className="font-mono break-all">{manifest.provenance.lockfileSha256}</dd>
        <dt>Campaign identity</dt><dd className="font-mono break-all">{manifest.identitySha256}</dd>
        <dt>Runtime</dt><dd>{manifest.provenance.nodeVersion} · {manifest.provenance.platform}/{manifest.provenance.architecture} · {manifest.provenance.workerCount} workers</dd>
        <dt>RNG</dt><dd>{manifest.provenance.rngAlgorithm} schema {manifest.provenance.rngSchemaVersion}</dd>
      </dl>
      {verification && !verification.valid && (
        <ul className="mt-3 text-xs text-red-400 list-disc pl-5">{verification.errors.map(error => <li key={error}>{error}</li>)}</ul>
      )}
    </section>
  );
}

function AnalysisOverview({ analysis }: { analysis: Record<string, unknown> | null }) {
  if (!analysis) return null;
  const experiments = arrayOfRecords(analysis.experiments);
  const replacements = Array.isArray(analysis.nonFiniteReplacements)
    ? analysis.nonFiniteReplacements.length
    : 0;
  return (
    <section className="evidence-card p-4">
      <h2 className="text-sm font-semibold">Frozen analysis artifact</h2>
      <dl className="grid sm:grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-[10px] mt-2">
        <dt>Generated from runs</dt><dd>{String(analysis.generatedAt ?? '—')}</dd>
        <dt>Experiments</dt><dd>{experiments.length}</dd>
        <dt>Paired contrasts</dt><dd>{Array.isArray(analysis.pairedEffects) ? analysis.pairedEffects.length : 0}</dd>
        <dt>Factorial models</dt><dd>{Array.isArray(analysis.factorialModels) ? analysis.factorialModels.length : 0}</dd>
        <dt>Non-finite statistics</dt>
        <dd>{replacements === 0 ? 'None' : `${replacements} explicitly represented as null with diagnostic paths`}</dd>
      </dl>
    </section>
  );
}

function AnalysisDiagnostics({ analysis }: { analysis: Record<string, unknown> | null }) {
  const experiments = arrayOfRecords(analysis?.experiments);
  if (experiments.length === 0) return null;
  return (
    <section className="evidence-card p-4">
      <h2 className="text-sm font-semibold">Model diagnostics and analysis limits</h2>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left text-[var(--sim-text-muted)]">
              <th>Experiment</th><th>Finite</th><th>Paired blocks</th><th>Zero-variance conditions</th><th>Power recommendation</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map(experiment => {
              const diagnostics = asRecord(experiment.diagnostics) ?? {};
              const pilotPower = asRecord(experiment.pilotPower) ?? {};
              const zeroVariance = Array.isArray(diagnostics.zeroVarianceConditions)
                ? diagnostics.zeroVarianceConditions.map(String)
                : [];
              return (
                <tr key={String(experiment.experimentId)} className="border-t border-[var(--sim-border)] align-top">
                  <td className="py-2 pr-3 font-mono">{String(experiment.experimentId)}</td>
                  <td className="py-2 pr-3">{diagnostics.allPrimaryOutcomesFinite === true ? 'yes' : 'no'}</td>
                  <td className="py-2 pr-3">{diagnostics.pairedSeedsComplete === true ? 'complete' : 'incomplete'}</td>
                  <td className="py-2 pr-3">{zeroVariance.length > 0 ? zeroVariance.join(', ') : 'none'}</td>
                  <td className="py-2">{String(pilotPower.recommendedPairs ?? 'not recorded')} paired replicates</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--sim-text-muted)] mt-2">
        Intervals and adjusted tests are model-conditional. Factorial coefficients use HC3 robust uncertainty;
        paired contrasts retain seed blocks. The interface displays frozen diagnostics and never repairs or
        excludes observations.
      </p>
    </section>
  );
}

function ConditionTable({
  campaign,
  analysis,
}: {
  campaign: CampaignRecord;
  analysis: Record<string, unknown> | null;
}) {
  const experiments = arrayOfRecords(analysis?.experiments);
  return (
    <section className="evidence-card p-4">
      <h2 className="text-sm font-semibold">Conditions, exact differences, and distributions</h2>
      <p className="text-[10px] text-[var(--sim-text-muted)] mb-2">
        Box marks Q1–Q3, center line is the median, and whiskers are observed extrema.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left text-[var(--sim-text-muted)]">
              <th>Experiment / condition</th><th>Changed from reference</th><th>Distribution</th><th>Runs</th><th>Mean</th>
            </tr>
          </thead>
          <tbody>
            {experiments.flatMap(experiment => {
              const conditions = arrayOfRecords(experiment.conditions);
              const reference = asRecord(experiment.referenceCondition);
              const referenceFactors = asRecord(reference?.factors) ?? {};
              const globalMinimum = Math.min(...conditions.map(condition => Number(condition.minimum)));
              const globalMaximum = Math.max(...conditions.map(condition => Number(condition.maximum)));
              return conditions.map((condition, index) => {
                const factors = asRecord(condition.factors) ?? {};
                const changed = Object.entries(factors)
                  .filter(([key, value]) => String(referenceFactors[key]) !== String(value))
                  .map(([key, value]) => `${key}: ${String(referenceFactors[key])} → ${String(value)}`);
                const artifactConditionId = String(condition.artifactConditionId ?? '');
                const count = campaign.conditionCounts[artifactConditionId] ?? Number(condition.n ?? 0);
                return (
                  <tr key={`${String(experiment.experimentId)}-${artifactConditionId}`} className="border-t border-[var(--sim-border)] align-top">
                    <td className="py-2 pr-3">
                      {index === 0 && <span className="block text-[var(--sim-accent)]">{String(experiment.experimentId)}</span>}
                      <span className="font-mono">{String(condition.label)}</span>
                      {index === 0 && <span className="ml-1 rounded border px-1">reference</span>}
                    </td>
                    <td className="py-2 pr-3 max-w-72">{changed.length > 0 ? changed.join('; ') : 'Reference configuration'}</td>
                    <td className="py-2 pr-3 min-w-48">
                      <BoxWhisker summary={condition} domain={[globalMinimum, globalMaximum]} />
                    </td>
                    <td className="py-2 pr-3">{count}</td>
                    <td className="py-2">{formatNumber(condition.mean)}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BoxWhisker({
  summary,
  domain,
}: {
  summary: Record<string, unknown>;
  domain: [number, number];
}) {
  const [minimum, maximum] = domain;
  const span = maximum - minimum || 1;
  const x = (value: unknown) => 8 + ((Number(value) - minimum) / span) * 184;
  const observations = arrayOfRecords(summary.observations);
  return (
    <svg viewBox="0 0 200 30" className="w-full" role="img" aria-label={`Distribution from ${formatNumber(summary.minimum)} to ${formatNumber(summary.maximum)}`}>
      <line x1={x(summary.minimum)} y1="15" x2={x(summary.maximum)} y2="15" stroke="currentColor" opacity="0.6" />
      <line x1={x(summary.minimum)} y1="9" x2={x(summary.minimum)} y2="21" stroke="currentColor" />
      <line x1={x(summary.maximum)} y1="9" x2={x(summary.maximum)} y2="21" stroke="currentColor" />
      <rect x={x(summary.q1)} y="7" width={Math.max(1, x(summary.q3) - x(summary.q1))} height="16" fill="none" stroke="#40e8ff" strokeWidth="2" />
      <line x1={x(summary.median)} y1="6" x2={x(summary.median)} y2="24" stroke="#fbbf24" strokeWidth="2" />
      {observations.map((observation, index) => (
        <circle
          key={`${String(observation.runId)}-${index}`}
          cx={x(observation.value)}
          cy={10 + (index % 4) * 3.5}
          r="1.6"
          fill="#a78bfa"
          opacity="0.72"
        >
          <title>{`seed ${String(observation.seed)} · ${formatNumber(observation.value)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function RunDrilldown({ campaign }: { campaign: CampaignRecord }) {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<{
    total: number;
    limit: number;
    runs: CampaignRecord['manifest']['runs'];
  }>({ total: 0, limit: 50, runs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedQuery(query.trim());
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [campaign.manifest.campaignId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          query: appliedQuery,
          offset: String(offset),
          limit: '50',
        });
        const response = await fetch(
          `/api/research/campaigns/${encodeURIComponent(campaign.manifest.campaignId)}/runs?${params}`,
          { cache: 'no-store', signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Run index returned HTTP ${response.status}`);
        const payload = await response.json();
        setPage({
          total: Number(payload.total),
          limit: Number(payload.limit),
          runs: Array.isArray(payload.runs) ? payload.runs : [],
        });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadPage();
    return () => controller.abort();
  }, [appliedQuery, campaign.manifest.campaignId, offset]);

  const end = Math.min(offset + page.runs.length, page.total);
  return (
    <section className="evidence-card p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-sm font-semibold">Seed-level source runs</h2>
        <label className="text-[10px]">
          Filter runs
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="ml-2 rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] px-2 py-1"
            placeholder="run, experiment, condition, seed"
            type="search"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-xs text-red-400" role="alert">{error}</p>}
      <div className="overflow-x-auto mt-2 max-h-96">
        <table className="w-full text-[10px]">
          <thead><tr className="text-left"><th>Run</th><th>Experiment</th><th>Condition</th><th>Seed</th><th>SHA-256</th><th>Artifact</th></tr></thead>
          <tbody>{page.runs.map(run => (
            <tr key={run.runId} className="border-t border-[var(--sim-border)]">
              <td className="font-mono py-1">{run.runId}</td><td>{run.experimentId}</td><td>{run.conditionId}</td><td>{run.seed}</td><td className="font-mono">{run.sha256.slice(0, 16)}…</td>
              <td>
                <a
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/research/campaigns/run?campaignId=${encodeURIComponent(campaign.manifest.campaignId)}&runId=${encodeURIComponent(run.runId)}`}
                >
                  inspect JSON
                </a>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--sim-text-muted)]" aria-live="polite">
          {loading
            ? 'Loading run index…'
            : page.total === 0
              ? 'No matching indexed runs.'
              : `Showing ${offset + 1}–${end} of ${page.total} matching indexed runs.`}
        </p>
        <div className="flex gap-2">
          <button
            className="evidence-button"
            disabled={loading || offset === 0}
            onClick={() => setOffset(current => Math.max(0, current - page.limit))}
          >
            Previous
          </button>
          <button
            className="evidence-button"
            disabled={loading || end >= page.total}
            onClick={() => setOffset(current => current + page.limit)}
          >
            Next
          </button>
        </div>
      </div>
      <p className="text-[10px] text-[var(--sim-text-muted)] mt-2">
        Run metadata is paged from the immutable manifest. Each artifact request independently re-verifies
        the campaign before returning configuration, metrics, timeline, and execution metadata.
      </p>
    </section>
  );
}

function CampaignComparison({
  primary,
  campaigns,
  comparisonId,
  onComparisonChange,
}: {
  primary: CampaignRecord;
  campaigns: CampaignRecord[];
  comparisonId: string | null;
  onComparisonChange: (campaignId: string) => void;
}) {
  const comparison = campaigns.find(
    campaign => campaign.manifest.campaignId === comparisonId,
  ) ?? campaigns.find(campaign =>
    campaign.manifest.campaignId !== primary.manifest.campaignId
  ) ?? null;
  if (!comparison) {
    return (
      <EvidencePanel title="Campaign comparison" empty>
        <p className="text-xs">A second verified campaign is required for comparison.</p>
      </EvidencePanel>
    );
  }
  const pair = [primary, comparison];
  const effects = pair.flatMap(campaign =>
    arrayOfRecords(asRecord(campaign.analysis)?.pairedEffects).map(effect => ({
      campaignId: campaign.manifest.campaignId,
      effect,
    }))
  );
  const finiteBounds = effects.flatMap(({ effect }) => {
    const interval = asRecord(effect.confidenceInterval);
    return [Number(interval?.lower), Number(interval?.upper), 0].filter(Number.isFinite);
  });
  const minimum = Math.min(...finiteBounds);
  const maximum = Math.max(...finiteBounds);

  return (
    <section className="evidence-card p-4" aria-label="Campaign comparison">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Cross-campaign evidence comparison</h2>
          <p className="text-[10px] text-[var(--sim-text-muted)] mt-1">
            Frozen estimates remain separate; this view does not pool or recompute them.
          </p>
        </div>
        <label className="text-[10px]">
          Compare against
          <select
            value={comparison.manifest.campaignId}
            onChange={event => onComparisonChange(event.target.value)}
            className="ml-2 max-w-72 rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] px-2 py-1 font-mono"
          >
            {campaigns
              .filter(campaign => campaign.manifest.campaignId !== primary.manifest.campaignId)
              .map(campaign => (
                <option
                  key={campaign.manifest.campaignId}
                  value={campaign.manifest.campaignId}
                >
                  {campaign.manifest.campaignId}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        {pair.map(campaign => {
          const analysis = asRecord(campaign.analysis);
          const experiments = arrayOfRecords(analysis?.experiments);
          const claims = arrayOfRecords(asRecord(campaign.claims)?.claims);
          const roles = [...new Set(experiments.map(experiment =>
            String(experiment.publicationRole ?? 'unclassified')
          ))];
          return (
            <article
              key={campaign.manifest.campaignId}
              className="rounded border border-[var(--sim-border)] p-3 min-w-0"
            >
              <h3 className="font-mono text-xs break-all">{campaign.manifest.campaignId}</h3>
              <p className="text-[10px] text-[var(--sim-text-muted)] mt-1">
                {roles.join(', ')} · {campaign.manifest.accounting.completed} runs
              </p>
              <dl className="grid grid-cols-[7rem_1fr] gap-1 text-[10px] mt-3">
                <dt>Experiments</dt><dd>{experiments.length}</dd>
                <dt>Paired effects</dt><dd>{arrayOfRecords(analysis?.pairedEffects).length}</dd>
                <dt>Claims</dt><dd>{claims.length}</dd>
                <dt>Identity</dt>
                <dd className="font-mono break-all">{campaign.manifest.identitySha256}</dd>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left text-[var(--sim-text-muted)]">
              <th>Campaign</th><th>Experiment</th><th>Contrast</th>
              <th>Estimate and 95% CI</th><th>Interpretation</th><th>Pairs</th>
            </tr>
          </thead>
          <tbody>
            {effects.map(({ campaignId, effect }, index) => {
              const interval = asRecord(effect.confidenceInterval);
              const status = effect.practicallyEquivalent === true
                ? 'equivalent within margin'
                : effect.practicallyImportant === true
                  ? 'practically important'
                  : 'inconclusive vs margin';
              return (
                <tr
                  key={`${campaignId}-${String(effect.experimentId)}-${index}`}
                  className="border-t border-[var(--sim-border)] align-top"
                >
                  <td className="py-2 pr-3 font-mono max-w-48 break-all">{campaignId}</td>
                  <td className="py-2 pr-3 font-mono">{String(effect.experimentId)}</td>
                  <td className="py-2 pr-3">
                    {String(effect.conditionA)} → {String(effect.conditionB)}
                  </td>
                  <td className="py-2 pr-3 min-w-56">
                    <MiniInterval
                      estimate={Number(effect.meanDifference)}
                      lower={Number(interval?.lower)}
                      upper={Number(interval?.upper)}
                      domain={[minimum, maximum]}
                    />
                  </td>
                  <td className="py-2 pr-3">{status}</td>
                  <td className="py-2">{String(effect.nPairs ?? '—')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniInterval({
  estimate,
  lower,
  upper,
  domain,
}: {
  estimate: number;
  lower: number;
  upper: number;
  domain: [number, number];
}) {
  const [minimum, maximum] = domain;
  const span = maximum - minimum || 1;
  const x = (value: number) => 10 + ((value - minimum) / span) * 180;
  return (
    <div>
      <svg
        viewBox="0 0 200 24"
        className="w-full"
        role="img"
        aria-label={`Estimate ${formatNumber(estimate)}, 95% interval ${formatNumber(lower)} to ${formatNumber(upper)}`}
      >
        <line x1={x(0)} x2={x(0)} y1="2" y2="22" stroke="currentColor" opacity="0.25" />
        <line x1={x(lower)} x2={x(upper)} y1="12" y2="12" stroke="#40e8ff" strokeWidth="2" />
        <circle cx={x(estimate)} cy="12" r="3.5" fill="#fbbf24" />
      </svg>
      <span className="font-mono">
        {formatNumber(estimate)} [{formatNumber(lower)}, {formatNumber(upper)}]
      </span>
    </div>
  );
}

function MetricDialog({
  metric,
  onClose,
}: {
  metric: MetricDefinition;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter(element => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const titleId = `metric-dialog-${metric.id.replace(/[^a-z0-9_-]/gi, '-')}`;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="evidence-card p-5 max-w-xl w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex justify-between gap-4">
          <h2 id={titleId} className="font-mono font-semibold">
            {metric.id} v{metric.definitionVersion}
          </h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close metric definition">×</button>
        </div>
        <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-2 text-xs">
          <dt>Construct</dt><dd>{metric.construct}</dd>
          <dt>Formula</dt><dd className="font-mono">{metric.formula}</dd>
          <dt>Unit</dt><dd>{metric.unit}</dd>
          <dt>Time basis</dt><dd>{metric.timeBasis}</dd>
          <dt>Limits</dt><dd>{metric.interpretationLimits}</dd>
        </dl>
      </div>
    </div>
  );
}

function MetricRegistry({ metrics, onSelect }: { metrics: MetricDefinition[]; onSelect: (metric: MetricDefinition) => void }) {
  return (
    <section className="evidence-card p-4">
      <h2 className="text-sm font-semibold">Metric registry</h2>
      <p className="text-[10px] text-[var(--sim-text-muted)] mb-2">Definitions, units, versions, and interpretation limits.</p>
      <div className="flex flex-wrap gap-1.5">
        {metrics.map(metric => <button key={metric.id} className="text-[10px] border border-[var(--sim-border)] rounded px-2 py-1 hover:border-[var(--sim-accent)]" onClick={() => onSelect(metric)}>{metric.id}</button>)}
      </div>
    </section>
  );
}

function PairedEffectPlot({ effect }: { effect: Record<string, unknown> }) {
  const differences = Array.isArray(effect.differences) ? effect.differences.map(item => Number(asRecord(item)?.value)).filter(Number.isFinite) : [];
  const min = Math.min(0, ...differences);
  const max = Math.max(0, ...differences);
  const span = max - min || 1;
  const labels = asRecord(effect.conditionLabels) ?? {};
  const labelA = String(labels[String(effect.conditionA)] ?? effect.conditionA ?? 'A');
  const labelB = String(labels[String(effect.conditionB)] ?? effect.conditionB ?? 'B');
  const equivalence = asRecord(effect.practicalEquivalenceInterval);
  const scaleX = (value: number) => 20 + ((value - min) / span) * 360;
  const status = effect.practicallyEquivalent
    ? 'practically equivalent'
    : effect.practicallyImportant
      ? 'practically important'
      : 'inconclusive vs practical threshold';
  return (
    <div className="mb-4 border-b border-[var(--sim-border)] pb-3">
      <div className="text-xs font-mono break-words">{labelA} → {labelB}</div>
      <svg viewBox="0 0 400 70" className="w-full" role="img" aria-label="Raw paired differences dot plot">
        {equivalence && (
          <rect
            x={Math.max(20, scaleX(Number(equivalence.lower)))}
            y="5"
            width={Math.max(0, Math.min(380, scaleX(Number(equivalence.upper))) - Math.max(20, scaleX(Number(equivalence.lower))))}
            height="57"
            fill="#fbbf24"
            opacity="0.1"
          />
        )}
        <line x1={scaleX(0)} y1="5" x2={scaleX(0)} y2="62" stroke="currentColor" opacity="0.35" />
        {differences.map((value, index) => <circle key={index} cx={scaleX(value)} cy={15 + (index % 6) * 8} r="3" fill="#40e8ff" opacity="0.75" />)}
      </svg>
      <p className="text-[10px]">
        Mean {formatNumber(effect.meanDifference)} · 95% CI {formatInterval(effect.confidenceInterval)}
        {' · '}adjusted p {formatNumber(effect.adjustedPValue)} · dz {formatNumber(effect.cohensDz)}
      </p>
      <p className="text-[10px] mt-1"><span className="rounded border px-1">{status}</span> · n={String(effect.nPairs ?? '—')} paired seeds</p>
      <details className="mt-2 text-[10px]">
        <summary className="cursor-pointer">Paired-difference data</summary>
        <div className="mt-1 max-h-40 overflow-auto">
          <table className="w-full">
            <thead><tr className="text-left"><th>Pair</th><th>Difference</th></tr></thead>
            <tbody>{differences.map((value, index) => (
              <tr key={index} className="border-t border-[var(--sim-border)]">
                <td>{index + 1}</td><td>{formatNumber(value)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function ForestPlot({ model }: { model: Record<string, unknown> }) {
  const effects = Array.isArray(model.daoEffects) ? model.daoEffects.map(asRecord).filter(Boolean) as Record<string, unknown>[] : [];
  const estimates = effects.map(effect => Number(effect.estimate)).filter(Number.isFinite);
  const limit = Math.max(0.01, ...estimates.map(Math.abs)) * 1.4;
  return (
    <div className="space-y-1">
      {effects.map((effect, index) => {
        const estimate = Number(effect.estimate);
        const se = Number(effect.standardError);
        const x = 200 + (estimate / limit) * 170;
        const left = 200 + ((estimate - 1.96 * se) / limit) * 170;
        const right = 200 + ((estimate + 1.96 * se) / limit) * 170;
        return <svg key={index} viewBox="0 0 400 24" className="w-full" role="img" aria-label={`${effect.daoId} effect ${estimate}`}>
          <text x="4" y="16" fontSize="10" fill="currentColor">{String(effect.daoId)}</text>
          <line x1="200" y1="2" x2="200" y2="22" stroke="currentColor" opacity="0.2" />
          <line x1={left} y1="12" x2={right} y2="12" stroke="#a78bfa" strokeWidth="2" />
          <circle cx={x} cy="12" r="3.5" fill="#a78bfa" />
        </svg>;
      })}
      <p className="text-[10px]">Pooled {formatNumber(model.pooledEstimate)} · 95% CI {formatInterval(model.confidenceInterval)} · I² {formatNumber(Number(model.iSquared) * 100)}%</p>
      <details className="text-[10px]">
        <summary className="cursor-pointer">Accessible effect table</summary>
        <table className="mt-1 w-full">
          <thead><tr className="text-left"><th>DAO</th><th>Estimate</th><th>Standard error</th><th>95% CI</th></tr></thead>
          <tbody>{effects.map((effect, index) => {
            const estimate = Number(effect.estimate);
            const se = Number(effect.standardError);
            return (
              <tr key={index} className="border-t border-[var(--sim-border)]">
                <td>{String(effect.daoId)}</td>
                <td>{formatNumber(estimate)}</td>
                <td>{formatNumber(se)}</td>
                <td>[{formatNumber(estimate - 1.96 * se)}, {formatNumber(estimate + 1.96 * se)}]</td>
              </tr>
            );
          })}</tbody>
        </table>
      </details>
    </div>
  );
}

function CoefficientPlot({ model }: { model: Record<string, unknown> }) {
  const coefficients = Array.isArray(model.coefficients) ? model.coefficients.map(asRecord).filter(Boolean) as Record<string, unknown>[] : [];
  return (
    <div className="space-y-1 mb-3">
      <p className="text-xs font-mono">{String(model.outcome ?? 'Outcome')} · n={String(model.n ?? '—')}</p>
      <FactorialResponsePlot model={model} />
      {coefficients.filter(item => item.term !== '(Intercept)').map((coefficient, index) => (
        <div key={index} className="grid grid-cols-[minmax(8rem,1fr)_auto] gap-2 text-[10px] border-t border-[var(--sim-border)] py-1">
          <span className="font-mono">{String(coefficient.term)}</span>
          <span>{formatNumber(coefficient.estimate)} {formatInterval(coefficient.robustConfidenceInterval ?? coefficient.confidenceInterval)} · HC3-adjusted p {formatNumber(coefficient.adjustedPValue)}</span>
        </div>
      ))}
      <p className="text-[10px] text-[var(--sim-text-muted)] pt-1">
        Categorical reference coding with declared two-way interactions and HC3 heteroskedasticity-robust uncertainty; coefficients are conditional on the displayed reference levels.
      </p>
    </div>
  );
}

function FactorialResponsePlot({ model }: { model: Record<string, unknown> }) {
  const surface = arrayOfRecords(model.responseSurface);
  const factorNames = [...new Set(
    surface.flatMap(point => Object.keys(asRecord(point.factors) ?? {}))
  )].sort();
  const [xFactor, setXFactor] = useState(factorNames[0] ?? '');
  const [seriesFactor, setSeriesFactor] = useState(factorNames[1] ?? '');
  const [fixedSelections, setFixedSelections] = useState<Record<string, string>>({});

  if (surface.length === 0 || factorNames.length === 0) return null;
  const levels = Object.fromEntries(factorNames.map(name => [
    name,
    [...new Set(surface.map(point => String(asRecord(point.factors)?.[name])))],
  ])) as Record<string, string[]>;
  const effectiveX = factorNames.includes(xFactor) ? xFactor : factorNames[0];
  const effectiveSeries = factorNames.includes(seriesFactor) && seriesFactor !== effectiveX
    ? seriesFactor
    : factorNames.find(name => name !== effectiveX) ?? '';
  const fixedFactors = factorNames.filter(name => name !== effectiveX && name !== effectiveSeries);
  const fixed = Object.fromEntries(fixedFactors.map(name => [
    name,
    levels[name].includes(fixedSelections[name]) ? fixedSelections[name] : levels[name][0],
  ]));
  const visible = surface.map(point => {
    const factors = asRecord(point.factors) ?? {};
    const interval = asRecord(point.meanConfidenceInterval) ?? {};
    return {
      label: String(point.label),
      factors,
      xLevel: String(factors[effectiveX]),
      seriesLevel: effectiveSeries ? String(factors[effectiveSeries]) : 'Observed',
      mean: Number(point.mean),
      lower: Number(interval.lower),
      upper: Number(interval.upper),
    };
  }).filter(point =>
    Number.isFinite(point.mean)
    && Number.isFinite(point.lower)
    && Number.isFinite(point.upper)
    && fixedFactors.every(name => String(point.factors[name]) === fixed[name])
  );
  if (visible.length === 0) return null;

  const xLevels = levels[effectiveX];
  const seriesLevels = effectiveSeries ? levels[effectiveSeries] : ['Observed'];
  const yMin = Math.min(...visible.map(point => point.lower));
  const yMax = Math.max(...visible.map(point => point.upper));
  const x = (level: string) => {
    const index = Math.max(0, xLevels.indexOf(level));
    return 48 + (index / Math.max(1, xLevels.length - 1)) * 326;
  };
  const y = (value: number) => 160 - ((value - yMin) / (yMax - yMin || 1)) * 128;
  const colors = ['#60a5fa', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185'];

  return (
    <div className="my-2 rounded border border-[var(--sim-border)] p-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-[10px]">
          Horizontal factor
          <select
            className="mt-1 w-full rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] p-1"
            value={effectiveX}
            onChange={event => {
              const next = event.target.value;
              setXFactor(next);
              if (next === effectiveSeries) {
                setSeriesFactor(factorNames.find(name => name !== next) ?? '');
              }
            }}
          >
            {factorNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        {factorNames.length > 1 && (
          <label className="text-[10px]">
            Line factor
            <select
              className="mt-1 w-full rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] p-1"
              value={effectiveSeries}
              onChange={event => setSeriesFactor(event.target.value)}
            >
              {factorNames.filter(name => name !== effectiveX)
                .map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        )}
      </div>
      {fixedFactors.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {fixedFactors.map(name => (
            <label className="text-[10px]" key={name}>
              Hold {name}
              <select
                className="mt-1 w-full rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] p-1"
                value={fixed[name]}
                onChange={event => setFixedSelections(current => ({
                  ...current,
                  [name]: event.target.value,
                }))}
              >
                {levels[name].map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <svg
        viewBox="0 0 420 205"
        className="w-full h-auto mt-2"
        role="img"
        aria-label={`Observed ${String(model.outcome)} response by ${effectiveX} and ${effectiveSeries || 'condition'} with 95% confidence intervals`}
      >
        <title>Observed condition means and 95% confidence intervals</title>
        {[0, 0.5, 1].map(fraction => {
          const value = yMin + fraction * (yMax - yMin);
          return (
            <g key={fraction}>
              <line x1="44" x2="382" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.12" />
              <text x="40" y={y(value) + 3} textAnchor="end" fontSize="9" fill="currentColor">
                {formatNumber(value)}
              </text>
            </g>
          );
        })}
        {seriesLevels.map((series, seriesIndex) => {
          const points = xLevels.map(level =>
            visible.find(point => point.xLevel === level && point.seriesLevel === series)
          ).filter((point): point is NonNullable<typeof point> => Boolean(point));
          const color = colors[seriesIndex % colors.length];
          return (
            <g key={series}>
              <polyline
                points={points.map(point => `${x(point.xLevel)},${y(point.mean)}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
              />
              {points.map(point => (
                <g key={point.label}>
                  <line x1={x(point.xLevel)} x2={x(point.xLevel)} y1={y(point.lower)} y2={y(point.upper)} stroke={color} />
                  <line x1={x(point.xLevel) - 3} x2={x(point.xLevel) + 3} y1={y(point.lower)} y2={y(point.lower)} stroke={color} />
                  <line x1={x(point.xLevel) - 3} x2={x(point.xLevel) + 3} y1={y(point.upper)} y2={y(point.upper)} stroke={color} />
                  {seriesIndex % 3 === 0
                    ? <circle cx={x(point.xLevel)} cy={y(point.mean)} r="4" fill={color} />
                    : seriesIndex % 3 === 1
                      ? <rect x={x(point.xLevel) - 4} y={y(point.mean) - 4} width="8" height="8" fill={color} />
                      : <path d={`M ${x(point.xLevel)} ${y(point.mean) - 5} l 5 9 h -10 z`} fill={color} />}
                </g>
              ))}
            </g>
          );
        })}
        {xLevels.map(level => (
          <text key={level} x={x(level)} y="178" textAnchor="middle" fontSize="9" fill="currentColor">
            {level.length > 14 ? `${level.slice(0, 12)}…` : level}
          </text>
        ))}
        <text x="210" y="196" textAnchor="middle" fontSize="9" fill="currentColor">{effectiveX}</text>
      </svg>
      <div className="flex flex-wrap gap-3 text-[10px]" aria-label="Line factor legend">
        {seriesLevels.map((series, index) => (
          <span key={series} className="inline-flex items-center gap-1">
            <span
              className={index % 3 === 0 ? 'rounded-full' : ''}
              style={{ width: 8, height: 8, background: colors[index % colors.length] }}
              aria-hidden="true"
            />
            {effectiveSeries ? `${effectiveSeries}=${series}` : series}
          </span>
        ))}
      </div>
      <details className="mt-2 text-[10px]">
        <summary className="cursor-pointer">Accessible response table</summary>
        <div className="mt-1 max-h-56 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th>{effectiveX}</th>
                {effectiveSeries && <th>{effectiveSeries}</th>}
                <th>Mean</th><th>95% CI</th>
              </tr>
            </thead>
            <tbody>{visible.map(point => (
              <tr key={point.label} className="border-t border-[var(--sim-border)]">
                <td>{point.xLevel}</td>
                {effectiveSeries && <td>{point.seriesLevel}</td>}
                <td>{formatNumber(point.mean)}</td>
                <td>[{formatNumber(point.lower)}, {formatNumber(point.upper)}]</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
      <p className="text-[10px] text-[var(--sim-text-muted)] mt-1">
        Points are raw condition means; bars are 95% mean intervals. Use the held-factor controls to inspect declared interactions without averaging over other mechanisms.
      </p>
    </div>
  );
}

function TimeSeriesExplorer({ series }: { series: Record<string, unknown>[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [metric, setMetric] = useState('treasuryFunds');
  const selected = series[Math.min(selectedIndex, series.length - 1)] ?? {};
  const points = arrayOfRecords(selected.points);
  const availableMetrics = points.length > 0
    ? Object.keys(asRecord(points[0].metrics) ?? {})
    : [];
  const selectedMetric = availableMetrics.includes(metric) ? metric : availableMetrics[0];
  const values = points.map(point => {
    const summary = asRecord(asRecord(point.metrics)?.[selectedMetric]) ?? {};
    const interval = asRecord(summary.meanConfidenceInterval) ?? {};
    return {
      step: Number(point.step),
      mean: Number(summary.mean),
      lower: Number(interval.lower),
      upper: Number(interval.upper),
    };
  }).filter(point =>
    Number.isFinite(point.step)
    && Number.isFinite(point.mean)
    && Number.isFinite(point.lower)
    && Number.isFinite(point.upper)
  );
  const annotations = arrayOfRecords(selected.eventAnnotations);
  const xMin = Math.min(...values.map(value => value.step), 0);
  const xMax = Math.max(...values.map(value => value.step), 1);
  const yMin = Math.min(...values.map(value => value.lower), 0);
  const yMax = Math.max(...values.map(value => value.upper), 1);
  const x = (value: number) => 36 + ((value - xMin) / (xMax - xMin || 1)) * 344;
  const y = (value: number) => 155 - ((value - yMin) / (yMax - yMin || 1)) * 135;
  const band = [
    ...values.map(value => `${x(value.step)},${y(value.upper)}`),
    ...[...values].reverse().map(value => `${x(value.step)},${y(value.lower)}`),
  ].join(' ');
  const line = values.map(value => `${x(value.step)},${y(value.mean)}`).join(' ');

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-2 mb-2">
        <label className="text-[10px]">
          Condition
          <select
            className="mt-1 w-full rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] p-1"
            value={selectedIndex}
            onChange={event => setSelectedIndex(Number(event.target.value))}
          >
            {series.map((item, index) => (
              <option key={`${String(item.experimentId)}-${String(item.condition)}`} value={index}>
                {String(item.experimentId)} · {String(item.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px]">
          Metric
          <select
            className="mt-1 w-full rounded border border-[var(--sim-border)] bg-[var(--sim-surface)] p-1"
            value={selectedMetric}
            onChange={event => setMetric(event.target.value)}
          >
            {availableMetrics.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      {values.length > 0 && (
        <svg viewBox="0 0 400 180" className="w-full" role="img" aria-label={`${selectedMetric} mean trajectory with 95% uncertainty`}>
          <line x1="36" y1="155" x2="380" y2="155" stroke="currentColor" opacity="0.35" />
          <line x1="36" y1="20" x2="36" y2="155" stroke="currentColor" opacity="0.35" />
          <polygon points={band} fill="#40e8ff" opacity="0.18" />
          <polyline points={line} fill="none" stroke="#40e8ff" strokeWidth="2" />
          {annotations.map((annotation, index) => {
            const step = Number(annotation.step);
            if (!Number.isFinite(step)) return null;
            return (
              <g key={index}>
                <line x1={x(step)} y1="20" x2={x(step)} y2="155" stroke="#fbbf24" strokeDasharray="4 3" />
                <title>{String(annotation.label)}</title>
              </g>
            );
          })}
          <text x="36" y="172" fontSize="9" fill="currentColor">{xMin} h</text>
          <text x="350" y="172" fontSize="9" fill="currentColor">{xMax} h</text>
          <text x="2" y="24" fontSize="9" fill="currentColor">{formatNumber(yMax)}</text>
          <text x="2" y="155" fontSize="9" fill="currentColor">{formatNumber(yMin)}</text>
        </svg>
      )}
      <p className="text-[10px] text-[var(--sim-text-muted)]">
        {String(selected.intervalMethod ?? 'No interval method recorded.')}
        {annotations.length > 0 ? ` ${annotations.length} scheduled event annotation(s) shown as dashed lines.` : ''}
      </p>
      <details className="mt-2 text-[10px]">
        <summary className="cursor-pointer">Accessible trajectory table</summary>
        <div className="mt-1 max-h-56 overflow-auto">
          <table className="w-full">
            <thead><tr className="text-left"><th>Step</th><th>Mean</th><th>95% CI</th></tr></thead>
            <tbody>{values.map(value => (
              <tr key={value.step} className="border-t border-[var(--sim-border)]">
                <td>{value.step}</td>
                <td>{formatNumber(value.mean)}</td>
                <td>[{formatNumber(value.lower)}, {formatNumber(value.upper)}]</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function ClaimCards({
  registry,
  metrics,
  onMetricSelect,
}: {
  registry: Record<string, unknown> | null;
  metrics: MetricDefinition[];
  onMetricSelect: (metric: MetricDefinition) => void;
}) {
  const claims = arrayOfRecords(registry?.claims);
  if (claims.length === 0) {
    return <p className="text-xs text-[var(--sim-text-muted)]">No structured claims are indexed.</p>;
  }
  return (
    <div className="space-y-2 max-h-[36rem] overflow-auto pr-1">
      {claims.map(claim => {
        const outcome = asRecord(claim.outcome) ?? {};
        const source = asRecord(claim.source) ?? {};
        const metric = metrics.find(candidate => candidate.id === outcome.metricId);
        const runIds = Array.isArray(source.runIds) ? source.runIds.map(String) : [];
        return (
          <article key={String(claim.id)} className="rounded border border-[var(--sim-border)] p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px]">{String(claim.id)}</span>
              <span className="rounded border px-1.5 py-0.5 text-[9px]">{String(claim.status)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed">{String(claim.text)}</p>
            <p className="mt-1 text-[10px] text-[var(--sim-text-muted)]">{String(claim.interpretation)}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[9px]">
              {metric && (
                <button className="underline" onClick={() => onMetricSelect(metric)}>
                  {metric.id} v{metric.definitionVersion}
                </button>
              )}
              <span>{runIds.length} source runs</span>
              <span className="font-mono">analysis {String(source.analysisSha256 ?? '').slice(0, 12)}…</span>
            </div>
            <details className="mt-2 text-[9px]">
              <summary className="cursor-pointer">Traceability</summary>
              <p className="mt-1 break-all">Artifact: {String(source.analysisArtifact)}</p>
              <p className="break-all">Runs: {runIds.join(', ')}</p>
            </details>
          </article>
        );
      })}
    </div>
  );
}

function EvidencePanel({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return <section className="evidence-card p-4"><h2 className="text-sm font-semibold mb-2">{title}</h2>{empty ? <p className="text-xs text-[var(--sim-text-muted)]">No verified artifact for this view.</p> : children}</section>;
}

function EvidenceState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="h-full flex items-center justify-center bg-[var(--sim-bg)] p-6"><div className="evidence-card p-6 max-w-lg text-center"><h1 className="font-semibold">{title}</h1><p className="text-sm text-[var(--sim-text-muted)] mt-2">{detail}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null)
    : [];
}

function formatNumber(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) < 0.001 && number !== 0) return number.toExponential(2);
  return number.toFixed(3);
}

function formatInterval(value: unknown): string {
  const interval = asRecord(value);
  return interval ? `[${formatNumber(interval.lower)}, ${formatNumber(interval.upper)}]` : '[—, —]';
}
