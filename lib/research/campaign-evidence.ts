import * as fs from 'fs';
import * as path from 'path';
import {
  loadCampaign,
  sha256File,
  verifyCampaign,
  type CampaignManifest,
  type VerificationResult,
} from './campaign-manifest';

export interface CampaignEvidenceSummary {
  path: string;
  manifest: CampaignManifest;
  verification: VerificationResult | null;
  conditionCounts: Record<string, number>;
  analysis: unknown | null;
  claims: unknown | null;
  runMetadataOmitted: boolean;
  totalRunMetadata: number;
}

export interface CampaignRunMetadataPage {
  campaignId: string;
  query: string;
  offset: number;
  limit: number;
  total: number;
  runs: CampaignManifest['runs'];
}

export function listCampaignEvidence(
  rootDir: string,
  options: { verify?: boolean; includeRuns?: boolean; campaignId?: string } = {},
): CampaignEvidenceSummary[] {
  const discoveredManifests = [
    ...findManifestFiles(path.join(rootDir, 'artifacts', 'campaigns')),
    ...findManifestFiles(path.join(rootDir, 'results', 'campaigns')),
  ];
  const manifests = options.campaignId
    ? discoveredManifests.filter(
      manifestPath => path.basename(path.dirname(manifestPath)) === options.campaignId
    )
    : discoveredManifests;
  return manifests.map(manifestPath => {
    const campaignDir = path.dirname(manifestPath);
    const manifest = loadCampaign(campaignDir);
    const conditionCounts: Record<string, number> = {};
    for (const run of manifest.runs) {
      conditionCounts[run.conditionId] = (conditionCounts[run.conditionId] ?? 0) + 1;
    }
    const totalRunMetadata = manifest.runs.length;
    return {
      path: path.relative(rootDir, campaignDir).replace(/\\/g, '/'),
      manifest: options.includeRuns === false ? { ...manifest, runs: [] } : manifest,
      verification: options.verify ? verifyCampaign(campaignDir) : null,
      conditionCounts,
      analysis: readIndexedJson(campaignDir, manifest, 'campaign-analysis'),
      claims: readIndexedJson(campaignDir, manifest, 'claim-registry'),
      runMetadataOmitted: options.includeRuns === false,
      totalRunMetadata,
    };
  }).sort((a, b) => b.manifest.createdAt.localeCompare(a.manifest.createdAt));
}

export function listCampaignRunMetadata(
  rootDir: string,
  campaignId: string,
  options: { query?: string; offset?: number; limit?: number } = {},
): CampaignRunMetadataPage {
  const campaignDir = locateCampaignDir(rootDir, campaignId);
  const manifest = loadCampaign(campaignDir);
  if (manifest.state !== 'verified') {
    throw new Error(`Campaign is not verified: ${campaignId}`);
  }
  const query = (options.query ?? '').trim().toLowerCase();
  if (query.length > 200) throw new Error('Run query is too long');
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('Run offset must be a non-negative integer');
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
    throw new Error('Run limit must be an integer from 1 to 200');
  }
  const matching = query
    ? manifest.runs.filter(run =>
      [run.runId, run.experimentId, run.conditionId, String(run.seed)]
        .some(value => value.toLowerCase().includes(query))
    )
    : manifest.runs;
  return {
    campaignId,
    query,
    offset,
    limit,
    total: matching.length,
    runs: matching.slice(offset, offset + limit),
  };
}

export function readVerifiedCampaignRun(
  rootDir: string,
  campaignId: string,
  runId: string,
): unknown {
  if (!runId.trim() || runId.length > 240) throw new Error('Invalid run identifier');
  const campaignDir = locateCampaignDir(rootDir, campaignId);
  const manifest = loadCampaign(campaignDir);
  if (manifest.state !== 'verified') throw new Error(`Campaign is not verified: ${campaignId}`);
  const verification = verifyCampaign(campaignDir);
  if (!verification.valid) {
    throw new Error(`Campaign verification failed: ${verification.errors.join('; ')}`);
  }
  const run = manifest.runs.find(candidate => candidate.runId === runId);
  if (!run) throw new Error(`Run not found: ${runId}`);
  const absolutePath = path.resolve(campaignDir, run.path);
  if (!absolutePath.startsWith(`${path.resolve(campaignDir)}${path.sep}`)) {
    throw new Error('Run path escapes the campaign');
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as unknown;
}

function locateCampaignDir(rootDir: string, campaignId: string): string {
  if (!/^[a-z0-9][a-z0-9._-]+$/i.test(campaignId)) {
    throw new Error('Invalid campaign identifier');
  }
  const candidates = [
    path.join(rootDir, 'artifacts', 'campaigns', campaignId),
    path.join(rootDir, 'results', 'campaigns', campaignId),
  ].filter(candidate => fs.existsSync(path.join(candidate, 'campaign-manifest.json')));
  if (candidates.length === 0) throw new Error(`Campaign not found: ${campaignId}`);
  if (candidates.length > 1) throw new Error(`Campaign identifier is ambiguous: ${campaignId}`);
  return candidates[0];
}

function findManifestFiles(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) return [];
  const found: string[] = [];
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.name === 'campaign-manifest.json') found.push(absolute);
    }
  }
  return found;
}

function readIndexedJson(
  campaignDir: string,
  manifest: CampaignManifest,
  artifactId: string,
): unknown | null {
  const artifact = manifest.artifacts.find(candidate => candidate.id === artifactId);
  if (!artifact) return null;
  const filePath = path.resolve(campaignDir, artifact.path);
  if (!filePath.startsWith(`${path.resolve(campaignDir)}${path.sep}`)) {
    return { error: `Indexed ${artifactId} path escapes the campaign` };
  }
  if (!fs.existsSync(filePath)) return { error: `Indexed ${artifactId} is missing` };
  if (
    fs.statSync(filePath).size !== artifact.bytes
    || sha256File(filePath) !== artifact.sha256
  ) {
    return { error: `Indexed ${artifactId} does not match its manifest hash` };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    return {
      error: `Invalid JSON in ${path.basename(filePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
