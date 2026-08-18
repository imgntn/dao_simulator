import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { copyVerifiedCampaign, type CampaignCopyReceipt } from './campaign-copy';
import {
  canonicalJson,
  loadCampaign,
  sha256,
  verifyCampaign,
  writeJsonAtomic,
} from './campaign-manifest';
import { portableArtifactPath } from './portable-path';

export interface PublicationFinalizationOptions {
  rootDir: string;
  campaignDir: string;
  copyDir: string;
  outputDir: string;
  reportPath: string;
  experimentIds: string[];
}

export interface PublicationFinalizationReport {
  schemaVersion: '1.0.0';
  campaignId: string;
  campaignIdentitySha256: string;
  campaignDir: string;
  copyDir: string;
  copyReceipt: CampaignCopyReceipt;
  experimentIds: string[];
  archivedAnalysisIdentitySha256: string;
  sourceAnalysisIdentitySha256: string;
  copiedAnalysisIdentitySha256: string;
  sourcePublicationIdentitySha256: string;
  copiedPublicationIdentitySha256: string;
  passed: true;
}

interface FinalizationHooks {
  runCommand?: (
    command: string,
    args: string[],
    cwd: string,
  ) => SpawnSyncReturns<Buffer>;
}

interface ReproductionReportShape {
  passed: boolean;
  publicationBundleIdentitySha256?: string;
}

export function scientificAnalysisIdentity(analysis: unknown): string {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new Error('Analysis artifact must be a JSON object');
  }
  const normalized = structuredClone(analysis) as Record<string, unknown>;
  delete normalized.generatedAt;
  return sha256(canonicalJson(normalized));
}

export function finalizePublicationCampaign(
  options: PublicationFinalizationOptions,
  hooks: FinalizationHooks = {},
): PublicationFinalizationReport {
  const rootDir = path.resolve(options.rootDir);
  const campaignDir = path.resolve(options.campaignDir);
  const copyDir = path.resolve(options.copyDir);
  const outputDir = path.resolve(options.outputDir);
  const reportPath = path.resolve(options.reportPath);
  const experimentIds = [...new Set(options.experimentIds.map(value => value.trim()).filter(Boolean))]
    .sort();
  if (experimentIds.length === 0) throw new Error('At least one experiment identifier is required');

  const verification = verifyCampaign(campaignDir);
  if (!verification.valid) {
    throw new Error(`Source campaign verification failed: ${verification.errors.join('; ')}`);
  }
  const campaign = loadCampaign(campaignDir);
  if (campaign.state !== 'verified') {
    throw new Error(`Campaign must be verified before finalization (state: ${campaign.state})`);
  }
  assertCorePublicationSelection(campaignDir, experimentIds);
  if (fs.existsSync(outputDir)) {
    throw new Error(`Finalization output already exists: ${outputDir}`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const runCommand = hooks.runCommand ?? ((command, args, cwd) => spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'buffer',
    stdio: 'inherit',
    windowsHide: true,
  }));
  const tsxCli = path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(tsxCli)) throw new Error('tsx CLI is unavailable; run npm ci first');

  const sourceAnalysisDir = path.join(outputDir, 'analysis-source');
  const reanalysisId = campaign.campaignId;
  runTsx(runCommand, rootDir, tsxCli, 'scripts/reanalyze-campaign.ts', [
    '--campaign-dir', campaignDir,
    '--output-dir', sourceAnalysisDir,
    '--reanalysis-id', reanalysisId,
    '--experiment-ids', experimentIds.join(','),
  ]);
  const sourceAnalysisIdentity = analysisIdentityFromFile(
    path.join(sourceAnalysisDir, 'analysis.json'),
  );
  const archivedAnalysis = campaign.artifacts.find(artifact => artifact.id === 'campaign-analysis');
  if (!archivedAnalysis) throw new Error('Verified campaign has no indexed campaign analysis');
  const archivedAnalysisIdentity = analysisIdentityFromFile(
    path.join(campaignDir, archivedAnalysis.path),
  );
  if (sourceAnalysisIdentity !== archivedAnalysisIdentity) {
    throw new Error('Fresh-process scientific analysis differs from the archived campaign analysis');
  }

  const sourcePublicationDir = path.join(outputDir, 'publication-source');
  const sourceReproductionReport = path.join(outputDir, 'reproduction-source.json');
  runTsx(runCommand, rootDir, tsxCli, 'scripts/reproduce-publication.ts', [
    '--campaign', campaignDir,
    '--output', sourcePublicationDir,
    '--report', sourceReproductionReport,
    '--profile', 'artifacts',
  ]);
  const sourcePublicationIdentity = publicationIdentityFromReport(sourceReproductionReport);

  const copyReceipt = copyVerifiedCampaign({
    sourceDir: campaignDir,
    destinationDir: copyDir,
    receiptPath: path.join(outputDir, 'campaign-copy-receipt.json'),
    receiptBaseDir: rootDir,
  });
  const copiedAnalysisDir = path.join(outputDir, 'analysis-copy');
  runTsx(runCommand, rootDir, tsxCli, 'scripts/reanalyze-campaign.ts', [
    '--campaign-dir', copyDir,
    '--output-dir', copiedAnalysisDir,
    '--reanalysis-id', reanalysisId,
    '--experiment-ids', experimentIds.join(','),
  ]);
  const copiedAnalysisIdentity = analysisIdentityFromFile(
    path.join(copiedAnalysisDir, 'analysis.json'),
  );
  if (sourceAnalysisIdentity !== copiedAnalysisIdentity) {
    throw new Error('Fresh-process scientific analysis identities differ');
  }

  const copiedPublicationDir = path.join(outputDir, 'publication-copy');
  const copiedReproductionReport = path.join(outputDir, 'reproduction-copy.json');
  runTsx(runCommand, rootDir, tsxCli, 'scripts/reproduce-publication.ts', [
    '--campaign', copyDir,
    '--output', copiedPublicationDir,
    '--report', copiedReproductionReport,
    '--profile', 'artifacts',
  ]);
  const copiedPublicationIdentity = publicationIdentityFromReport(copiedReproductionReport);
  if (sourcePublicationIdentity !== copiedPublicationIdentity) {
    throw new Error('Fresh-process publication bundle identities differ');
  }

  const report: PublicationFinalizationReport = {
    schemaVersion: '1.0.0',
    campaignId: campaign.campaignId,
    campaignIdentitySha256: campaign.identitySha256,
    campaignDir: portableArtifactPath(rootDir, campaignDir),
    copyDir: portableArtifactPath(rootDir, copyDir),
    copyReceipt,
    experimentIds,
    archivedAnalysisIdentitySha256: archivedAnalysisIdentity,
    sourceAnalysisIdentitySha256: sourceAnalysisIdentity,
    copiedAnalysisIdentitySha256: copiedAnalysisIdentity,
    sourcePublicationIdentitySha256: sourcePublicationIdentity,
    copiedPublicationIdentitySha256: copiedPublicationIdentity,
    passed: true,
  };
  writeJsonAtomic(reportPath, report);
  return report;
}

export function assertCorePublicationSelection(
  campaignDir: string,
  experimentIds: string[],
): void {
  const resolved = assertExactCampaignSelection(campaignDir, experimentIds);
  const selected = new Set(experimentIds);
  const coreIds = resolved
    .filter(experiment =>
      experiment.experimentId
      && selected.has(experiment.experimentId)
      && experiment.config?.research?.publicationRole === 'core-confirmatory'
    )
    .map(experiment => experiment.experimentId!);
  if (coreIds.length === 0) {
    throw new Error('Publication finalization requires at least one selected core-confirmatory experiment');
  }
}

export interface ResolvedCampaignExperiment {
  experimentId?: string;
  config?: { research?: { publicationRole?: string } };
}

export function assertExactCampaignSelection(
  campaignDir: string,
  experimentIds: string[],
): ResolvedCampaignExperiment[] {
  const resolved = JSON.parse(
    fs.readFileSync(path.join(campaignDir, 'resolved-config.json'), 'utf8'),
  ) as {
    experiments?: ResolvedCampaignExperiment[];
  };
  const selected = new Set(experimentIds);
  const allIds = (resolved.experiments ?? [])
    .map(experiment => experiment.experimentId)
    .filter((value): value is string => Boolean(value));
  const missingIds = allIds.filter(id => !selected.has(id));
  const unexpectedIds = [...selected].filter(id => !allIds.includes(id));
  if (missingIds.length > 0 || unexpectedIds.length > 0) {
    throw new Error(
      'Publication finalization experiment IDs must exactly match the resolved campaign plan',
    );
  }
  return resolved.experiments ?? [];
}

function runTsx(
  runCommand: NonNullable<FinalizationHooks['runCommand']>,
  rootDir: string,
  tsxCli: string,
  script: string,
  args: string[],
): void {
  const result = runCommand(process.execPath, [tsxCli, script, ...args], rootDir);
  if (result.error || result.status !== 0) {
    throw new Error(`${path.basename(script)} failed in an isolated process`);
  }
}

function analysisIdentityFromFile(filePath: string): string {
  return scientificAnalysisIdentity(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function publicationIdentityFromReport(filePath: string): string {
  const report = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ReproductionReportShape;
  if (
    !report.passed
    || typeof report.publicationBundleIdentitySha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(report.publicationBundleIdentitySha256)
  ) {
    throw new Error('Fresh-process reproduction report is incomplete or failed');
  }
  return report.publicationBundleIdentitySha256;
}
