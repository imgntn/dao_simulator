import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import Link from 'next/link';

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
  let parsed: any = {};

  try {
    parsed = ext === '.json' ? JSON.parse(raw) : yaml.parse(raw);
  } catch {
    parsed = {};
  }

  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const name = typeof parsed?.name === 'string' ? parsed.name : path.basename(filePath);
  const description = typeof parsed?.description === 'string' ? parsed.description : '';
  const tags = Array.isArray(parsed?.tags) ? parsed.tags.filter((tag: unknown) => typeof tag === 'string') : [];
  const sweepParameter = typeof parsed?.sweep?.parameter === 'string' ? parsed.sweep.parameter : undefined;

  return {
    id: relativePath,
    path: relativePath,
    name,
    description,
    tags,
    sweepParameter,
  };
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

export default function Home({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const configs = listExperimentConfigs();
  const results = listResults();
  const action = getParam(searchParams?.action);
  const target = getParam(searchParams?.target);
  const pid = getParam(searchParams?.pid);
  const log = getParam(searchParams?.log);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">DAO Research Console</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-100">Experiment Management</h1>
          <p className="text-slate-400 max-w-2xl">
            Manage experiment runs, review results, generate reports, and update paper artifacts.
            All actions run locally and write logs to the results directory.
          </p>
        </header>

        {(action || log || pid) && (
          <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
            <p className="font-medium">Latest action queued</p>
            <div className="mt-2 space-y-1 text-slate-400">
              {action && <p>Action: {action}</p>}
              {target && <p>Target: {target}</p>}
              {pid && <p>PID: {pid}</p>}
              {log && <p>Log: {log}</p>}
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Run Experiments</h2>
            <p className="text-sm text-slate-400">
              Select a configuration file to start or resume a batch run.
            </p>
            <form action="/api/research" method="post" className="space-y-3">
              <input type="hidden" name="action" value="run" />
              <label className="block text-xs uppercase tracking-wide text-slate-500">Experiment Config</label>
              <select
                name="configPath"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="" disabled>Select a config</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.path}>
                    {config.path}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500"
                >
                  Run
                </button>
              </div>
            </form>

            <form action="/api/research" method="post" className="space-y-3 pt-3 border-t border-slate-800">
              <input type="hidden" name="action" value="resume" />
              <label className="block text-xs uppercase tracking-wide text-slate-500">Resume Config</label>
              <select
                name="configPath"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="" disabled>Select a config</option>
                {configs.map((config) => (
                  <option key={`${config.id}-resume`} value={config.path}>
                    {config.path}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Resume
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Reports</h2>
            <p className="text-sm text-slate-400">
              Generate research-quality reports from existing results.
            </p>
            <form action="/api/research" method="post" className="space-y-3">
              <input type="hidden" name="action" value="report" />
              <label className="block text-xs uppercase tracking-wide text-slate-500">Results Directory</label>
              <select
                name="resultsDir"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
                className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Generate Report
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Paper Pipeline</h2>
          <p className="text-sm text-slate-400">
            Update the academic paper from the latest results, compile PDFs, and archive releases.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <label className="block text-xs uppercase tracking-wide text-slate-500">
              Paper Profile
              <select
                name="paperProfile"
                form="paper-update-form"
                defaultValue="full"
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
                className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-900 hover:bg-white"
              >
                Update Paper
              </button>
            </form>
            <form action="/api/research" method="post">
              <input type="hidden" name="action" value="paper-compile" />
              <input type="hidden" name="paperProfile" value="full" />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Compile Full
              </button>
            </form>
            <form action="/api/research" method="post">
              <input type="hidden" name="action" value="paper-compile" />
              <input type="hidden" name="paperProfile" value="p1" />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Compile P1
              </button>
            </form>
            <form action="/api/research" method="post">
              <input type="hidden" name="action" value="paper-compile" />
              <input type="hidden" name="paperProfile" value="p2" />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Compile P2
              </button>
            </form>
            <form action="/api/research" method="post">
              <input type="hidden" name="action" value="paper-compile" />
              <input type="hidden" name="paperProfile" value="llm" />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Compile LLM
              </button>
            </form>
            <form action="/api/research" method="post">
              <input type="hidden" name="action" value="paper-archive" />
              <input type="hidden" name="paperProfile" value="all" />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md border border-slate-700 text-slate-200 hover:border-slate-500"
              >
                Archive All
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Experiment Configs</h2>
            <span className="text-xs text-slate-500">{configs.length} configs</span>
          </div>
          {configs.length === 0 ? (
            <p className="text-sm text-slate-500">No experiment configs found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
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
                    <tr key={config.id} className="border-b border-slate-900">
                      <td className="py-2 pr-4 text-slate-300">{config.path}</td>
                      <td className="py-2 pr-4 text-slate-200">{config.name}</td>
                      <td className="py-2 pr-4 text-slate-500">{config.description || '-'}</td>
                      <td className="py-2 pr-4 text-slate-500">{config.sweepParameter || '-'}</td>
                      <td className="py-2 text-slate-500">{config.tags.join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Results Archive</h2>
            <span className="text-xs text-slate-500">{results.length} result sets</span>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-slate-500">No results found in ./results.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800">
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
                    <tr key={result.id} className="border-b border-slate-900">
                      <td className="py-2 pr-4 text-slate-200">
                        {result.path.includes('/') ? (
                          <span>{result.path}</span>
                        ) : (
                          <Link href={`/results/${result.name}`} className="text-blue-400 hover:text-blue-300">
                            {result.path}
                          </Link>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">{result.state}</td>
                      <td className="py-2 pr-4 text-slate-400">
                        {result.progress !== null
                          ? `${result.progress.toFixed(1)}% (${result.completedRuns ?? 0}/${result.totalRuns ?? 0})`
                          : '-'}
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{result.lastUpdate ?? '-'}</td>
                      <td className="py-2 text-slate-500">
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

        <footer className="text-xs text-slate-600">
          Workspace: {ROOT_DIR}
        </footer>
      </div>
    </div>
  );
}
