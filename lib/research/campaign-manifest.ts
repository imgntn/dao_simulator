import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const CAMPAIGN_SCHEMA_VERSION = 4;
const SUPPORTED_CAMPAIGN_SCHEMA_VERSIONS = new Set([3, CAMPAIGN_SCHEMA_VERSION]);
export type CampaignState =
  | 'created' | 'validating' | 'running' | 'partial'
  | 'failed' | 'completed' | 'verified';

export interface RunAccounting {
  expected: number;
  attempted: number;
  completed: number;
  skipped: number;
  failed: number;
}

export interface RunArtifact {
  runId: string;
  experimentId: string;
  conditionId: string;
  replicateIndex: number;
  seed: number;
  path: string;
  bytes: number;
  sha256: string;
}

export interface FailedRunArtifact {
  runId: string;
  experimentId: string;
  recordedAt: string;
  error?: string;
}

export interface CampaignArtifact {
  id: string;
  kind: 'input' | 'config' | 'summary' | 'analysis' | 'diagnostic' | 'report' | 'figure' | 'table' | 'claim-registry' | 'other';
  path: string;
  bytes: number;
  sha256: string;
}

export interface CampaignProvenance {
  gitCommit: string;
  gitDirty: boolean;
  dirtyPatchSha256?: string;
  packageVersion: string;
  lockfileSha256: string;
  configSha256: string;
  inputHashes: Record<string, string>;
  nodeVersion: string;
  platform: string;
  architecture: string;
  cpuModel: string;
  cpuCount: number;
  totalMemoryBytes: number;
  timezone: string;
  locale: string;
  command: string[];
  workerCount: number;
  rngAlgorithm: string;
  rngSchemaVersion: number;
}

export interface CampaignManifest {
  schemaVersion: number;
  campaignId: string;
  state: CampaignState;
  createdAt: string;
  updatedAt: string;
  identitySha256: string;
  provenance: CampaignProvenance;
  accounting: RunAccounting;
  runs: RunArtifact[];
  failedRuns: FailedRunArtifact[];
  artifacts: CampaignArtifact[];
}

export interface CreateCampaignOptions {
  rootDir: string;
  campaignId: string;
  resolvedConfig: unknown;
  expectedRuns: number;
  workerCount: number;
  inputFiles?: Record<string, string>;
  allowDirty?: boolean;
  command?: string[];
  outputRootDir?: string;
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalValue(child)])
    );
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Cannot canonicalize a non-finite number');
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function sha256File(filePath: string): string {
  return sha256(fs.readFileSync(filePath));
}

export function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameAtomicWithRetry(temporaryPath, filePath);
}

export function copyFileAtomic(sourcePath: string, destinationPath: string): void {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  const temporaryPath = `${destinationPath}.${process.pid}.${Date.now()}.tmp`;
  fs.copyFileSync(sourcePath, temporaryPath);
  renameAtomicWithRetry(temporaryPath, destinationPath);
}

export function renameAtomicWithRetry(
  temporaryPath: string,
  destinationPath: string,
  rename: typeof fs.renameSync = fs.renameSync,
): void {
  const retryableCodes = new Set(['EACCES', 'EBUSY', 'EPERM']);
  const maximumAttempts = 8;
  for (let attempt = 0; attempt < maximumAttempts; attempt++) {
    try {
      rename(temporaryPath, destinationPath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryable = code !== undefined && retryableCodes.has(code);
      if (!retryable || attempt === maximumAttempts - 1) {
        try {
          fs.unlinkSync(temporaryPath);
        } catch {
          // Preserve the original rename failure; a missing or locked temp file is secondary.
        }
        throw error;
      }
      const delayMs = Math.min(160, 10 * (2 ** attempt));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}

function git(rootDir: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function packageVersion(rootDir: string): string {
  const parsed = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  if (typeof parsed.version !== 'string' || !parsed.version) {
    throw new Error('package.json has no valid version');
  }
  return parsed.version;
}

export function collectProvenance(options: CreateCampaignOptions): CampaignProvenance {
  const status = git(options.rootDir, ['status', '--porcelain']);
  const gitDirty = status.length > 0;
  if (gitDirty && !options.allowDirty) {
    throw new Error('Research campaigns require a clean Git worktree');
  }
  const lockfile = path.join(options.rootDir, 'package-lock.json');
  if (!fs.existsSync(lockfile)) throw new Error('package-lock.json is required');

  const inputHashes: Record<string, string> = {};
  for (const [id, inputPath] of Object.entries(options.inputFiles ?? {})) {
    const absolutePath = path.resolve(options.rootDir, inputPath);
    if (!fs.existsSync(absolutePath)) throw new Error(`Missing provenance input: ${inputPath}`);
    inputHashes[id] = sha256File(absolutePath);
  }

  const cpus = os.cpus();
  return {
    gitCommit: git(options.rootDir, ['rev-parse', 'HEAD']),
    gitDirty,
    dirtyPatchSha256: gitDirty
      ? sha256(`${git(options.rootDir, ['diff', '--binary'])}\n${status}`)
      : undefined,
    packageVersion: packageVersion(options.rootDir),
    lockfileSha256: sha256File(lockfile),
    configSha256: sha256(canonicalJson(options.resolvedConfig)),
    inputHashes,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpuModel: cpus[0]?.model ?? 'unknown',
    cpuCount: cpus.length,
    totalMemoryBytes: os.totalmem(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    command: options.command ?? process.argv,
    workerCount: options.workerCount,
    rngAlgorithm: 'mulberry32',
    rngSchemaVersion: 2,
  };
}

function identityFor(provenance: CampaignProvenance): string {
  return sha256(canonicalJson(provenance));
}

export function createCampaign(options: CreateCampaignOptions): CampaignManifest {
  if (!/^[a-z0-9][a-z0-9._-]+$/i.test(options.campaignId)) {
    throw new Error(`Invalid campaign ID: ${options.campaignId}`);
  }
  if (!Number.isSafeInteger(options.expectedRuns) || options.expectedRuns < 0) {
    throw new Error('expectedRuns must be a non-negative safe integer');
  }
  const campaignDir = path.join(
    options.outputRootDir ?? options.rootDir,
    'campaigns',
    options.campaignId
  );
  if (fs.existsSync(campaignDir)) throw new Error(`Campaign already exists: ${options.campaignId}`);

  const provenance = collectProvenance(options);
  const now = new Date().toISOString();
  const manifest: CampaignManifest = {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    campaignId: options.campaignId,
    state: 'created',
    createdAt: now,
    updatedAt: now,
    identitySha256: identityFor(provenance),
    provenance,
    accounting: { expected: options.expectedRuns, attempted: 0, completed: 0, skipped: 0, failed: 0 },
    runs: [],
    failedRuns: [],
    artifacts: [],
  };
  writeJsonAtomic(path.join(campaignDir, 'campaign-manifest.json'), manifest);
  writeJsonAtomic(path.join(campaignDir, 'resolved-config.json'), options.resolvedConfig);
  return manifest;
}

const ALLOWED_TRANSITIONS: Record<CampaignState, CampaignState[]> = {
  created: ['validating', 'failed'],
  validating: ['running', 'failed'],
  running: ['partial', 'failed', 'completed'],
  partial: ['running', 'failed'],
  failed: ['running'],
  completed: ['verified', 'failed'],
  verified: [],
};

export function loadCampaign(campaignDir: string): CampaignManifest {
  const manifestPath = path.join(campaignDir, 'campaign-manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing campaign manifest: ${campaignDir}`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CampaignManifest;
}

export function saveCampaign(campaignDir: string, manifest: CampaignManifest): void {
  manifest.updatedAt = new Date().toISOString();
  writeJsonAtomic(path.join(campaignDir, 'campaign-manifest.json'), manifest);
}

export function transitionCampaign(campaignDir: string, next: CampaignState): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (!ALLOWED_TRANSITIONS[manifest.state].includes(next)) {
    throw new Error(`Invalid campaign transition: ${manifest.state} -> ${next}`);
  }
  if (next === 'completed') {
    const { expected, completed, skipped, failed } = manifest.accounting;
    if (failed !== 0 || expected !== completed + skipped) {
      throw new Error('Cannot complete a campaign without exact successful run accounting');
    }
  }
  if (next === 'verified') {
    const verification = verifyCampaign(campaignDir);
    if (!verification.valid) throw new Error(`Campaign verification failed: ${verification.errors.join('; ')}`);
  }
  manifest.state = next;
  saveCampaign(campaignDir, manifest);
  return manifest;
}

export function indexRunArtifact(
  campaignDir: string,
  artifact: Omit<RunArtifact, 'bytes' | 'sha256'>
): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (manifest.state !== 'running') throw new Error('Run artifacts may only be indexed while running');
  if (manifest.runs.some((run) => run.runId === artifact.runId)) {
    throw new Error(`Duplicate run ID: ${artifact.runId}`);
  }
  const absolutePath = path.resolve(campaignDir, artifact.path);
  if (!absolutePath.startsWith(path.resolve(campaignDir) + path.sep)) {
    throw new Error(`Run path escapes campaign: ${artifact.path}`);
  }
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing run artifact: ${artifact.path}`);
  const indexed: RunArtifact = {
    ...artifact,
    bytes: fs.statSync(absolutePath).size,
    sha256: sha256File(absolutePath),
  };
  manifest.runs.push(indexed);
  manifest.accounting.attempted += 1;
  manifest.accounting.completed += 1;
  saveCampaign(campaignDir, manifest);
  return manifest;
}

export function indexRunArtifacts(
  campaignDir: string,
  artifacts: Array<Omit<RunArtifact, 'bytes' | 'sha256'>>
): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (manifest.state !== 'running') throw new Error('Run artifacts may only be indexed while running');
  const knownIds = new Set(manifest.runs.map(run => run.runId));
  const indexed: RunArtifact[] = [];
  for (const artifact of artifacts) {
    if (knownIds.has(artifact.runId)) throw new Error(`Duplicate run ID: ${artifact.runId}`);
    knownIds.add(artifact.runId);
    const absolutePath = resolveContainedArtifactPath(campaignDir, artifact.path);
    if (!fs.existsSync(absolutePath)) throw new Error(`Missing run artifact: ${artifact.path}`);
    indexed.push({
      ...artifact,
      bytes: fs.statSync(absolutePath).size,
      sha256: sha256File(absolutePath),
    });
  }
  manifest.runs.push(...indexed);
  manifest.accounting.attempted += indexed.length;
  manifest.accounting.completed += indexed.length;
  saveCampaign(campaignDir, manifest);
  return manifest;
}

export function indexCampaignArtifact(
  campaignDir: string,
  artifact: Omit<CampaignArtifact, 'bytes' | 'sha256'>
): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (manifest.state === 'verified' || manifest.state === 'failed') {
    throw new Error(`Artifacts cannot be indexed while campaign is ${manifest.state}`);
  }
  if (manifest.artifacts.some(existing => existing.id === artifact.id)) {
    throw new Error(`Duplicate campaign artifact ID: ${artifact.id}`);
  }
  const absolutePath = resolveContainedArtifactPath(campaignDir, artifact.path);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing campaign artifact: ${artifact.path}`);
  manifest.artifacts.push({
    ...artifact,
    bytes: fs.statSync(absolutePath).size,
    sha256: sha256File(absolutePath),
  });
  saveCampaign(campaignDir, manifest);
  return manifest;
}

function resolveContainedArtifactPath(campaignDir: string, artifactPath: string): string {
  const absolutePath = path.resolve(campaignDir, artifactPath);
  if (!absolutePath.startsWith(path.resolve(campaignDir) + path.sep)) {
    throw new Error(`Artifact path escapes campaign: ${artifactPath}`);
  }
  return absolutePath;
}

export function recordFailedRun(
  campaignDir: string,
  failure: Omit<FailedRunArtifact, 'recordedAt'> = {
    runId: 'unknown',
    experimentId: 'unknown',
  }
): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (manifest.state !== 'running') throw new Error('Failures may only be recorded while running');
  if (manifest.failedRuns.some(entry => entry.runId === failure.runId)) {
    throw new Error(`Duplicate failed run ID: ${failure.runId}`);
  }
  manifest.failedRuns.push({ ...failure, recordedAt: new Date().toISOString() });
  manifest.accounting.attempted += 1;
  manifest.accounting.failed += 1;
  saveCampaign(campaignDir, manifest);
  return manifest;
}

export function resolveFailedRun(campaignDir: string, runId: string): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (manifest.state !== 'running') {
    throw new Error('Failed runs may only be resolved while running');
  }
  const index = manifest.failedRuns.findIndex(entry => entry.runId === runId);
  if (index < 0) return manifest;
  manifest.failedRuns.splice(index, 1);
  manifest.accounting.failed -= 1;
  manifest.accounting.attempted -= 1;
  if (manifest.accounting.failed < 0 || manifest.accounting.attempted < 0) {
    throw new Error('Failed-run accounting underflow');
  }
  saveCampaign(campaignDir, manifest);
  return manifest;
}

export function assertResumeIdentity(campaignDir: string, provenance: CampaignProvenance): CampaignManifest {
  const manifest = loadCampaign(campaignDir);
  if (!['created', 'validating', 'running', 'partial', 'failed'].includes(manifest.state)) {
    throw new Error(`Campaign state cannot be resumed: ${manifest.state}`);
  }
  if (identityFor(provenance) !== manifest.identitySha256) {
    throw new Error('Resume provenance does not match campaign identity');
  }
  return manifest;
}

export function verifyCampaign(campaignDir: string): VerificationResult {
  const errors: string[] = [];
  const manifestPath = path.join(campaignDir, 'campaign-manifest.json');
  if (!fs.existsSync(manifestPath)) return { valid: false, errors: ['Missing campaign-manifest.json'] };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CampaignManifest;
  if (!SUPPORTED_CAMPAIGN_SCHEMA_VERSIONS.has(manifest.schemaVersion)) {
    errors.push('Unsupported campaign schema version');
  }
  if (identityFor(manifest.provenance) !== manifest.identitySha256) errors.push('Campaign identity hash mismatch');
  const resolvedConfigPath = path.join(campaignDir, 'resolved-config.json');
  let resolvedConfig: unknown;
  if (!fs.existsSync(resolvedConfigPath)) {
    errors.push('Missing resolved-config.json');
  } else {
    try {
      resolvedConfig = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf8'));
      if (sha256(canonicalJson(resolvedConfig)) !== manifest.provenance.configSha256) {
        errors.push('Resolved configuration hash mismatch');
      }
    } catch {
      errors.push('Resolved configuration is not valid JSON');
    }
  }

  const ids = new Set<string>();
  const indexedPaths = new Set<string>();
  for (const run of manifest.runs) {
    if (ids.has(run.runId)) errors.push(`Duplicate run ID: ${run.runId}`);
    ids.add(run.runId);
    indexedPaths.add(run.path.replace(/\\/g, '/'));
    const absolutePath = path.resolve(campaignDir, run.path);
    if (!absolutePath.startsWith(path.resolve(campaignDir) + path.sep)) {
      errors.push(`Run path escapes campaign: ${run.path}`);
    } else if (!fs.existsSync(absolutePath)) {
      errors.push(`Missing run artifact: ${run.path}`);
    } else {
      const stat = fs.statSync(absolutePath);
      if (stat.size !== run.bytes) errors.push(`Run size mismatch: ${run.path}`);
      if (sha256File(absolutePath) !== run.sha256) errors.push(`Run hash mismatch: ${run.path}`);
    }
  }
  verifyResolvedTaskPlan(resolvedConfig, manifest, errors);
  const experimentsDir = path.join(campaignDir, 'experiments');
  if (fs.existsSync(experimentsDir)) {
    const pending = [experimentsDir];
    while (pending.length > 0) {
      const directory = pending.pop()!;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          pending.push(absolutePath);
        } else if (
          entry.isFile()
          && path.basename(path.dirname(absolutePath)) === 'runs'
          && entry.name.endsWith('.json')
        ) {
          const relativePath = path.relative(campaignDir, absolutePath).replace(/\\/g, '/');
          if (!indexedPaths.has(relativePath)) errors.push(`Unexpected unindexed run artifact: ${relativePath}`);
        }
      }
    }
  }
  if (manifest.accounting.completed !== manifest.runs.length) errors.push('Completed count differs from run index');
  if (!Array.isArray(manifest.failedRuns)) errors.push('Failed-run index is missing');
  if (Array.isArray(manifest.failedRuns) && manifest.accounting.failed !== manifest.failedRuns.length) {
    errors.push('Failed count differs from failed-run index');
  }
  if (!Array.isArray(manifest.artifacts)) {
    errors.push('Campaign artifact index is missing');
  } else {
    const artifactIds = new Set<string>();
    for (const artifact of manifest.artifacts) {
      if (artifactIds.has(artifact.id)) errors.push(`Duplicate campaign artifact ID: ${artifact.id}`);
      artifactIds.add(artifact.id);
      const absolutePath = path.resolve(campaignDir, artifact.path);
      if (!absolutePath.startsWith(path.resolve(campaignDir) + path.sep)) {
        errors.push(`Campaign artifact path escapes campaign: ${artifact.path}`);
      } else if (!fs.existsSync(absolutePath)) {
        errors.push(`Missing campaign artifact: ${artifact.path}`);
      } else {
        const stat = fs.statSync(absolutePath);
        if (stat.size !== artifact.bytes) errors.push(`Campaign artifact size mismatch: ${artifact.path}`);
        if (sha256File(absolutePath) !== artifact.sha256) {
          errors.push(`Campaign artifact hash mismatch: ${artifact.path}`);
        }
      }
    }
  }
  if (manifest.schemaVersion >= 4 && Array.isArray(manifest.artifacts)) {
    for (const [inputId, expectedHash] of Object.entries(manifest.provenance.inputHashes)) {
      const artifactId = inputId === 'validationReport'
        ? 'validation-report'
        : `input:${inputId}`;
      const artifact = manifest.artifacts.find(candidate => candidate.id === artifactId);
      if (!artifact) {
        errors.push(`Campaign input is not archived: ${inputId}`);
      } else if (artifact.sha256 !== expectedHash) {
        errors.push(`Archived input hash differs from provenance: ${inputId}`);
      }
    }
  }
  if (manifest.accounting.attempted !== manifest.accounting.completed + manifest.accounting.failed) {
    errors.push('Attempted count does not equal completed plus failed');
  }
  if (['completed', 'verified'].includes(manifest.state)) {
    if (manifest.accounting.failed !== 0) errors.push('Completed campaign contains failed runs');
    if (manifest.accounting.expected !== manifest.accounting.completed + manifest.accounting.skipped) {
      errors.push('Completed campaign does not exactly account for expected runs');
    }
  }
  return { valid: errors.length === 0, errors };
}

function verifyResolvedTaskPlan(
  resolvedConfig: unknown,
  manifest: CampaignManifest,
  errors: string[],
): void {
  if (!resolvedConfig || typeof resolvedConfig !== 'object' || Array.isArray(resolvedConfig)) return;
  const resolved = resolvedConfig as Record<string, unknown>;
  if (resolved.schemaVersion !== '1.1.0') return;
  if (!Array.isArray(resolved.experiments)) {
    errors.push('Resolved campaign task plan is missing experiments');
    return;
  }
  const planned = new Map<string, {
    experimentId: string;
    conditionId: string;
    replicateIndex: number;
    seed: number;
  }>();
  for (const experimentValue of resolved.experiments) {
    if (!experimentValue || typeof experimentValue !== 'object' || Array.isArray(experimentValue)) {
      errors.push('Resolved campaign contains an invalid experiment plan');
      continue;
    }
    const experiment = experimentValue as Record<string, unknown>;
    const experimentId = String(experiment.experimentId ?? '');
    if (!Array.isArray(experiment.tasks)) {
      errors.push(`Resolved experiment ${experimentId || '<unknown>'} is missing tasks`);
      continue;
    }
    for (const taskValue of experiment.tasks) {
      if (!taskValue || typeof taskValue !== 'object' || Array.isArray(taskValue)) {
        errors.push(`Resolved experiment ${experimentId || '<unknown>'} contains an invalid task`);
        continue;
      }
      const task = taskValue as Record<string, unknown>;
      const runId = String(task.runId ?? '');
      const conditionId = String(task.conditionId ?? '');
      const replicateIndex = Number(task.replicateIndex);
      const seed = Number(task.seed);
      if (!runId || !conditionId || !Number.isSafeInteger(replicateIndex)
          || replicateIndex < 0 || !Number.isSafeInteger(seed)) {
        errors.push(`Resolved experiment ${experimentId || '<unknown>'} contains an incomplete task`);
        continue;
      }
      if (planned.has(runId)) {
        errors.push(`Duplicate planned run ID: ${runId}`);
        continue;
      }
      planned.set(runId, { experimentId, conditionId, replicateIndex, seed });
    }
  }
  if (planned.size !== manifest.accounting.expected) {
    errors.push(
      `Resolved task count ${planned.size} differs from expected count ${manifest.accounting.expected}`
    );
  }
  for (const run of manifest.runs) {
    const task = planned.get(run.runId);
    if (!task) {
      errors.push(`Indexed run is absent from resolved task plan: ${run.runId}`);
      continue;
    }
    if (run.experimentId !== task.experimentId) {
      errors.push(`Experiment mismatch for planned run: ${run.runId}`);
    }
    if (run.conditionId !== task.conditionId) {
      errors.push(`Condition mismatch for planned run: ${run.runId}`);
    }
    if (run.replicateIndex !== task.replicateIndex) {
      errors.push(`Replicate mismatch for planned run: ${run.runId}`);
    }
    if (run.seed !== task.seed) {
      errors.push(`Seed mismatch for planned run: ${run.runId}`);
    }
  }
  if (manifest.state === 'completed' || manifest.state === 'verified') {
    const indexed = new Set(manifest.runs.map(run => run.runId));
    for (const runId of planned.keys()) {
      if (!indexed.has(runId)) errors.push(`Planned run is missing from index: ${runId}`);
    }
  }
}
