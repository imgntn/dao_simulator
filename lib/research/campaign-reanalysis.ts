import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import type { ExperimentConfig, RunResult } from './experiment-config';
import { validateExperimentConfig } from './experiment-config-validator';
import {
  canonicalJson,
  loadCampaign,
  sha256,
  sha256File,
  verifyCampaign,
  writeJsonAtomic,
  type CampaignManifest,
  type RunArtifact,
} from './campaign-manifest';
import {
  assertRunMatchesPlan,
  buildCampaignAnalysis,
  campaignRunConditionId,
  type CampaignExperimentInput,
} from './campaign-analysis';
import { buildClaimRegistry } from './claim-registry';

export const CAMPAIGN_REANALYSIS_SCHEMA_VERSION = '1.1.0';
const SUPPORTED_REANALYSIS_SCHEMA_VERSIONS = new Set(['1.0.0', '1.1.0']);

interface ResolvedTask {
  runId: string;
  condition: unknown;
  conditionId?: string;
  replicateIndex: number;
  seed: number;
}

interface ResolvedExperiment {
  experimentId: string;
  config: ExperimentConfig;
  tasks: ResolvedTask[];
}

interface ResolvedCampaign {
  schemaVersion: string;
  campaignId: string;
  experiments: ResolvedExperiment[];
}

interface DerivedArtifact {
  path: string;
  bytes: number;
  sha256: string;
}

interface SourceRunBinding {
  runId: string;
  experimentId: string;
  campaignRelativePath: string;
  bytes: number;
  sha256: string;
  conditionId: string;
  replicateIndex: number;
  seed: number;
}

export interface CampaignReanalysisManifest {
  schemaVersion: string;
  reanalysisId: string;
  generatedAt: string;
  identitySha256: string;
  source: {
    campaignId: string;
    campaignState: CampaignManifest['state'];
    campaignIdentitySha256: string;
    campaignManifestPath: string;
    campaignManifestSha256: string;
    resolvedConfigPath: string;
    resolvedConfigSha256: string;
    acceptedVerificationErrors: string[];
  };
  experimentIds: string[];
  designInputs?: Array<{
    experimentId: string;
    path: string;
    sha256: string;
    operationalConfigSha256: string;
  }>;
  normalizations?: Array<{
    path: string;
    from: null;
    to: 'pilot-development';
    rationale: string;
  }>;
  sourceRuns: SourceRunBinding[];
  artifacts: {
    analysis: DerivedArtifact;
    claims: DerivedArtifact;
  };
}

export interface ReanalyzeCampaignOptions {
  campaignDir: string;
  outputDir: string;
  reanalysisId: string;
  experimentIds: string[];
  designConfigDir?: string;
}

export interface ReanalysisVerification {
  valid: boolean;
  errors: string[];
}

export function reanalyzeCampaign(
  options: ReanalyzeCampaignOptions,
): CampaignReanalysisManifest {
  const campaignDir = path.resolve(options.campaignDir);
  const outputDir = path.resolve(options.outputDir);
  const reanalysisId = assertIdentifier(options.reanalysisId, 'reanalysis identifier');
  const requestedIds = [...new Set(options.experimentIds.map(id => id.trim()).filter(Boolean))].sort();
  if (requestedIds.length === 0) throw new Error('At least one experiment identifier is required');
  assertEmptyOutputDirectory(outputDir);

  const sourceManifestPath = path.join(campaignDir, 'campaign-manifest.json');
  const resolvedConfigPath = path.join(campaignDir, 'resolved-config.json');
  const sourceManifest = loadCampaign(campaignDir);
  const sourceVerification = verifyCampaign(campaignDir);
  const acceptedVerificationErrors = sourceVerification.errors.filter(isRecoverableConditionMismatch);
  const fatalVerificationErrors = sourceVerification.errors.filter(error =>
    !isRecoverableConditionMismatch(error)
  );
  if (fatalVerificationErrors.length > 0) {
    throw new Error(
      `Source campaign failed non-recoverable verification: ${fatalVerificationErrors.join('; ')}`
    );
  }
  const resolved = parseResolvedCampaign(resolvedConfigPath, sourceManifest.campaignId);
  const designConfigs = options.designConfigDir
    ? loadDesignConfigs(path.resolve(options.designConfigDir))
    : new Map<string, { config: ExperimentConfig; path: string }>();
  const experimentsById = new Map(
    resolved.experiments.map(experiment => [experiment.experimentId, experiment])
  );
  const missing = requestedIds.filter(id => !experimentsById.has(id));
  if (missing.length > 0) {
    throw new Error(`Requested experiments are absent from source plan: ${missing.join(', ')}`);
  }

  const analysisInputs: CampaignExperimentInput[] = [];
  const sourceRuns: SourceRunBinding[] = [];
  const normalizations: NonNullable<CampaignReanalysisManifest['normalizations']> = [];
  const designInputs: NonNullable<CampaignReanalysisManifest['designInputs']> = [];
  for (const experimentId of requestedIds) {
    const experiment = experimentsById.get(experimentId)!;
    const sourceConfig = structuredClone(experiment.config);
    const design = designConfigs.get(experimentId);
    if (options.designConfigDir && !design) {
      throw new Error(`Amended design config is missing for ${experimentId}`);
    }
    if (design) {
      assertOperationallyEquivalent(sourceConfig, design.config, experimentId);
      experiment.config = structuredClone(design.config);
      designInputs.push({
        experimentId,
        path: relativeFromOutput(outputDir, design.path),
        sha256: sha256File(design.path),
        operationalConfigSha256: sha256(canonicalJson(operationalProjection(design.config))),
      });
    }
    if (
      !design
      &&
      resolved.schemaVersion === '1.0.0'
      && experiment.config.research
      && !experiment.config.research.publicationRole
    ) {
      experiment.config = structuredClone(experiment.config);
      experiment.config.research!.publicationRole = 'pilot-development';
      normalizations.push({
        path: `experiments.${experimentId}.research.publicationRole`,
        from: null,
        to: 'pilot-development',
        rationale:
          'Legacy resolved campaign schema 1.0 predates explicit publication roles; '
          + 'the source experiment is a developmental pilot and cannot support confirmatory claims.',
      });
    }
    validateExperimentConfig(experiment.config);
    const tasks = new Map(experiment.tasks.map(task => [task.runId, task]));
    if (tasks.size !== experiment.tasks.length) {
      throw new Error(`Duplicate task identifier in source plan: ${experimentId}`);
    }
    const indexedRuns = sourceManifest.runs
      .filter(run => run.experimentId === experimentId);
    if (indexedRuns.length !== tasks.size) {
      throw new Error(
        `Source experiment ${experimentId} has ${indexedRuns.length} indexed runs for ${tasks.size} tasks`
      );
    }
    const indexedRunsById = new Map(indexedRuns.map(run => [run.runId, run]));
    if (indexedRunsById.size !== indexedRuns.length) {
      throw new Error(`Duplicate indexed run identifier in source campaign: ${experimentId}`);
    }
    // The resolved task plan is the canonical condition order used by the
    // original campaign analysis. Lexicographic run-ID ordering can reverse
    // reference and treatment conditions, changing every effect sign.
    const results = experiment.tasks.map(task => {
      const runArtifact = indexedRunsById.get(task.runId);
      if (!runArtifact) {
        throw new Error(`Planned run is absent from source campaign: ${task.runId}`);
      }
      return loadBoundRun(campaignDir, runArtifact, tasks);
    });
    for (const { result, binding } of results) sourceRuns.push(binding);
    analysisInputs.push({
      config: experiment.config,
      results: results.map(item => item.result),
    });
  }
  sourceRuns.sort((left, right) =>
    left.experimentId.localeCompare(right.experimentId) || left.runId.localeCompare(right.runId)
  );

  const analysis = buildCampaignAnalysis(reanalysisId, analysisInputs);
  const analysisPath = path.join(outputDir, 'analysis.json');
  writeJsonAtomic(analysisPath, analysis);
  const claimsPath = path.join(outputDir, 'claims.json');
  writeJsonAtomic(claimsPath, buildClaimRegistry(
    reanalysisId,
    analysis as unknown as Record<string, unknown>,
    { path: 'analysis.json', sha256: sha256File(analysisPath) },
  ));

  const identityPayload = {
    schemaVersion: CAMPAIGN_REANALYSIS_SCHEMA_VERSION,
    reanalysisId,
    sourceCampaignIdentitySha256: sourceManifest.identitySha256,
    sourceCampaignManifestSha256: sha256File(sourceManifestPath),
    resolvedConfigSha256: sha256File(resolvedConfigPath),
    experimentIds: requestedIds,
    designInputs,
    normalizations,
    sourceRuns,
  };
  const manifest: CampaignReanalysisManifest = {
    schemaVersion: CAMPAIGN_REANALYSIS_SCHEMA_VERSION,
    reanalysisId,
    generatedAt: analysis.generatedAt,
    identitySha256: sha256(canonicalJson(identityPayload)),
    source: {
      campaignId: sourceManifest.campaignId,
      campaignState: sourceManifest.state,
      campaignIdentitySha256: sourceManifest.identitySha256,
      campaignManifestPath: relativeFromOutput(outputDir, sourceManifestPath),
      campaignManifestSha256: sha256File(sourceManifestPath),
      resolvedConfigPath: relativeFromOutput(outputDir, resolvedConfigPath),
      resolvedConfigSha256: sha256File(resolvedConfigPath),
      acceptedVerificationErrors,
    },
    experimentIds: requestedIds,
    designInputs,
    normalizations,
    sourceRuns,
    artifacts: {
      analysis: artifactRecord(outputDir, analysisPath),
      claims: artifactRecord(outputDir, claimsPath),
    },
  };
  writeJsonAtomic(path.join(outputDir, 'reanalysis-manifest.json'), manifest);
  const verification = verifyCampaignReanalysis(outputDir);
  if (!verification.valid) {
    throw new Error(`Reanalysis verification failed: ${verification.errors.join('; ')}`);
  }
  return manifest;
}

export function verifyCampaignReanalysis(outputDirValue: string): ReanalysisVerification {
  const outputDir = path.resolve(outputDirValue);
  const errors: string[] = [];
  const manifestPath = path.join(outputDir, 'reanalysis-manifest.json');
  if (!fs.existsSync(manifestPath)) return { valid: false, errors: ['Missing reanalysis manifest'] };
  let manifest: CampaignReanalysisManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CampaignReanalysisManifest;
  } catch {
    return { valid: false, errors: ['Reanalysis manifest is not valid JSON'] };
  }
  if (!SUPPORTED_REANALYSIS_SCHEMA_VERSIONS.has(manifest.schemaVersion)) {
    errors.push('Unsupported reanalysis schema version');
  }
  const sourceManifestPath = containedResolvedPath(outputDir, manifest.source.campaignManifestPath);
  const resolvedConfigPath = containedResolvedPath(outputDir, manifest.source.resolvedConfigPath);
  const sourceCampaignDir = path.dirname(sourceManifestPath);
  verifyExternalFile(sourceManifestPath, manifest.source.campaignManifestSha256, errors, 'source manifest');
  verifyExternalFile(resolvedConfigPath, manifest.source.resolvedConfigSha256, errors, 'resolved config');
  if (resolvedConfigPath !== path.join(sourceCampaignDir, 'resolved-config.json')) {
    errors.push('Resolved config is not colocated with the source campaign manifest');
  }
  for (const run of manifest.sourceRuns) {
    const runPath = containedCampaignPath(sourceCampaignDir, run.campaignRelativePath);
    verifyExternalFile(runPath, run.sha256, errors, `source run ${run.runId}`, run.bytes);
  }
  for (const input of manifest.designInputs ?? []) {
    const inputPath = containedResolvedPath(outputDir, input.path);
    verifyExternalFile(inputPath, input.sha256, errors, `design input ${input.experimentId}`);
  }
  for (const [name, artifact] of Object.entries(manifest.artifacts)) {
    const artifactPath = containedOutputPath(outputDir, artifact.path);
    verifyExternalFile(artifactPath, artifact.sha256, errors, name, artifact.bytes);
  }
  const identityPayload: Record<string, unknown> = {
    schemaVersion: manifest.schemaVersion,
    reanalysisId: manifest.reanalysisId,
    sourceCampaignIdentitySha256: manifest.source.campaignIdentitySha256,
    sourceCampaignManifestSha256: manifest.source.campaignManifestSha256,
    resolvedConfigSha256: manifest.source.resolvedConfigSha256,
    experimentIds: manifest.experimentIds,
    sourceRuns: manifest.sourceRuns,
  };
  if (manifest.schemaVersion === '1.1.0') {
    identityPayload.designInputs = manifest.designInputs ?? [];
    identityPayload.normalizations = manifest.normalizations ?? [];
  } else if (manifest.normalizations !== undefined) {
    identityPayload.normalizations = manifest.normalizations;
  }
  if (sha256(canonicalJson(identityPayload)) !== manifest.identitySha256) {
    errors.push('Reanalysis identity hash mismatch');
  }
  return { valid: errors.length === 0, errors };
}

function loadBoundRun(
  campaignDir: string,
  artifact: RunArtifact,
  tasks: Map<string, ResolvedTask>,
): { result: RunResult; binding: SourceRunBinding } {
  const task = tasks.get(artifact.runId);
  if (!task) throw new Error(`Indexed run is absent from source task plan: ${artifact.runId}`);
  const runPath = containedCampaignPath(campaignDir, artifact.path);
  const result = JSON.parse(fs.readFileSync(runPath, 'utf8')) as RunResult;
  const actualCondition = result.sweepValue ?? 'baseline';
  if (canonicalJson(actualCondition) !== canonicalJson(task.condition)) {
    throw new Error(`Run sweep value differs from source plan: ${artifact.runId}`);
  }
  const conditionId = task.conditionId || campaignRunConditionId(result);
  const reboundResult = { ...result, conditionId };
  assertRunMatchesPlan(reboundResult, {
    runId: task.runId,
    conditionId,
    replicateIndex: task.replicateIndex,
    seed: task.seed,
  });
  return {
    result: reboundResult,
    binding: {
      runId: artifact.runId,
      experimentId: artifact.experimentId,
      campaignRelativePath: artifact.path,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
      conditionId,
      replicateIndex: artifact.replicateIndex,
      seed: artifact.seed,
    },
  };
}

function parseResolvedCampaign(filePath: string, campaignId: string): ResolvedCampaign {
  if (!fs.existsSync(filePath)) throw new Error('Source campaign is missing resolved-config.json');
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ResolvedCampaign;
  if (value.campaignId !== campaignId || !Array.isArray(value.experiments)) {
    throw new Error('Source resolved campaign is invalid or belongs to another campaign');
  }
  for (const experiment of value.experiments) {
    if (!experiment.experimentId || !Array.isArray(experiment.tasks)) {
      throw new Error('Source resolved campaign contains an invalid experiment');
    }
  }
  return value;
}

function loadDesignConfigs(
  directory: string,
): Map<string, { config: ExperimentConfig; path: string }> {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Design config directory does not exist: ${directory}`);
  }
  const loaded = new Map<string, { config: ExperimentConfig; path: string }>();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:ya?ml|json)$/i.test(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    const text = fs.readFileSync(filePath, 'utf8');
    const config = (
      entry.name.endsWith('.json') ? JSON.parse(text) : yaml.parse(text)
    ) as ExperimentConfig;
    if (!config.id) throw new Error(`Design config requires a stable id: ${filePath}`);
    if (loaded.has(config.id)) throw new Error(`Duplicate design config id: ${config.id}`);
    loaded.set(config.id, { config, path: filePath });
  }
  return loaded;
}

function assertOperationallyEquivalent(
  source: ExperimentConfig,
  amended: ExperimentConfig,
  experimentId: string,
): void {
  const sourceProjection = operationalProjection(source);
  const amendedProjection = operationalProjection(amended);
  if (canonicalJson(sourceProjection) !== canonicalJson(amendedProjection)) {
    throw new Error(
      `Amended design changes simulation operations for ${experimentId}; rerun is required`
    );
  }
  const sourceMetrics = new Set(source.metrics.map(metric => metric.builtin ?? metric.name));
  const missingMetrics = amended.metrics
    .map(metric => metric.builtin ?? metric.name)
    .filter(metric => !sourceMetrics.has(metric));
  if (missingMetrics.length > 0) {
    throw new Error(
      `Amended design requests metrics absent from source runs for ${experimentId}: `
      + missingMetrics.join(', ')
    );
  }
}

function operationalProjection(config: ExperimentConfig): unknown {
  return {
    mode: config.mode ?? 'single',
    baseConfig: config.baseConfig,
    baseCityConfig: config.baseCityConfig ?? null,
    scenarios: config.scenarios ?? null,
    sweep: config.sweep ?? null,
    execution: {
      runsPerConfig: config.execution.runsPerConfig,
      stepsPerRun: config.execution.stepsPerRun,
      seedStrategy: config.execution.seedStrategy,
      baseSeed: config.execution.baseSeed ?? null,
      fixedSeeds: config.execution.fixedSeeds ?? null,
      learningEpisodesPerRun: config.execution.learningEpisodesPerRun ?? null,
    },
  };
}

function isRecoverableConditionMismatch(error: string): boolean {
  return error.startsWith('Condition mismatch for planned run: ');
}

function artifactRecord(root: string, filePath: string): DerivedArtifact {
  return {
    path: path.relative(root, filePath).replace(/\\/g, '/'),
    bytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
  };
}

function relativeFromOutput(outputDir: string, filePath: string): string {
  return path.relative(outputDir, filePath).replace(/\\/g, '/');
}

function containedCampaignPath(root: string, relativePath: string): string {
  const absolute = path.resolve(root, relativePath);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!absolute.startsWith(prefix)) throw new Error(`Source run path escapes campaign: ${relativePath}`);
  return absolute;
}

function containedOutputPath(root: string, relativePath: string): string {
  const absolute = path.resolve(root, relativePath);
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!absolute.startsWith(prefix)) throw new Error(`Derived artifact path escapes output: ${relativePath}`);
  return absolute;
}

function containedResolvedPath(root: string, relativePath: string): string {
  const absolute = path.resolve(root, relativePath);
  if (!path.isAbsolute(absolute)) throw new Error(`Invalid external path: ${relativePath}`);
  return absolute;
}

function verifyExternalFile(
  filePath: string,
  expectedHash: string,
  errors: string[],
  label: string,
  expectedBytes?: number,
): void {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${label}`);
    return;
  }
  if (expectedBytes !== undefined && fs.statSync(filePath).size !== expectedBytes) {
    errors.push(`Size mismatch for ${label}`);
  }
  if (sha256File(filePath) !== expectedHash) errors.push(`Hash mismatch for ${label}`);
}

function assertIdentifier(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(trimmed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return trimmed;
}

function assertEmptyOutputDirectory(outputDir: string): void {
  if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
    throw new Error(`Reanalysis output directory is not empty: ${outputDir}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });
}
