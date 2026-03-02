import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { getMessages, isValidLocale, defaultLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Console',
  robots: { index: false },
};

const ROOT_DIR = process.cwd();
const EXPERIMENTS_DIR = path.join(ROOT_DIR, 'experiments');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');

type ExperimentConfigSummary = {
  id: string;
  path: string;
  name: string;
  description: string;
  tags: string[];
  sweepParameter?: string;
};

type ResultSummary = {
  id: string;
  path: string;
  name: string;
  state: string;
  progress: number | null;
  completedRuns: number | null;
  totalRuns: number | null;
  lastUpdate: string | null;
  hasReport: boolean;
  hasQualityReport: boolean;
};

function parseExperimentConfig(filePath: string): ExperimentConfigSummary {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  let parsed: Record<string, unknown> = {};

  try {
    parsed = ext === '.json' ? JSON.parse(raw) : yaml.parse(raw);
  } catch {
    parsed = {};
  }

  const nameValue = parsed['name'];
  const descriptionValue = parsed['description'];
  const tagsValue = parsed['tags'];
  const sweepValue = parsed['sweep'];

  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const name = typeof nameValue === 'string' ? nameValue : path.basename(filePath);
  const description = typeof descriptionValue === 'string' ? descriptionValue : '';
  const tags = Array.isArray(tagsValue) ? tagsValue.filter((tag): tag is string => typeof tag === 'string') : [];

  const sweepParameter = (() => {
    if (!sweepValue || typeof sweepValue !== 'object') return undefined;
    const parameter = (sweepValue as Record<string, unknown>)['parameter'];
    return typeof parameter === 'string' ? parameter : undefined;
  })();

  return { id: relativePath, path: relativePath, name, description, tags, sweepParameter };
}

function listExperimentConfigs(): ExperimentConfigSummary[] {
  if (!fs.existsSync(EXPERIMENTS_DIR)) return [];

  const configs: ExperimentConfigSummary[] = [];
  const stack = [EXPERIMENTS_DIR];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
          configs.push(parseExperimentConfig(fullPath));
        }
      }
    }
  }

  return configs.sort((a, b) => a.path.localeCompare(b.path));
}

function listResults(): ResultSummary[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];

  function collectResultDirs(baseDir: string, relativeDir = '', depth = 0): string[] {
    if (depth > 4) return [];
    const currentDir = path.join(baseDir, relativeDir);
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const found: string[] = [];

    const hasArtifacts = ['summary.json', 'status.json'].some((file) =>
      fs.existsSync(path.join(currentDir, file))
    );
    if (hasArtifacts && relativeDir) {
      found.push(relativeDir.replace(/\\/g, '/'));
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const childRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      found.push(...collectResultDirs(baseDir, childRelative, depth + 1));
    }

    return found;
  }

  const dirs = collectResultDirs(RESULTS_DIR);

  return dirs.map((relativePath) => {
    const resultDir = path.join(RESULTS_DIR, relativePath);
    const statusPath = path.join(resultDir, 'status.json');
    const reportPath = path.join(resultDir, 'report.md');
    const qualityReportPath = path.join(resultDir, 'research-quality-report.md');

    let state = 'unknown';
    let progress: number | null = null;
    let completedRuns: number | null = null;
    let totalRuns: number | null = null;
    let lastUpdate: string | null = null;

    if (fs.existsSync(statusPath)) {
      try {
        const status = JSON.parse(fs.readFileSync(statusPath, 'utf8')) as {
          state?: string;
          lastUpdate?: string;
          progress?: {
            completedRuns?: number;
            totalRuns?: number;
            percentComplete?: number;
          };
        };
        state = status.state ?? state;
        lastUpdate = status.lastUpdate ?? null;
        progress = typeof status.progress?.percentComplete === 'number'
          ? status.progress.percentComplete
          : null;
        completedRuns = typeof status.progress?.completedRuns === 'number'
          ? status.progress.completedRuns
          : null;
        totalRuns = typeof status.progress?.totalRuns === 'number'
          ? status.progress.totalRuns
          : null;
      } catch {
        state = 'invalid_status';
      }
    }

    return {
      id: relativePath,
      path: relativePath,
      name: path.basename(relativePath),
      state,
      progress,
      completedRuns,
      totalRuns,
      lastUpdate,
      hasReport: fs.existsSync(reportPath) || fs.existsSync(qualityReportPath),
      hasQualityReport: fs.existsSync(qualityReportPath),
    };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

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
          <label className="block text-xs uppercase tracking-wide text-[var(--text-faint)]">
            Paper Profile
            <select
              name="paperProfile"
              form="paper-update-form"
              defaultValue="full"
              className="mt-2 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-warm-deep)] px-3 py-2 text-sm text-[var(--text-body-secondary)]"
            >
              <option value="full">full (paper/)</option>
              <option value="p1">p1 (paper_p1/)</option>
              <option value="p2">p2 (paper_p2/)</option>
              <option value="llm">llm (paper_llm/)</option>
            </select>
          </label>
          <form id="paper-update-form" action="/api/research" method="post">
            <input type="hidden" name="action" value="paper-update" />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--text-heading)] text-[var(--surface-page)] hover:opacity-90"
            >
              {m.console?.updatePaper ?? 'Update Paper'}
            </button>
          </form>
          {['full', 'p1', 'p2', 'llm'].map((profile) => (
            <form key={profile} action="/api/research" method="post">
              <input type="hidden" name="action" value="paper-compile" />
              <input type="hidden" name="paperProfile" value={profile} />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-body-secondary)] hover:border-[var(--accent-teal)]"
              >
                {m.console?.compileLabel ?? 'Compile'} {profile.toUpperCase()}
              </button>
            </form>
          ))}
          <form action="/api/research" method="post">
            <input type="hidden" name="action" value="paper-archive" />
            <input type="hidden" name="paperProfile" value="all" />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border-strong)] text-[var(--text-body-secondary)] hover:border-[var(--accent-teal)]"
            >
              {m.console?.archiveAll ?? 'Archive All'}
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
