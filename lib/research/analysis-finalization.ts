import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { copyVerifiedCampaign, type CampaignCopyReceipt } from './campaign-copy';
import {
  loadCampaign,
  verifyCampaign,
  writeJsonAtomic,
} from './campaign-manifest';
import {
  assertExactCampaignSelection,
  scientificAnalysisIdentity,
} from './publication-finalization';
import { portableArtifactPath } from './portable-path';
import {
  publicationBundleIdentity,
  type PublicationBundleManifest,
} from './publication-artifacts';

export interface AnalysisFinalizationOptions {
  rootDir: string;
  campaignDir: string;
  copyDir: string;
  outputDir: string;
  reportPath: string;
  experimentIds: string[];
}

export interface AnalysisFinalizationReport {
  schemaVersion: '1.1.0';
  campaignId: string;
  campaignIdentitySha256: string;
  campaignDir: string;
  copyDir: string;
  copyReceipt: CampaignCopyReceipt;
  experimentIds: string[];
  archivedAnalysisIdentitySha256: string;
  sourceAnalysisIdentitySha256: string;
  copiedAnalysisIdentitySha256: string;
  supportingBundle?: {
    sourceIdentitySha256: string;
    copiedIdentitySha256: string;
  };
  passed: true;
}

interface FinalizationHooks {
  runCommand?: (
    command: string,
    args: string[],
    cwd: string,
  ) => SpawnSyncReturns<Buffer>;
}

export function finalizeCampaignAnalysis(
  options: AnalysisFinalizationOptions,
  hooks: FinalizationHooks = {},
): AnalysisFinalizationReport {
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
  const resolvedExperiments = assertExactCampaignSelection(campaignDir, experimentIds);
  const supportingOnly = resolvedExperiments.length > 0 && resolvedExperiments.every(
    experiment => experiment.config?.research?.publicationRole === 'supporting-exploratory',
  );
  if (fs.existsSync(outputDir)) {
    throw new Error(`Finalization output already exists: ${outputDir}`);
  }
  if (fs.existsSync(copyDir)) {
    throw new Error(`Finalization copy already exists: ${copyDir}`);
  }

  const runCommand = hooks.runCommand ?? ((command, args, cwd) => spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'buffer',
    stdio: 'inherit',
    windowsHide: true,
  }));
  const tsxCli = path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(tsxCli)) throw new Error('tsx CLI is unavailable; run npm ci first');
  fs.mkdirSync(outputDir, { recursive: true });

  const reanalysisId = campaign.campaignId;
  const sourceAnalysisDir = path.join(outputDir, 'analysis-source');
  runReanalysis(runCommand, rootDir, tsxCli, campaignDir, sourceAnalysisDir, reanalysisId, experimentIds);
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
  let sourceSupportingIdentity: string | undefined;
  if (supportingOnly) {
    const sourceSupportingDir = path.join(outputDir, 'supporting-source');
    runSupportingBundle(runCommand, rootDir, tsxCli, campaignDir, sourceSupportingDir);
    sourceSupportingIdentity = publicationIdentityFromManifest(
      path.join(sourceSupportingDir, 'publication-manifest.json'),
    );
  }

  const copyReceipt = copyVerifiedCampaign({
    sourceDir: campaignDir,
    destinationDir: copyDir,
    receiptPath: path.join(outputDir, 'campaign-copy-receipt.json'),
    receiptBaseDir: rootDir,
  });
  const copiedAnalysisDir = path.join(outputDir, 'analysis-copy');
  runReanalysis(runCommand, rootDir, tsxCli, copyDir, copiedAnalysisDir, reanalysisId, experimentIds);
  const copiedAnalysisIdentity = analysisIdentityFromFile(
    path.join(copiedAnalysisDir, 'analysis.json'),
  );
  if (sourceAnalysisIdentity !== copiedAnalysisIdentity) {
    throw new Error('Fresh-process scientific analysis identities differ');
  }
  let copiedSupportingIdentity: string | undefined;
  if (supportingOnly) {
    const copiedSupportingDir = path.join(outputDir, 'supporting-copy');
    runSupportingBundle(runCommand, rootDir, tsxCli, copyDir, copiedSupportingDir);
    copiedSupportingIdentity = publicationIdentityFromManifest(
      path.join(copiedSupportingDir, 'publication-manifest.json'),
    );
    if (sourceSupportingIdentity !== copiedSupportingIdentity) {
      throw new Error('Fresh-process supporting bundle identities differ');
    }
  }

  const report: AnalysisFinalizationReport = {
    schemaVersion: '1.1.0',
    campaignId: campaign.campaignId,
    campaignIdentitySha256: campaign.identitySha256,
    campaignDir: portableArtifactPath(rootDir, campaignDir),
    copyDir: portableArtifactPath(rootDir, copyDir),
    copyReceipt,
    experimentIds,
    archivedAnalysisIdentitySha256: archivedAnalysisIdentity,
    sourceAnalysisIdentitySha256: sourceAnalysisIdentity,
    copiedAnalysisIdentitySha256: copiedAnalysisIdentity,
    ...(supportingOnly ? {
      supportingBundle: {
        sourceIdentitySha256: sourceSupportingIdentity!,
        copiedIdentitySha256: copiedSupportingIdentity!,
      },
    } : {}),
    passed: true,
  };
  writeJsonAtomic(reportPath, report);
  return report;
}

function runSupportingBundle(
  runCommand: NonNullable<FinalizationHooks['runCommand']>,
  rootDir: string,
  tsxCli: string,
  campaignDir: string,
  outputDir: string,
): void {
  const result = runCommand(process.execPath, [
    tsxCli,
    'scripts/generate-publication-artifacts.ts',
    '--campaign', campaignDir,
    '--output', outputDir,
    '--supporting',
  ], rootDir);
  if (result.error || result.status !== 0) {
    throw new Error('Supporting artifact generation failed in an isolated process');
  }
}

function runReanalysis(
  runCommand: NonNullable<FinalizationHooks['runCommand']>,
  rootDir: string,
  tsxCli: string,
  campaignDir: string,
  outputDir: string,
  reanalysisId: string,
  experimentIds: string[],
): void {
  const result = runCommand(process.execPath, [
    tsxCli,
    'scripts/reanalyze-campaign.ts',
    '--campaign-dir', campaignDir,
    '--output-dir', outputDir,
    '--reanalysis-id', reanalysisId,
    '--experiment-ids', experimentIds.join(','),
  ], rootDir);
  if (result.error || result.status !== 0) {
    throw new Error('reanalyze-campaign.ts failed in an isolated process');
  }
}

function analysisIdentityFromFile(filePath: string): string {
  return scientificAnalysisIdentity(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function publicationIdentityFromManifest(filePath: string): string {
  const manifest = JSON.parse(
    fs.readFileSync(filePath, 'utf8'),
  ) as PublicationBundleManifest;
  return publicationBundleIdentity(manifest);
}
