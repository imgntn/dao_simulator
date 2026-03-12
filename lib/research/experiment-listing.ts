/**
 * Shared experiment listing utilities.
 * Used by both the console page (server-rendered) and API routes.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { projectRoot, projectPath } from '@/lib/utils/server-paths';

export interface ExperimentConfigSummary {
  id: string;
  path: string;
  name: string;
  description: string;
  tags: string[];
  sweepParameter?: string;
  runsPerConfig?: number;
  stepsPerRun?: number;
  workers?: number;
  sweepType?: 'single' | 'grid' | 'zip' | 'none';
}

export interface ResultSummary {
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
  hasSummary: boolean;
}

export function parseExperimentConfig(filePath: string): ExperimentConfigSummary {
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
  const executionValue = parsed['execution'] as Record<string, unknown> | undefined;

  const relativePath = path.relative(projectRoot(), filePath).replace(/\\/g, '/');
  const name = typeof nameValue === 'string' ? nameValue : path.basename(filePath);
  const description = typeof descriptionValue === 'string' ? descriptionValue : '';
  const tags = Array.isArray(tagsValue) ? tagsValue.filter((tag): tag is string => typeof tag === 'string') : [];

  const sweepParameter = (() => {
    if (!sweepValue || typeof sweepValue !== 'object') return undefined;
    const parameter = (sweepValue as Record<string, unknown>)['parameter'];
    return typeof parameter === 'string' ? parameter : undefined;
  })();

  const sweepType = (() => {
    if (!sweepValue || typeof sweepValue !== 'object') return 'none' as const;
    const sv = sweepValue as Record<string, unknown>;
    if (sv['grid']) return 'grid' as const;
    if (sv['type'] === 'zip') return 'zip' as const;
    if (sv['parameter']) return 'single' as const;
    return 'none' as const;
  })();

  const runsPerConfig = executionValue && typeof executionValue['runsPerConfig'] === 'number'
    ? executionValue['runsPerConfig'] : undefined;
  const stepsPerRun = executionValue && typeof executionValue['stepsPerRun'] === 'number'
    ? executionValue['stepsPerRun'] : undefined;
  const workers = executionValue && typeof executionValue['workers'] === 'number'
    ? executionValue['workers'] : undefined;

  return {
    id: relativePath, path: relativePath, name, description, tags,
    sweepParameter, runsPerConfig, stepsPerRun, workers, sweepType,
  };
}

export function listExperimentConfigs(): ExperimentConfigSummary[] {
  if (!fs.existsSync(projectPath('experiments'))) return [];

  const configs: ExperimentConfigSummary[] = [];
  const stack = [projectPath('experiments')];

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

export function listResults(stateFilter?: string): ResultSummary[] {
  if (!fs.existsSync(projectPath('results'))) return [];

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

  const dirs = collectResultDirs(projectPath('results'));

  const results = dirs.map((relativePath) => {
    const resultDir = path.join(projectPath('results'), relativePath);
    const statusPath = path.join(resultDir, 'status.json');
    const summaryPath = path.join(resultDir, 'summary.json');
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
      hasSummary: fs.existsSync(summaryPath),
    };
  }).sort((a, b) => a.path.localeCompare(b.path));

  if (stateFilter) {
    return results.filter(r => r.state === stateFilter);
  }
  return results;
}
