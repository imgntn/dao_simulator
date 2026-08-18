#!/usr/bin/env npx tsx

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BatchRunner, type BatchResult } from '../lib/research/batch-runner';
import type { ExperimentConfig, RunResult } from '../lib/research/experiment-config';
import { validateExperimentConfig } from '../lib/research/experiment-config-validator';
import { loadSelectedExperimentConfigs } from '../lib/research/experiment-config-selection';
import {
  assertRunMatchesPlan,
  buildCampaignAnalysis,
  campaignConditionId,
  campaignRunConditionId,
  type CampaignExperimentInput,
} from '../lib/research/campaign-analysis';
import {
  createCampaign,
  assertResumeIdentity,
  collectProvenance,
  copyFileAtomic,
  indexCampaignArtifact,
  indexRunArtifacts,
  loadCampaign,
  recordFailedRun,
  resolveFailedRun,
  sha256File,
  transitionCampaign,
  verifyCampaign,
  writeJsonAtomic,
} from '../lib/research/campaign-manifest';
import { buildClaimRegistry } from '../lib/research/claim-registry';
import {
  assertCalibrationValidationReport,
  type CalibrationValidationReport,
} from '../lib/research/calibration-validation-report';
import { captureLlmProviderProvenance } from '../lib/research/llm-provenance';
import { llmRunDiagnosticError } from '../lib/research/llm-run-diagnostics';
import { campaignCheckpointDirectory } from '../lib/research/campaign-checkpoint';
import { acquireCampaignExecutionLock } from '../lib/research/campaign-lock';

interface Arguments {
  campaignId: string;
  configDir: string;
  artifactRoot: string;
  validationReport: string;
  calibrationReport?: string;
  experimentIds?: string[];
  workers: number;
  allowDirty: boolean;
  resume: boolean;
}

interface ValidationReport {
  runId: string;
  passed: boolean;
  validations: Array<{ name: string; passed: boolean }>;
}

interface ExperimentRuntime {
  experimentId: string;
  expectedRuns: number;
  completedRuns: number;
  failedRuns: number;
  durationMs: number;
  peakRssBytes: number;
  outputBytes: number;
}

let activeCampaignDir: string | null = null;

function parseArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();
  let allowDirty = false;
  let resume = false;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--allow-dirty') {
      allowDirty = true;
      continue;
    }
    if (argument === '--resume') {
      resume = true;
      continue;
    }
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    values.set(argument, value);
    index++;
  }
  const campaignId = values.get('--campaign-id');
  if (!campaignId) throw new Error('--campaign-id is required');
  const workers = Number(values.get('--workers') ?? 1);
  if (!Number.isInteger(workers) || workers <= 0) {
    throw new Error('--workers must be a positive integer');
  }
  return {
    campaignId,
    configDir: values.get('--config-dir') ?? 'experiments/pilot',
    artifactRoot: values.get('--artifact-root') ?? 'artifacts',
    validationReport: values.get('--validation-report')
      ?? latestValidationReport(path.join(process.cwd(), 'results', 'validation', 'runs')),
    calibrationReport: values.get('--calibration-report'),
    experimentIds: values.get('--experiment-ids')
      ?.split(',')
      .map(value => value.trim())
      .filter(Boolean),
    workers,
    allowDirty,
    resume,
  };
}

export function normalizedCampaignCommand(argv: string[]): string[] {
  return argv.filter(argument => argument !== '--resume');
}

function latestCalibrationReport(root: string): string | undefined {
  if (!fs.existsSync(root)) return undefined;
  const reports: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolutePath);
      else if (entry.name === 'validation_summary.json') reports.push(absolutePath);
    }
  }
  return reports.sort((left, right) =>
    fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs
  )[0];
}

function latestValidationReport(root: string): string {
  if (!fs.existsSync(root)) throw new Error(`Validation root does not exist: ${root}`);
  const reports = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(root, entry.name, 'validation-report.json'))
    .filter(filePath => fs.existsSync(filePath))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  if (!reports[0]) throw new Error('No validation report is available');
  return reports[0];
}

function loadValidationReport(reportPath: string): ValidationReport {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as ValidationReport;
  if (!report.runId || !Array.isArray(report.validations) || report.validations.length === 0) {
    throw new Error(`Invalid validation report: ${reportPath}`);
  }
  const failed = report.validations.filter(result => !result.passed);
  if (!report.passed || failed.length > 0) {
    throw new Error(`Validation report contains failures: ${failed.map(result => result.name).join(', ')}`);
  }
  return report;
}

function loadCalibrationReport(reportPath: string): CalibrationValidationReport {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as unknown;
  assertCalibrationValidationReport(report, 14);
  return report;
}

function loadExperimentConfigs(configDir: string, selectedIds?: string[]): Array<{
  sourcePath: string;
  fileName: string;
  config: ExperimentConfig;
}> {
  return loadSelectedExperimentConfigs<ExperimentConfig>(
    configDir,
    selectedIds,
    validateExperimentConfig,
  );
}

function normalizedRelative(from: string, to: string): string {
  return path.relative(from, to).replace(/\\/g, '/');
}

function directoryBytes(root: string): number {
  if (!fs.existsSync(root)) return 0;
  let bytes = 0;
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(absolutePath);
      else if (entry.isFile()) bytes += fs.statSync(absolutePath).size;
    }
  }
  return bytes;
}

function indexArtifactIfMissing(
  campaignDir: string,
  artifact: Parameters<typeof indexCampaignArtifact>[1],
): void {
  const manifest = loadCampaign(campaignDir);
  const existing = manifest.artifacts.find(candidate => candidate.id === artifact.id);
  if (!existing) {
    indexCampaignArtifact(campaignDir, artifact);
    return;
  }
  const expectedPath = artifact.path.replace(/\\/g, '/');
  const existingPath = existing.path.replace(/\\/g, '/');
  if (existingPath !== expectedPath || existing.kind !== artifact.kind) {
    throw new Error(`Existing campaign artifact identity differs: ${artifact.id}`);
  }
  const absolutePath = path.resolve(campaignDir, existing.path);
  if (!fs.existsSync(absolutePath) || sha256File(absolutePath) !== existing.sha256) {
    throw new Error(`Existing campaign artifact is invalid: ${artifact.id}`);
  }
}

function writeImmutableJsonArtifact(
  campaignDir: string,
  absolutePath: string,
  value: unknown,
  artifact: Omit<Parameters<typeof indexCampaignArtifact>[1], 'path'>,
): void {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(absolutePath)) {
    const existing = fs.readFileSync(absolutePath, 'utf8');
    if (existing !== serialized) {
      throw new Error(`Refusing to overwrite immutable campaign artifact: ${artifact.id}`);
    }
  } else {
    writeJsonAtomic(absolutePath, value);
  }
  indexArtifactIfMissing(campaignDir, {
    ...artifact,
    path: normalizedRelative(campaignDir, absolutePath),
  });
}

function archiveCampaignInputs(
  campaignDir: string,
  repositoryRoot: string,
  inputFiles: Record<string, string>,
): void {
  for (const [inputId, sourceValue] of Object.entries(inputFiles).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const sourcePath = path.resolve(repositoryRoot, sourceValue);
    const safeInputId = inputId.replace(/[^a-z0-9._-]/gi, '_');
    const archivedInputPath = path.join(
      campaignDir,
      'inputs',
      safeInputId,
      path.basename(sourcePath),
    );
    const expectedHash = loadCampaign(campaignDir).provenance.inputHashes[inputId];
    if (fs.existsSync(archivedInputPath)) {
      if (sha256File(archivedInputPath) !== expectedHash) {
        throw new Error(`Archived input hash mismatch for ${inputId}`);
      }
    } else {
      copyFileAtomic(sourcePath, archivedInputPath);
    }
    indexArtifactIfMissing(campaignDir, {
      id: inputId === 'validationReport' ? 'validation-report' : `input:${inputId}`,
      kind: inputId === 'validationReport' ? 'diagnostic' : 'input',
      path: normalizedRelative(campaignDir, archivedInputPath),
    });
  }
}

function reconcileRunFiles(
  campaignDir: string,
  experimentId: string,
  runsDir: string,
  plannedRuns: Map<string, {
    experimentId: string;
    condition: number | string | boolean;
    conditionId: string;
    replicateIndex: number;
    seed: number;
    llmRequired: boolean;
  }>,
): void {
  if (!fs.existsSync(runsDir)) return;
  const indexed = new Set(loadCampaign(campaignDir).runs.map(run => run.runId));
  const recovered: Parameters<typeof indexRunArtifacts>[1] = [];
  for (const fileName of fs.readdirSync(runsDir).filter(name => name.endsWith('.json')).sort()) {
    const runPath = path.join(runsDir, fileName);
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8')) as RunResult;
    const planned = plannedRuns.get(run.runId);
    if (!planned || planned.experimentId !== experimentId) {
      throw new Error(`Unexpected run artifact during resume: ${runPath}`);
    }
    assertRunMatchesPlan(run, { runId: run.runId, ...planned });
    if (!indexed.has(run.runId)) {
      recovered.push({
        runId: run.runId,
        experimentId,
        conditionId: campaignRunConditionId(run),
        replicateIndex: run.runIndex,
        seed: run.seed,
        path: normalizedRelative(campaignDir, runPath),
      });
    }
  }
  if (recovered.length > 0) indexRunArtifacts(campaignDir, recovered);
}

function loadIndexedExperimentRuns(
  campaignDir: string,
  experimentId: string,
  expectedRunIds: string[],
): RunResult[] | null {
  const entries = loadCampaign(campaignDir).runs
    .filter(run => run.experimentId === experimentId);
  const expected = new Set(expectedRunIds);
  if (entries.length !== expected.size) return null;
  if (entries.some(run => !expected.has(run.runId))) {
    throw new Error(`Campaign contains an unexpected indexed run for ${experimentId}`);
  }
  const byRunId = new Map(entries.map(entry => [
    entry.runId,
    JSON.parse(fs.readFileSync(path.resolve(campaignDir, entry.path), 'utf8')) as RunResult,
  ]));
  return expectedRunIds.map(runId => byRunId.get(runId)!);
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const repositoryRoot = process.cwd();
  const artifactRoot = path.resolve(repositoryRoot, args.artifactRoot);
  const campaignLock = acquireCampaignExecutionLock(artifactRoot, args.campaignId);
  try {
  const validationReportPath = path.resolve(repositoryRoot, args.validationReport);
  const validation = loadValidationReport(validationReportPath);
  const experiments = loadExperimentConfigs(args.configDir, args.experimentIds);
  const hasCoreConfirmatoryExperiments = experiments.some(
    experiment => experiment.config.research?.publicationRole === 'core-confirmatory'
  );
  const calibrationReportValue = args.calibrationReport
    ?? latestCalibrationReport(path.join(repositoryRoot, 'results', 'calibration', 'runs'));
  if (hasCoreConfirmatoryExperiments && !calibrationReportValue) {
    throw new Error(
      'Core-confirmatory campaigns require --calibration-report from the full temporal holdout suite'
    );
  }
  const calibrationReportPath = calibrationReportValue
    ? path.resolve(repositoryRoot, calibrationReportValue)
    : undefined;
  if (hasCoreConfirmatoryExperiments && calibrationReportPath) {
    loadCalibrationReport(calibrationReportPath);
  }
  const runners = experiments.map(experiment => ({
    ...experiment,
    runner: new BatchRunner(experiment.config, {
      concurrency: args.workers,
      checkpointDir: campaignCheckpointDirectory(
        artifactRoot,
        args.campaignId,
        experiment.config.id!,
      ),
    }),
  }));
  const generatedTasks = runners.map(experiment => ({
    experimentId: experiment.config.id!,
    tasks: experiment.runner.generateTasks(),
  }));
  const plans = runners.map((experiment, experimentIndex) => ({
    experimentId: experiment.config.id!,
    source: normalizedRelative(repositoryRoot, experiment.sourcePath),
    config: experiment.config,
    tasks: generatedTasks[experimentIndex].tasks.map(task => ({
      runId: task.id,
      condition: task.sweepValue ?? 'baseline',
      conditionId: campaignConditionId(task.sweepValue, task.daoConfig),
      replicateIndex: task.runIndex,
      seed: task.seed,
      llmRequired: (task.daoConfig as unknown as Record<string, unknown>).llm_enabled === true,
    })),
  }));
  const expectedRuns = plans.reduce((sum, plan) => sum + plan.tasks.length, 0);
  const plannedRuns = new Map(
    plans.flatMap(plan => plan.tasks.map(task => [
      task.runId,
      { ...task, experimentId: plan.experimentId },
    ] as const))
  );
  if (plannedRuns.size !== expectedRuns) {
    throw new Error('Generated campaign task plan contains duplicate run identifiers');
  }
  const inputFiles: Record<string, string> = {
    validationReport: normalizedRelative(repositoryRoot, validationReportPath),
  };
  if (calibrationReportPath) {
    inputFiles.calibrationValidationReport = normalizedRelative(
      repositoryRoot,
      calibrationReportPath,
    );
  }
  for (const experiment of experiments) {
    inputFiles[`experiment:${experiment.config.id}`] = normalizedRelative(
      repositoryRoot,
      experiment.sourcePath
    );
  }
  const llmProvenance = await captureLlmProviderProvenance(generatedTasks);
  if (llmProvenance.length > 0) {
    for (const [id, relativePath] of [
      ['llmPromptTemplates', 'lib/llm/prompt-templates.ts'],
      ['llmVotingProtocol', 'lib/llm/llm-voting-mixin.ts'],
      ['llmClientProtocol', 'lib/llm/ollama-client.ts'],
    ] as const) {
      inputFiles[id] = relativePath;
    }
  }
  for (const [id, relativePath] of [
    ['calibrationBaseline', 'results/baselines/calibration-baseline.json'],
    ['historicalSourceLedger', 'results/historical/source-ledger.json'],
    ['metricRegistry', 'lib/research/metric-registry.ts'],
  ] as const) {
    if (fs.existsSync(path.resolve(repositoryRoot, relativePath))) inputFiles[id] = relativePath;
  }

  const resolvedConfig = {
    schemaVersion: '1.1.0',
    campaignId: args.campaignId,
    profile: path.basename(path.resolve(args.configDir)),
    validationRunId: validation.runId,
    calibrationValidationReport: calibrationReportPath
      ? normalizedRelative(repositoryRoot, calibrationReportPath)
      : null,
    workerCount: args.workers,
    expectedRuns,
    llmProvenance,
    experiments: plans,
  };
  const campaignOptions = {
    rootDir: repositoryRoot,
    outputRootDir: artifactRoot,
    campaignId: args.campaignId,
    resolvedConfig,
    expectedRuns,
    workerCount: args.workers,
    inputFiles,
    allowDirty: args.allowDirty,
    command: normalizedCampaignCommand(process.argv),
  };
  const campaignDir = path.join(artifactRoot, 'campaigns', args.campaignId);
  const manifest = args.resume
    ? assertResumeIdentity(campaignDir, collectProvenance(campaignOptions))
    : createCampaign(campaignOptions);
  activeCampaignDir = campaignDir;
  if (manifest.state === 'created') {
    transitionCampaign(campaignDir, 'validating');
  }
  if (loadCampaign(campaignDir).state === 'failed') {
    transitionCampaign(campaignDir, 'running');
  }
  archiveCampaignInputs(campaignDir, repositoryRoot, inputFiles);
  const initialVerification = verifyCampaign(campaignDir);
  if (!initialVerification.valid) {
    const state = loadCampaign(campaignDir).state;
    if (state !== 'failed') transitionCampaign(campaignDir, 'failed');
    throw new Error(`Created campaign failed verification: ${initialVerification.errors.join('; ')}`);
  }
  const preRunState = loadCampaign(campaignDir).state;
  if (preRunState !== 'running') transitionCampaign(campaignDir, 'running');

  const runtime: ExperimentRuntime[] = [];
  const analysisInputs: CampaignExperimentInput[] = [];
  for (const experiment of runners) {
    const experimentId = experiment.config.id!;
    const experimentPlan = plans.find(plan => plan.experimentId === experimentId)!;
    const expectedRunIds = experimentPlan.tasks.map(task => task.runId);
    const experimentDir = path.join(campaignDir, 'experiments', experimentId);
    const runsDir = path.join(experimentDir, 'runs');
    fs.mkdirSync(runsDir, { recursive: true });
    const archivedConfigPath = path.join(experimentDir, 'config.yaml');
    if (fs.existsSync(archivedConfigPath)) {
      if (sha256File(archivedConfigPath) !== sha256File(experiment.sourcePath)) {
        throw new Error(`Archived experiment config differs during resume: ${experimentId}`);
      }
    } else {
      copyFileAtomic(experiment.sourcePath, archivedConfigPath);
    }
    indexArtifactIfMissing(campaignDir, {
      id: `${experimentId}:config`,
      kind: 'config',
      path: normalizedRelative(campaignDir, archivedConfigPath),
    });
    reconcileRunFiles(campaignDir, experimentId, runsDir, plannedRuns);

    const priorRuns = loadIndexedExperimentRuns(campaignDir, experimentId, expectedRunIds);
    const summaryPath = path.join(experimentDir, 'summary.json');
    const runtimePath = path.join(experimentDir, 'runtime.json');
    if (priorRuns) {
      if (!fs.existsSync(summaryPath) || !fs.existsSync(runtimePath)) {
        throw new Error(`Completed experiment is missing summary/runtime metadata: ${experimentId}`);
      }
      indexArtifactIfMissing(campaignDir, {
        id: `${experimentId}:summary`,
        kind: 'summary',
        path: normalizedRelative(campaignDir, summaryPath),
      });
      indexArtifactIfMissing(campaignDir, {
        id: `${experimentId}:runtime`,
        kind: 'diagnostic',
        path: normalizedRelative(campaignDir, runtimePath),
      });
      const priorRuntime = JSON.parse(
        fs.readFileSync(runtimePath, 'utf8')
      ) as ExperimentRuntime;
      runtime.push(priorRuntime);
      analysisInputs.push({ config: experiment.config, results: priorRuns });
      console.log(`${experimentId}: resumed from ${priorRuns.length}/${expectedRunIds.length} indexed runs`);
      continue;
    }

    const startedAt = Date.now();
    let peakRssBytes = process.memoryUsage().rss;
    const monitor = setInterval(() => {
      peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
    }, 250);
    let result: BatchResult;
    try {
      result = await experiment.runner.run();
    } finally {
      clearInterval(monitor);
    }
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);

    const indexedRuns: Parameters<typeof indexRunArtifacts>[1] = [];
    for (const run of result.results) {
      const plannedRun = plannedRuns.get(run.runId);
      if (!plannedRun) throw new Error(`Completed run is absent from task plan: ${run.runId}`);
      assertRunMatchesPlan(run, plannedRun);
      const llmFailure = llmRunDiagnosticError(
        run.llmDiagnostics,
        plannedRun.llmRequired,
      );
      if (llmFailure) {
        const failurePath = path.join(experimentDir, 'failed-runs', `${run.runId}.json`);
        writeImmutableJsonArtifact(campaignDir, failurePath, run, {
          id: `${experimentId}:failed-run:${run.runId}`,
          kind: 'diagnostic',
        });
        const failed = loadCampaign(campaignDir).failedRuns.some(entry => entry.runId === run.runId);
        if (!failed) {
          recordFailedRun(campaignDir, {
            runId: run.runId,
            experimentId,
            error: llmFailure,
          });
        }
        continue;
      }
      resolveFailedRun(campaignDir, run.runId);
      const existing = loadCampaign(campaignDir).runs.find(entry => entry.runId === run.runId);
      if (existing) continue;
      const runPath = path.join(runsDir, `${run.runId}.json`);
      writeJsonAtomic(runPath, run);
      indexedRuns.push({
        runId: run.runId,
        experimentId,
        conditionId: campaignRunConditionId(run),
        replicateIndex: run.runIndex,
        seed: run.seed,
        path: normalizedRelative(campaignDir, runPath),
      });
    }
    if (indexedRuns.length > 0) indexRunArtifacts(campaignDir, indexedRuns);
    for (const runId of result.failedRunIds) {
      const plannedRun = plannedRuns.get(runId);
      if (!plannedRun || plannedRun.experimentId !== experimentId) {
        throw new Error(`Failed run is absent from the experiment task plan: ${runId}`);
      }
      const failed = loadCampaign(campaignDir).failedRuns.some(entry => entry.runId === runId);
      if (!failed) {
        recordFailedRun(campaignDir, {
          runId,
          experimentId,
          error: 'Experiment runner exhausted retries',
        });
      }
    }

    const finalRuns = loadIndexedExperimentRuns(campaignDir, experimentId, expectedRunIds);
    const experimentFailures = loadCampaign(campaignDir).failedRuns
      .filter(failure => failure.experimentId === experimentId);
    if (!finalRuns || experimentFailures.length > 0) {
      transitionCampaign(campaignDir, 'partial');
      throw new Error(
        `${experimentId} is partial: ${finalRuns?.length ?? loadCampaign(campaignDir).runs.filter(
          run => run.experimentId === experimentId
        ).length}/${expectedRunIds.length} indexed, ${experimentFailures.length} failed`
      );
    }
    analysisInputs.push({ config: experiment.config, results: finalRuns });

    writeImmutableJsonArtifact(campaignDir, summaryPath, result.summary, {
      id: `${experimentId}:summary`,
      kind: 'summary',
    });
    const runtimeEntry: ExperimentRuntime = {
      experimentId,
      expectedRuns: expectedRunIds.length,
      completedRuns: finalRuns.length,
      failedRuns: 0,
      durationMs: Date.now() - startedAt,
      peakRssBytes,
      outputBytes: directoryBytes(experimentDir),
    };
    writeImmutableJsonArtifact(campaignDir, runtimePath, runtimeEntry, {
      id: `${experimentId}:runtime`,
      kind: 'diagnostic',
    });
    runtime.push(runtimeEntry);
    console.log(
      `${experimentId}: ${finalRuns.length}/${expectedRunIds.length} runs, `
      + `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
    );
  }

  const analysisPath = path.join(campaignDir, 'analysis', 'analysis.json');
  const analysis = fs.existsSync(analysisPath)
    ? JSON.parse(fs.readFileSync(analysisPath, 'utf8')) as ReturnType<typeof buildCampaignAnalysis>
    : buildCampaignAnalysis(args.campaignId, analysisInputs);
  writeImmutableJsonArtifact(campaignDir, analysisPath, analysis, {
    id: 'campaign-analysis',
    kind: 'analysis',
  });
  const claimsPath = path.join(campaignDir, 'claims.json');
  const claims = fs.existsSync(claimsPath)
    ? JSON.parse(fs.readFileSync(claimsPath, 'utf8'))
    : buildClaimRegistry(
      args.campaignId,
      analysis as unknown as Record<string, unknown>,
      {
        path: normalizedRelative(campaignDir, analysisPath),
        sha256: sha256File(analysisPath),
      },
    );
  writeImmutableJsonArtifact(campaignDir, claimsPath, claims, {
    id: 'claim-registry',
    kind: 'claim-registry',
  });

  const campaignSummaryPath = path.join(campaignDir, 'campaign-summary.json');
  const campaignSummary = fs.existsSync(campaignSummaryPath)
    ? JSON.parse(fs.readFileSync(campaignSummaryPath, 'utf8'))
    : {
      schemaVersion: '1.0.0',
      campaignId: args.campaignId,
      validationRunId: validation.runId,
      expectedRuns,
      completedRuns: runtime.reduce((sum, entry) => sum + entry.completedRuns, 0),
      failedRuns: runtime.reduce((sum, entry) => sum + entry.failedRuns, 0),
      durationMs: runtime.reduce((sum, entry) => sum + entry.durationMs, 0),
      peakRssBytes: Math.max(...runtime.map(entry => entry.peakRssBytes)),
      totalOutputBytes: runtime.reduce((sum, entry) => sum + entry.outputBytes, 0),
      experiments: runtime,
    };
  writeImmutableJsonArtifact(campaignDir, campaignSummaryPath, campaignSummary, {
    id: 'campaign-summary',
    kind: 'summary',
  });

  if (runtime.some(entry => entry.failedRuns > 0)) {
    transitionCampaign(campaignDir, 'partial');
    throw new Error(`Campaign is partial due to failed runs: ${campaignDir}`);
  }
  transitionCampaign(campaignDir, 'completed');
  transitionCampaign(campaignDir, 'verified');
  activeCampaignDir = null;
  console.log(`Verified campaign: ${campaignDir}`);
  } finally {
    campaignLock.release();
  }
}

main().catch(error => {
  if (activeCampaignDir) {
    try {
      const state = loadCampaign(activeCampaignDir).state;
      if (!['failed', 'verified'].includes(state)) {
        transitionCampaign(activeCampaignDir, 'failed');
      }
    } catch (transitionError) {
      console.error(
        `Could not mark campaign failed: ${
          transitionError instanceof Error ? transitionError.message : String(transitionError)
        }`
      );
    }
  }
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
