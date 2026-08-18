import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type {
  BuiltinMetricType,
  ExperimentConfig,
  ResearchDesignMetadata,
} from './experiment-config';
import { ExperimentRunner } from './experiment-runner';
import { BatchRunner } from './batch-runner';
import { validateExperimentConfig } from './experiment-config-validator';
import { canonicalJson, sha256, writeJsonAtomic } from './campaign-manifest';
import { METRIC_REGISTRY } from './metric-registry';

export interface ExperimentCatalogEntry {
  id: string;
  idSource: 'declared' | 'filename';
  name: string;
  configPath: string;
  configSha256: string;
  outputDirectory: string;
  classification: ResearchDesignMetadata['classification'];
  publicationRole: ResearchDesignMetadata['publicationRole'];
  purpose: string;
  researchQuestionIds: string[];
  hypothesis: string | null;
  primaryOutcome: BuiltinMetricType | null;
  secondaryOutcomes: BuiltinMetricType[];
  smallestEffectOfInterest: ResearchDesignMetadata['smallestEffectOfInterest'] | null;
  analysisFamily: string | null;
  experimentalUnit: string;
  conditionCount: number;
  conditionLabels: string[];
  replicatesPerCondition: number;
  expectedRuns: number;
  seedStrategy: string;
  replicateSeeds: number[];
  stepsPerRun: number;
  workerCount: number;
  estimatedRuntimeMinutes: number | null;
  outcomes: Array<{
    id: BuiltinMetricType;
    label: string;
    definitionVersion: string;
    unit: string;
  }>;
}

export interface ExperimentCatalog {
  schemaVersion: '1.1.0';
  generatedAt: string;
  sourceRoot: string;
  experimentCount: number;
  confirmatoryCount: number;
  exploratoryCount: number;
  publicationRoleCounts: Record<ResearchDesignMetadata['publicationRole'], number>;
  expectedRunCount: number;
  entries: ExperimentCatalogEntry[];
}

export function discoverExperimentConfigs(
  rootDir: string,
  relativeDirectory = path.join('experiments', 'paper')
): string[] {
  const directory = path.resolve(rootDir, relativeDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^\d[\da-z]*-.*\.ya?ml$/i.test(entry.name))
    .map(entry => path.join(relativeDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export function buildExperimentCatalog(
  rootDir: string,
  configPaths = discoverExperimentConfigs(rootDir),
  options: { generatedAt?: string } = {}
): ExperimentCatalog {
  const entries = configPaths.map(configPath =>
    buildCatalogEntry(rootDir, configPath)
  );
  assertUnique(entries, 'id', entry => entry.id);
  assertUnique(entries, 'name', entry => entry.name);
  assertUnique(entries, 'output directory', entry =>
    path.normalize(entry.outputDirectory).toLowerCase()
  );

  return {
    schemaVersion: '1.1.0',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    sourceRoot: '.',
    experimentCount: entries.length,
    confirmatoryCount: entries.filter(entry => entry.classification === 'confirmatory').length,
    exploratoryCount: entries.filter(entry => entry.classification === 'exploratory').length,
    publicationRoleCounts: countPublicationRoles(entries),
    expectedRunCount: entries.reduce((sum, entry) => sum + entry.expectedRuns, 0),
    entries,
  };
}

function buildCatalogEntry(rootDir: string, configPath: string): ExperimentCatalogEntry {
  const absolutePath = path.resolve(rootDir, configPath);
  const config = yaml.parse(fs.readFileSync(absolutePath, 'utf8')) as ExperimentConfig;
  validateExperimentConfig(config);
  const runner = new ExperimentRunner(config);
  const conditions = runner.generateConfigs();
  const tasks = new BatchRunner(config, { concurrency: 1 }).generateTasks();
  const expectedRuns = conditions.length * config.execution.runsPerConfig;
  if (tasks.length !== expectedRuns) {
    throw new Error(
      `${configPath} task-plan mismatch: conditions imply ${expectedRuns}, generated ${tasks.length}`
    );
  }
  const taskIds = new Set(tasks.map(task => task.id));
  if (taskIds.size !== tasks.length) {
    throw new Error(`${configPath} generates duplicate run IDs`);
  }

  const fileId = path.basename(configPath).replace(/\.ya?ml$/i, '');
  const research = config.research;
  const conditionLabels = conditions.map(condition =>
    condition.sweepValue === undefined ? 'baseline' : String(condition.sweepValue)
  );
  const replicateSeeds = Array.from(
    new Set(tasks.slice(0, config.execution.runsPerConfig).map(task => task.seed))
  );
  const outcomes = config.metrics.flatMap(metric => {
    if (metric.type !== 'builtin' || !metric.builtin) return [];
    const definition = METRIC_REGISTRY[metric.builtin];
    return [{
      id: metric.builtin,
      label: metric.name,
      definitionVersion: definition.definitionVersion,
      unit: definition.unit,
    }];
  });

  return {
    id: config.id ?? fileId,
    idSource: config.id ? 'declared' : 'filename',
    name: config.name,
    configPath: configPath.replace(/\\/g, '/'),
    configSha256: sha256(canonicalJson(config)),
    outputDirectory: config.output.directory.replace(/\\/g, '/'),
    classification: research?.classification ?? 'legacy',
    publicationRole: research?.publicationRole ?? 'legacy-archived',
    purpose: config.description ?? config.name,
    researchQuestionIds: research?.researchQuestionIds ?? [],
    hypothesis: research?.hypothesis ?? null,
    primaryOutcome: research?.primaryOutcome ?? null,
    secondaryOutcomes: research?.secondaryOutcomes ?? [],
    smallestEffectOfInterest: research?.smallestEffectOfInterest ?? null,
    analysisFamily: research?.analysisFamily ?? null,
    experimentalUnit:
      research?.experimentalUnit
      ?? 'One seeded simulation replicate under one declared condition.',
    conditionCount: conditions.length,
    conditionLabels,
    replicatesPerCondition: config.execution.runsPerConfig,
    expectedRuns,
    seedStrategy: config.execution.seedStrategy,
    replicateSeeds,
    stepsPerRun: config.execution.stepsPerRun,
    workerCount: config.execution.workers ?? 1,
    estimatedRuntimeMinutes: research?.estimatedRuntimeMinutes ?? null,
    outcomes,
  };
}

function countPublicationRoles(
  entries: ExperimentCatalogEntry[]
): Record<ResearchDesignMetadata['publicationRole'], number> {
  const counts: Record<ResearchDesignMetadata['publicationRole'], number> = {
    'core-confirmatory': 0,
    'supporting-exploratory': 0,
    'pilot-development': 0,
    validation: 0,
    'llm-secondary': 0,
    'legacy-archived': 0,
  };
  for (const entry of entries) counts[entry.publicationRole] += 1;
  return counts;
}

function assertUnique<T>(
  entries: T[],
  label: string,
  key: (entry: T) => string
): void {
  const seen = new Map<string, number>();
  for (const entry of entries) {
    const value = key(entry);
    seen.set(value, (seen.get(value) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate experiment ${label}: ${duplicates.join(', ')}`);
  }
}

export function writeExperimentCatalog(
  rootDir: string,
  catalog: ExperimentCatalog,
  jsonPath = path.join('docs', 'experiment-catalog.json'),
  markdownPath = path.join('docs', 'EXPERIMENT_CATALOG.md')
): void {
  writeJsonAtomic(path.resolve(rootDir, jsonPath), catalog);
  const lines = [
    '# Experiment Catalog',
    '',
    `Generated: ${catalog.generatedAt}`,
    '',
    `Experiments: ${catalog.experimentCount}; expected runs: ${catalog.expectedRunCount}.`,
    '',
    '| ID | Class | Publication role | Conditions | Replicates | Runs | Primary outcome | Config |',
    '|---|---|---|---:|---:|---:|---|---|',
    ...catalog.entries.map(entry => (
      `| ${entry.id} | ${entry.classification} | ${entry.publicationRole} | ${entry.conditionCount} | `
      + `${entry.replicatesPerCondition} | ${entry.expectedRuns} | `
      + `${entry.primaryOutcome ?? 'not designated'} | ${entry.configPath} |`
    )),
    '',
    'Only entries with the explicit `core-confirmatory` publication role can support the primary confirmatory claims. Legacy studies remain reproducible but are excluded from confirmatory evidence.',
    '',
  ];
  const absoluteMarkdown = path.resolve(rootDir, markdownPath);
  fs.mkdirSync(path.dirname(absoluteMarkdown), { recursive: true });
  const temporary = `${absoluteMarkdown}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, lines.join('\n'), 'utf8');
  fs.renameSync(temporary, absoluteMarkdown);
}
