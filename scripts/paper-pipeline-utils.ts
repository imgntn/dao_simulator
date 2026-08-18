#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ExperimentRunner } from '../lib/research/experiment-runner';
import type { ExperimentConfig } from '../lib/research/experiment-config';

export type PaperProfile = 'full' | 'p1' | 'p2' | 'p3' | 'llm';

export interface PipelineProfileDefinition {
  mode?: 'discovered' | 'manual';
  include?: string[];
  exclude?: string[];
}

export interface PaperPipelineConfig {
  schemaVersion: number;
  discovery: {
    includePattern: string;
    exclude: string[];
  };
  profiles: Record<string, PipelineProfileDefinition>;
}

export interface ResolvedPaperConfig {
  configPath: string;
  outputDir: string;
  expectedRuns: number;
  parsedConfig: any;
}

export interface FreshnessIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface FreshnessResult {
  configPath: string;
  outputDir: string;
  expectedRuns: number;
  actualRuns: number;
  completedAt: string;
  issues: FreshnessIssue[];
  isFresh: boolean;
}

const KNOWN_PLACEHOLDER_MARKERS = [
  'dummyhash',
  'placeholder,0',
  '"placeholder"',
  '[PLACEHOLDER:',
] as const;

function findPlaceholderMarker(content: string): string | undefined {
  const normalized = content.toLowerCase();
  return KNOWN_PLACEHOLDER_MARKERS.find((marker) =>
    normalized.includes(marker.toLowerCase())
  );
}

const DEFAULT_CONFIG: PaperPipelineConfig = {
  schemaVersion: 1,
  discovery: {
    includePattern: '^\\d{2}-.*\\.ya?ml$',
    exclude: ['00-realistic-baseline.yaml'],
  },
  profiles: {
    full: { mode: 'discovered' },
    p1: {
      mode: 'manual',
      include: [
        '00-academic-baseline.yaml',
        '01-calibration-participation.yaml',
        '02-ablation-governance.yaml',
        '03-sensitivity-quorum.yaml',
        '04-governance-capture-mitigations.yaml',
        '05-proposal-pipeline.yaml',
        '08-scale-sweep.yaml',
        '09-voting-mechanisms.yaml',
      ],
    },
    p2: {
      mode: 'manual',
      include: [
        '00-academic-baseline.yaml',
        '02-ablation-governance.yaml',
        '06-treasury-resilience.yaml',
        '07-inter-dao-cooperation.yaml',
      ],
    },
    llm: {
      mode: 'manual',
      include: [
        '12-llm-agent-reasoning.yaml',
      ],
    },
  },
};

export function getPipelineConfigPath(rootDir: string): string {
  return path.join(rootDir, 'experiments', 'paper', 'pipeline.config.yaml');
}

export function loadPipelineConfig(rootDir: string): PaperPipelineConfig {
  const configPath = getPipelineConfigPath(rootDir);
  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const parsed = yaml.parse(fs.readFileSync(configPath, 'utf8')) as Partial<PaperPipelineConfig> | null;
  if (!parsed) {
    return DEFAULT_CONFIG;
  }

  return {
    schemaVersion: parsed.schemaVersion ?? DEFAULT_CONFIG.schemaVersion,
    discovery: {
      includePattern: parsed.discovery?.includePattern || DEFAULT_CONFIG.discovery.includePattern,
      exclude: parsed.discovery?.exclude || DEFAULT_CONFIG.discovery.exclude,
    },
    profiles: {
      ...DEFAULT_CONFIG.profiles,
      ...(parsed.profiles || {}),
    },
  };
}

export function listDiscoveredPaperConfigs(rootDir: string, pipelineConfig: PaperPipelineConfig): string[] {
  const paperDir = path.join(rootDir, 'experiments', 'paper');
  if (!fs.existsSync(paperDir)) {
    return [];
  }

  const includePattern = new RegExp(pipelineConfig.discovery.includePattern);
  const excluded = new Set(pipelineConfig.discovery.exclude);

  return fs.readdirSync(paperDir)
    .filter((file) => includePattern.test(file))
    .filter((file) => !excluded.has(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => path.join('experiments', 'paper', file));
}

function listValidationConfigs(rootDir: string): string[] {
  const validationDir = path.join(rootDir, 'experiments', 'validation');
  if (!fs.existsSync(validationDir)) {
    return [];
  }

  return fs.readdirSync(validationDir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => path.join('experiments', 'validation', file));
}

export function resolveProfileConfigPaths(
  rootDir: string,
  profile: PaperProfile,
  includeValidation: boolean
): string[] {
  const pipelineConfig = loadPipelineConfig(rootDir);
  const discovered = listDiscoveredPaperConfigs(rootDir, pipelineConfig);
  const profileDef = pipelineConfig.profiles[profile] || pipelineConfig.profiles.full;
  const mode = profileDef.mode || 'manual';

  let configs: string[];
  if (mode === 'discovered') {
    configs = [...discovered];
  } else {
    configs = (profileDef.include || []).map((file) => path.join('experiments', 'paper', file));
  }

  if (profileDef.exclude && profileDef.exclude.length > 0) {
    const excluded = new Set(profileDef.exclude.map((file) => path.join('experiments', 'paper', file)));
    configs = configs.filter((cfg) => !excluded.has(cfg));
  }

  if (includeValidation) {
    configs = [...configs, ...listValidationConfigs(rootDir)];
  }

  return configs;
}

export function sanitizeExperimentName(name: string): string {
  return String(name).replace(/[^\w-]+/g, '_').toLowerCase();
}

export function resolveOutputDir(rootDir: string, configPath: string): string {
  const absolutePath = path.resolve(rootDir, configPath);
  if (!fs.existsSync(absolutePath)) {
    return '';
  }

  const parsed = yaml.parse(fs.readFileSync(absolutePath, 'utf8'));
  const configuredOutput = parsed?.output?.directory;
  if (configuredOutput) {
    return path.isAbsolute(configuredOutput)
      ? configuredOutput
      : path.resolve(rootDir, String(configuredOutput));
  }

  if (parsed?.name) {
    return path.join(rootDir, 'results', sanitizeExperimentName(parsed.name));
  }

  return '';
}

function getSweepConfigCount(parsedConfig: any): number {
  if (parsedConfig?.mode === 'city') {
    const scenarios = parsedConfig?.scenarios;
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      throw new Error('City experiment requires at least one scenario');
    }
    return scenarios.length;
  }
  const sweep = parsedConfig?.sweep;
  if (!sweep) return 1;

  if (Array.isArray(sweep.grid) && sweep.grid.length > 0) {
    const grid = sweep.grid as Array<{ values?: unknown[]; range?: { min: number; max: number; step: number } }>;
    const counts = grid.map((entry) => {
      if (Array.isArray(entry.values) && entry.values.length > 0) return entry.values.length;
      if (entry.range && Number.isFinite(entry.range.min) && Number.isFinite(entry.range.max) && Number.isFinite(entry.range.step) && entry.range.step > 0) {
        return Math.floor((entry.range.max - entry.range.min) / entry.range.step) + 1;
      }
      return 0;
    }).filter((count) => count > 0);

    if (counts.length === 0) return 1;
    if (sweep.type === 'zip') {
      if (counts.some((count) => count !== counts[0])) {
        throw new Error('Zip sweep dimensions must have equal lengths');
      }
      return counts[0];
    }
    return counts.reduce((acc, count) => acc * count, 1);
  }

  if (Array.isArray(sweep.values) && sweep.values.length > 0) {
    return sweep.values.length;
  }

  if (Array.isArray(sweep.valueSets) && sweep.valueSets.length > 0) {
    return sweep.valueSets.length;
  }

  return 1;
}

export function calculateExpectedRuns(parsedConfig: any): number {
  const config = parsedConfig as ExperimentConfig;
  const conditions = new ExperimentRunner(config).generateConfigs();
  return conditions.length * config.execution.runsPerConfig;
}

export function resolvePaperConfig(rootDir: string, configPath: string): ResolvedPaperConfig {
  const absolutePath = path.resolve(rootDir, configPath);
  const parsedConfig = yaml.parse(fs.readFileSync(absolutePath, 'utf8'));

  return {
    configPath,
    outputDir: resolveOutputDir(rootDir, configPath),
    expectedRuns: calculateExpectedRuns(parsedConfig),
    parsedConfig,
  };
}

export function validateResultFreshness(
  rootDir: string,
  resolved: ResolvedPaperConfig
): FreshnessResult {
  const issues: FreshnessIssue[] = [];
  const configAbs = path.resolve(rootDir, resolved.configPath);
  const configMtime = fs.statSync(configAbs).mtimeMs;
  const summaryPath = path.join(resolved.outputDir, 'summary.json');
  const manifestPath = path.join(resolved.outputDir, 'manifest.json');
  const statsPath = path.join(resolved.outputDir, 'stats.csv');

  let actualRuns = 0;
  let completedAt = '';
  let summary: any = null;
  let manifest: any = null;

  if (!resolved.outputDir || !fs.existsSync(resolved.outputDir)) {
    issues.push({
      severity: 'error',
      code: 'missing_output_dir',
      message: `Missing output directory for ${resolved.configPath}: ${resolved.outputDir || '(empty)'}`,
    });
  }

  if (!fs.existsSync(summaryPath)) {
    issues.push({
      severity: 'error',
      code: 'missing_summary',
      message: `Missing summary.json for ${resolved.configPath}`,
    });
  } else {
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    const placeholderMarker = findPlaceholderMarker(summaryContent);
    if (placeholderMarker) {
      issues.push({
        severity: 'error',
        code: 'placeholder_summary',
        message: `summary.json contains known placeholder marker "${placeholderMarker}" for ${resolved.configPath}`,
      });
    }
    summary = JSON.parse(summaryContent);
    actualRuns = Number(summary?.totalRuns ?? 0);
    completedAt = String(summary?.manifest?.execution?.completedAt ?? '');

    if (!Number.isFinite(actualRuns) || actualRuns <= 0) {
      issues.push({
        severity: 'error',
        code: 'invalid_total_runs',
        message: `summary.json has invalid totalRuns for ${resolved.configPath}`,
      });
    }

    if (resolved.expectedRuns > 0 && actualRuns !== resolved.expectedRuns) {
      issues.push({
        severity: 'error',
        code: 'run_count_mismatch',
        message: `${resolved.configPath} has ${actualRuns} runs, expected exactly ${resolved.expectedRuns}`,
      });
    }

    if (!completedAt) {
      issues.push({
        severity: 'error',
        code: 'missing_completed_at',
        message: `summary.json missing manifest.execution.completedAt for ${resolved.configPath}`,
      });
    } else {
      const completedMs = new Date(completedAt).getTime();
      if (!Number.isFinite(completedMs)) {
        issues.push({
          severity: 'error',
          code: 'invalid_completed_at',
          message: `Invalid completedAt timestamp in ${resolved.configPath}`,
        });
      } else if (completedMs < configMtime) {
        issues.push({
          severity: 'error',
          code: 'stale_results',
          message: `${resolved.configPath} changed after its results were generated`,
        });
      }
    }
  }

  if (!fs.existsSync(manifestPath)) {
    issues.push({
      severity: 'warning',
      code: 'missing_manifest',
      message: `Missing manifest.json for ${resolved.configPath}`,
    });
  } else {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const placeholderMarker = findPlaceholderMarker(manifestContent);
    if (placeholderMarker) {
      issues.push({
        severity: 'error',
        code: 'placeholder_manifest',
        message: `manifest.json contains known placeholder marker "${placeholderMarker}" for ${resolved.configPath}`,
      });
    }
    manifest = JSON.parse(manifestContent);
    if (manifest?.schemaVersion !== 2) {
      issues.push({
        severity: 'error',
        code: 'unsupported_manifest_schema',
        message: `manifest.json must use reproducibility schema version 2 for ${resolved.configPath}`,
      });
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(String(manifest?.configHash ?? ''))) {
      issues.push({
        severity: 'error',
        code: 'invalid_config_hash',
        message: `manifest.json must contain a SHA-256 config hash for ${resolved.configPath}`,
      });
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(String(manifest?.resultsHash ?? ''))) {
      issues.push({
        severity: 'error',
        code: 'invalid_results_hash',
        message: `manifest.json must contain a SHA-256 results hash for ${resolved.configPath}`,
      });
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(String(manifest?.metricDefinitions?.hash ?? ''))) {
      issues.push({
        severity: 'error',
        code: 'invalid_metric_definitions_hash',
        message: `manifest.json must contain a SHA-256 metric-definitions hash for ${resolved.configPath}`,
      });
    }
    if (
      !manifest?.metricDefinitions?.versions ||
      typeof manifest.metricDefinitions.versions !== 'object'
    ) {
      issues.push({
        severity: 'error',
        code: 'missing_metric_definition_versions',
        message: `manifest.json lacks metric-definition versions for ${resolved.configPath}`,
      });
    }
    if (!manifest?.software?.gitCommit || typeof manifest?.software?.gitDirty !== 'boolean') {
      issues.push({
        severity: 'error',
        code: 'missing_git_provenance',
        message: `manifest.json lacks Git provenance for ${resolved.configPath}`,
      });
    }
    const manifestRuns = Number(manifest?.execution?.totalRuns);
    if (Number.isFinite(actualRuns) && manifestRuns !== actualRuns) {
      issues.push({
        severity: 'error',
        code: 'manifest_summary_count_mismatch',
        message: `manifest and summary run counts disagree for ${resolved.configPath}`,
      });
    }
  }

  if (!fs.existsSync(statsPath)) {
    issues.push({
      severity: 'error',
      code: 'missing_stats',
      message: `Missing stats.csv for ${resolved.configPath}`,
    });
  } else {
    const statsContent = fs.readFileSync(statsPath, 'utf8');
    const placeholderMarker = findPlaceholderMarker(statsContent);
    if (placeholderMarker) {
      issues.push({
        severity: 'error',
        code: 'placeholder_stats',
        message: `stats.csv contains known placeholder marker "${placeholderMarker}" for ${resolved.configPath}`,
      });
    }
  }

  const isFresh = !issues.some((issue) => issue.severity === 'error');
  return {
    configPath: resolved.configPath,
    outputDir: resolved.outputDir,
    expectedRuns: resolved.expectedRuns,
    actualRuns,
    completedAt,
    issues,
    isFresh,
  };
}

export function assertFreshResults(
  rootDir: string,
  configPaths: string[],
  strict: boolean
): FreshnessResult[] {
  const results = configPaths.map((configPath) =>
    validateResultFreshness(rootDir, resolvePaperConfig(rootDir, configPath))
  );

  const blocking = results.filter((result) => !result.isFresh);
  if (strict && blocking.length > 0) {
    const lines: string[] = ['Paper pipeline freshness check failed:'];
    for (const item of blocking) {
      lines.push(`- ${item.configPath}`);
      for (const issue of item.issues.filter((i) => i.severity === 'error')) {
        lines.push(`  - [${issue.code}] ${issue.message}`);
      }
    }
    throw new Error(lines.join('\n'));
  }

  return results;
}

export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n').filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = lines[i].split(',');
    let values = rawValues;
    if (rawValues.length > headers.length) {
      const runCountCandidate = rawValues[1];
      const runCountNumeric = runCountCandidate !== undefined
        && runCountCandidate !== ''
        && !Number.isNaN(Number(runCountCandidate));

      if (!runCountNumeric) {
        values = [
          rawValues.slice(0, rawValues.length - headers.length + 1).join(','),
          ...rawValues.slice(rawValues.length - headers.length + 1),
        ];
      } else {
        values = rawValues.slice(0, headers.length);
      }
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
