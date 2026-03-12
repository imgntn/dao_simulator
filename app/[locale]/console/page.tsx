import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { getMessages, isValidLocale, defaultLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { listExperimentConfigs, listResults } from '@/lib/research/experiment-listing';

export const metadata: Metadata = {
  title: 'Console',
  robots: { index: false },
};

function getParam(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
}

export default async function ConsolePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const m = getMessages(locale);
  const configs = listExperimentConfigs();
  const results = listResults();
  const action = getParam(searchParams?.action);
  const target = getParam(searchParams?.target);
  const log = getParam(searchParams?.log);

  return (
    <PageShell variant="console" locale={locale}>
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-faint)]">
          {m.console?.subtitle ?? 'DAO Research Console'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-heading)]">
          {m.console?.heading ?? 'Experiment Management'}
        </h1>
        <p className="text-[var(--text-body)] max-w-2xl">
          {m.console?.description ?? 'Manage experiment runs, review results, generate reports, and update paper artifacts. All actions run locally and write logs to the results directory.'}
        </p>
      </header>

      {(action || log) && (
        <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-body-secondary)]">
          <p className="font-medium">{m.console?.latestAction ?? 'Latest action queued'}</p>
          <div className="mt-2 space-y-1 text-[var(--text-body)]">
            {action && <p>Action: {action}</p>}
            {target && <p>Target: {target}</p>}
            {log && <p>Log: {log}</p>}
          </div>
        </section>
      )}

      {/* Quick Actions — preset experiment launchers */}
      <section className="mt-10 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-heading)]">Quick Actions</h2>
        <p className="text-sm text-[var(--text-body)]">
          Pre-configured experiment launchers for common research tasks.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Calibration Validation */}
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="run" />
            <input type="hidden" name="configPath" value="experiments/paper/10-calibration-validation.yaml" />
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border-default)] p-4 text-left transition hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/5"
            >
              <div className="text-sm font-semibold text-[var(--text-heading)]">Calibration Validation</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">All 14 DAOs vs historical data</div>
            </button>
          </form>

          {/* Cross-DAO Comparison */}
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="run" />
            <input type="hidden" name="configPath" value="experiments/paper/13-cross-dao-governance-comparison.yaml" />
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border-default)] p-4 text-left transition hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/5"
            >
              <div className="text-sm font-semibold text-[var(--text-heading)]">Cross-DAO Governance</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">14 DAOs x 4 rules (56 configs)</div>
            </button>
          </form>

          {/* Advanced Mechanisms */}
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="run" />
            <input type="hidden" name="configPath" value="experiments/paper/11-advanced-mechanisms.yaml" />
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border-default)] p-4 text-left transition hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/5"
            >
              <div className="text-sm font-semibold text-[var(--text-heading)]">Advanced Mechanisms</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">IRV, futarchy, liquid delegation</div>
            </button>
          </form>

          {/* LLM Agent Reasoning */}
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="run" />
            <input type="hidden" name="configPath" value="experiments/paper/12-llm-agent-reasoning.yaml" />
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border-default)] p-4 text-left transition hover:border-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/5"
            >
              <div className="text-sm font-semibold text-[var(--text-heading)]">LLM Agent Reasoning</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">Disabled / hybrid / all-LLM modes</div>
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Run Experiments */}
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">
            {m.console?.runExperiments ?? 'Run Experiments'}
          </h2>
          <p className="text-sm text-[var(--text-body)]">
            {m.console?.selectConfig ?? 'Select a configuration file to start or resume a batch run.'}
          </p>
          <form action="/api/research" method="post" className="space-y-3">
            <input type="hidden" name="action" value="run" />
            <label className="block text-xs uppercase tracking-wide text-[var(--text-faint)]">
              Experiment Config
            </label>
            <select
              name="configPath"
              required
              aria-describedby="config-desc"
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-warm-deep)] px-3 py-2 text-sm text-[var(--text-body-secondary)]"
            >
              <option value="" disabled>{m.console?.selectPlaceholder ?? 'Select a config'}</option>
              {configs.map((config) => (
                <option key={config.id} value={config.path}>{config.path}</option>
              ))}
            </select>
            <p id="config-desc" className="sr-only">Choose an experiment configuration file to run</p>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent-teal)] text-white hover:bg-[var(--accent-teal-hover)]"
              >
                {m.console?.run ?? 'Run'}
              </button>
            </div>
          </form>

          <form action="/api/research" method="post" className="space-y-3 pt-3 border-t border-[var(--border-default)]">
            <input type="hidden" name="action" value="resume" />
            <label className="block text-xs uppercase tracking-wide text-[var(--text-faint)]">
              {m.console?.resumeLabel ?? 'Resume Config'}
            </label>
            <select
              name="configPath"
              required
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-warm-deep)] px-3 py-2 text-sm text-[var(--text-body-secondary)]"
            >
              <option value="" disabled>{m.console?.selectPlaceholder ?? 'Select a config'}</option>
              {configs.map((config) => (
                <option key={`${config.id}-resume`} value={config.path}>{config.path}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-body-secondary)] hover:border-[var(--accent-teal)]"
            >
              {m.console?.resume ?? 'Resume'}
            </button>
          </form>
        </div>

        {/* Reports */}
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">
            {m.console?.reports ?? 'Reports'}
          </h2>
          <p className="text-sm text-[var(--text-body)]">
            {m.console?.generateReport ?? 'Generate research-quality reports from existing results.'}
          </p>
          <form action="/api/research" method="post" className="space-y-3">
            <input type="hidden" name="action" value="report" />
            <label className="block text-xs uppercase tracking-wide text-[var(--text-faint)]">
              Results Directory
            </label>
            <select
              name="resultsDir"
              required
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-warm-deep)] px-3 py-2 text-sm text-[var(--text-body-secondary)]"
            >
              <option value="" disabled>Select a result set</option>
              {results.map((result) => (
                <option key={result.id} value={`results/${result.path}`}>
                  results/{result.path}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent-teal)] text-white hover:bg-[var(--accent-teal-hover)]"
            >
              {m.console?.generateReportBtn ?? 'Generate Report'}
            </button>
          </form>
        </div>
      </section>

      {/* Paper Pipeline */}
      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-heading)]">
          {m.console?.paperPipeline ?? 'Paper Pipeline'}
        </h2>
        <p className="text-sm text-[var(--text-body)]">
          {m.console?.paperPipelineDesc ?? 'Update the academic paper from the latest results, compile PDFs, and archive releases.'}
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="paper-update" />
            <input type="hidden" name="paperProfile" value="full" />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--text-heading)] text-[var(--surface-page)] hover:opacity-90"
            >
              {m.console?.updatePaper ?? 'Update Paper'}
            </button>
          </form>
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="paper-compile" />
            <input type="hidden" name="paperProfile" value="full" />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-body-secondary)] hover:border-[var(--accent-teal)]"
            >
              {m.console?.compileLabel ?? 'Compile'}
            </button>
          </form>
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="paper-archive" />
            <input type="hidden" name="paperProfile" value="full" />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-body-secondary)] hover:border-[var(--accent-teal)]"
            >
              {m.console?.archiveAll ?? 'Archive'}
            </button>
          </form>
        </div>
      </section>

      {/* Experiment Configs */}
      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">
            {m.console?.experimentConfigs ?? 'Experiment Configs'}
          </h2>
          <span className="text-xs text-[var(--text-faint)]">
            {configs.length} {m.console?.configCount ?? 'configs'}
          </span>
        </div>
        {configs.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">
            {m.console?.noConfigs ?? 'No experiment configs found.'}
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-[var(--text-faint)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="text-left py-2 pr-4">Path</th>
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Description</th>
                  <th className="text-left py-2 pr-4">Sweep</th>
                  <th className="text-left py-2">Tags</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-4 text-[var(--text-body-secondary)]">{config.path}</td>
                    <td className="py-2 pr-4 text-[var(--text-heading)]">{config.name}</td>
                    <td className="py-2 pr-4 text-[var(--text-faint)]">{config.description || '-'}</td>
                    <td className="py-2 pr-4 text-[var(--text-faint)]">{config.sweepParameter || '-'}</td>
                    <td className="py-2 text-[var(--text-faint)]">{config.tags.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Results Archive */}
      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">
            {m.console?.resultsArchive ?? 'Results Archive'}
          </h2>
          <span className="text-xs text-[var(--text-faint)]">
            {results.length} {m.console?.resultCount ?? 'result sets'}
          </span>
        </div>
        {results.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">
            {m.console?.noResults ?? 'No results found in ./results.'}
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-[var(--text-faint)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="text-left py-2 pr-4">Result</th>
                  <th className="text-left py-2 pr-4">State</th>
                  <th className="text-left py-2 pr-4">Progress</th>
                  <th className="text-left py-2 pr-4">Last Update</th>
                  <th className="text-left py-2">Reports</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 pr-4 text-[var(--text-heading)]">
                      {result.path.includes('/') ? (
                        <span>{result.path}</span>
                      ) : (
                        <Link href={`/${locale}/results/${result.name}`} className="text-[var(--accent-teal)] hover:text-[var(--accent-teal-hover)]">
                          {result.path}
                        </Link>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-body)]">{result.state}</td>
                    <td className="py-2 pr-4 text-[var(--text-body)]">
                      {result.progress !== null
                        ? `${result.progress.toFixed(1)}% (${result.completedRuns ?? 0}/${result.totalRuns ?? 0})`
                        : '-'}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-faint)]">{result.lastUpdate ?? '-'}</td>
                    <td className="py-2 text-[var(--text-faint)]">
                      {result.hasReport ? 'report.md' : '-'}
                      {result.hasQualityReport ? `${result.hasReport ? ', ' : ''}research-quality-report.md` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
