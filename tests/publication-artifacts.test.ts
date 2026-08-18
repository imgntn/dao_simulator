import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildCampaignAnalysis,
  campaignRunConditionId,
} from '../lib/research/campaign-analysis';
import {
  copyFileAtomic,
  createCampaign,
  indexCampaignArtifact,
  indexRunArtifacts,
  sha256File,
  transitionCampaign,
  writeJsonAtomic,
} from '../lib/research/campaign-manifest';
import {
  CALIBRATION_VALIDATION_REPORT_SCHEMA_VERSION,
  type CalibrationValidationReport,
} from '../lib/research/calibration-validation-report';
import { buildClaimRegistry } from '../lib/research/claim-registry';
import type { ExperimentConfig, RunResult } from '../lib/research/experiment-config';
import {
  generatePublicationArtifacts,
  publicationBundleIdentity,
  verifyPublicationBundle,
} from '../lib/research/publication-artifacts';
import { runReproduction } from '../lib/research/reproduction';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createVerifiedFixture(
  publicationRole:
    | 'core-confirmatory'
    | 'supporting-exploratory'
    | 'validation' = 'core-confirmatory',
): { campaignDir: string; outputDir: string } {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'publication-bundle-'));
  temporaryDirectories.push(temporary);
  const experimentId = publicationRole === 'core-confirmatory'
    ? 'core-fixture'
    : publicationRole === 'supporting-exploratory'
      ? 'supporting-fixture'
      : 'validation-fixture';
  const config: ExperimentConfig = {
    id: experimentId,
    name: publicationRole === 'core-confirmatory'
      ? 'Core fixture'
      : publicationRole === 'supporting-exploratory'
        ? 'Supporting fixture'
        : 'Validation fixture',
    research: {
      classification: publicationRole === 'core-confirmatory'
        ? 'confirmatory'
        : publicationRole === 'supporting-exploratory'
          ? 'exploratory'
          : 'validation',
      publicationRole,
      researchQuestionIds: ['RQ-FIXTURE'],
      hypothesis: 'The policy changes proposal completion.',
      primaryOutcome: 'proposal_completion_rate',
      secondaryOutcomes: [],
      analysisModel: 'paired_contrast',
      comparisonCorrection: 'holm',
      smallestEffectOfInterest: {
        value: 0.05,
        unit: 'absolute proportion',
        rationale: 'Fixture practical threshold.',
      },
      analysisFamily: 'fixture',
      experimentalUnit: 'One paired seeded simulation replicate.',
    },
    baseConfig: { inline: {} },
    sweep: { parameter: 'policy', values: [false, true] },
    execution: {
      runsPerConfig: 2,
      stepsPerRun: 2,
      seedStrategy: 'fixed',
      fixedSeeds: [101, 202],
      workers: 1,
    },
    metrics: [
      {
        name: 'Proposal Completion Rate',
        type: 'builtin',
        builtin: 'proposal_completion_rate',
      },
    ],
    output: { directory: 'unused', formats: ['json'], includeRawRuns: true },
  };
  const campaignId = `verified-${experimentId}`;
  const calibrationReport: CalibrationValidationReport = {
    schemaVersion: CALIBRATION_VALIDATION_REPORT_SCHEMA_VERSION,
    timestamp: '2026-07-17T00:00:00.000Z',
    provenance: {
      gitSha: '0123456789abcdef0123456789abcdef01234567',
      workingTreeClean: true,
      configHash: 'a'.repeat(64),
      launchCommand: ['node', 'scripts/run-calibration-validation.ts'],
      nodeVersion: 'v24.0.0',
      platform: 'win32',
      arch: 'x64',
    },
    config: {
      episodes: 2,
      stepsPerEpisode: 10,
      seed: 42,
      evaluationMode: 'temporal_holdout',
      includeUncalibratedNull: true,
    },
    averageScore: 0.6,
    status: 'passed',
    expectedDaoCount: 14,
    daoCount: 14,
    failedDaoCount: 0,
    failures: [],
    results: Array.from({ length: 14 }, (_, index) => ({
      dao_id: `dao-${index + 1}`,
      governance_rule: 'majority',
      overall_score: 0.6,
      ci95: '0.5-0.7',
      proposal_freq_error: 0.1,
      pass_rate_error: 0.1,
      participation_error: 0.1,
      price_level_error: 0.1,
      voter_conc_error: 0.1,
      forum_error: 0.1,
      best: 0.7,
      worst: 0.5,
      std: 0.05,
      persistence_score: 0.4,
      uncalibrated_score: 0.3,
      skill_vs_persistence: 0.2,
      skill_vs_uncalibrated: 0.3,
    })),
  };
  const calibrationPath = path.join(temporary, 'calibration-validation.json');
  writeJsonAtomic(calibrationPath, calibrationReport);
  createCampaign({
    rootDir: process.cwd(),
    outputRootDir: temporary,
    campaignId,
    resolvedConfig: { experiments: [config] },
    expectedRuns: 4,
    workerCount: 1,
    inputFiles: {
      calibrationValidationReport: path.relative(process.cwd(), calibrationPath),
    },
    command: ['fixture'],
    allowDirty: true,
  });
  const campaignDir = path.join(temporary, 'campaigns', campaignId);
  const archivedCalibrationPath = path.join(
    campaignDir,
    'inputs',
    'calibrationValidationReport',
    'calibration-validation.json',
  );
  copyFileAtomic(calibrationPath, archivedCalibrationPath);
  indexCampaignArtifact(campaignDir, {
    id: 'input:calibrationValidationReport',
    kind: 'input',
    path: 'inputs/calibrationValidationReport/calibration-validation.json',
  });
  transitionCampaign(campaignDir, 'validating');
  transitionCampaign(campaignDir, 'running');

  const results: RunResult[] = [];
  for (const policy of [false, true]) {
    for (const [runIndex, seed] of [101, 202].entries()) {
      const runId = `fixture-${policy}-${seed}`;
      results.push({
        runId,
        experimentName: config.name,
        sweepValue: policy,
        runIndex,
        config: { policy, seed } as never,
        seed,
        metrics: {
          'Proposal Completion Rate': (policy ? 0.4 : 0.2) + runIndex * 0.01,
        },
        startedAt: '2026-07-17T00:00:00.000Z',
        completedAt: `2026-07-17T00:00:0${results.length + 1}.000Z`,
        durationMs: 1,
        stepsCompleted: 2,
      });
    }
  }
  const runArtifacts = results.map(result => {
    const relativePath = `experiments/${experimentId}/runs/${result.runId}.json`;
    writeJsonAtomic(path.join(campaignDir, relativePath), result);
    return {
      runId: result.runId,
      experimentId: config.id!,
      conditionId: campaignRunConditionId(result),
      seed: result.seed,
      replicateIndex: result.runIndex,
      path: relativePath,
    };
  });
  indexRunArtifacts(campaignDir, runArtifacts);

  const analysis = buildCampaignAnalysis(campaignId, [{ config, results }]);
  const analysisRelativePath = 'analysis/analysis.json';
  const analysisPath = path.join(campaignDir, analysisRelativePath);
  writeJsonAtomic(analysisPath, analysis);
  indexCampaignArtifact(campaignDir, {
    id: 'campaign-analysis',
    kind: 'analysis',
    path: analysisRelativePath,
  });

  const claims = buildClaimRegistry(campaignId, analysis as unknown as Record<string, unknown>, {
    path: analysisRelativePath,
    sha256: sha256File(analysisPath),
  });
  writeJsonAtomic(path.join(campaignDir, 'claims.json'), claims);
  indexCampaignArtifact(campaignDir, {
    id: 'claim-registry',
    kind: 'claim-registry',
    path: 'claims.json',
  });
  transitionCampaign(campaignDir, 'completed');
  transitionCampaign(campaignDir, 'verified');
  return {
    campaignDir,
    outputDir: path.join(temporary, 'publication', campaignId),
  };
}

describe('verified publication artifact generation', () => {
  it('creates deterministic claim-linked tables, figures, and LaTeX fragments', () => {
    const { campaignDir, outputDir } = createVerifiedFixture();
    const first = generatePublicationArtifacts(campaignDir, outputDir);

    expect(first.scope.experimentIds).toEqual(['core-fixture']);
    expect(first.scope.claimIds).toHaveLength(1);
    expect(first.sourceCampaign.runCount).toBe(4);
    expect(verifyPublicationBundle(outputDir)).toEqual([]);
    expect(fs.readFileSync(path.join(outputDir, 'fragments', 'results.tex'), 'utf8'))
      .toContain(first.scope.claimIds[0]);
    const bundledClaims = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'claims.json'), 'utf8'),
    ) as { claims: Array<{ id: string }> };
    expect(bundledClaims.claims.map(claim => claim.id)).toEqual(first.scope.claimIds);
    expect(fs.readFileSync(path.join(outputDir, 'RESULTS.md'), 'utf8'))
      .toContain('model-conditional simulation findings');
    expect(fs.readFileSync(path.join(outputDir, 'tables', 'calibration-holdout.csv'), 'utf8'))
      .toContain('dao-14');
    expect(fs.readFileSync(path.join(outputDir, 'fragments', 'calibration.tex'), 'utf8'))
      .toContain('14 DAOs');

    const second = generatePublicationArtifacts(campaignDir, outputDir);
    expect(publicationBundleIdentity(second)).toBe(publicationBundleIdentity(first));
  });

  it('detects any post-generation artifact mutation', () => {
    const { campaignDir, outputDir } = createVerifiedFixture();
    generatePublicationArtifacts(campaignDir, outputDir);
    fs.appendFileSync(path.join(outputDir, 'tables', 'claims.csv'), 'tampered\n');

    expect(verifyPublicationBundle(outputDir))
      .toContain('Publication file size mismatch: tables/claims.csv');
    expect(verifyPublicationBundle(outputDir))
      .toContain('Publication file hash mismatch: tables/claims.csv');
  });

  it('watermarks validation-role pipeline smoke bundles without weakening the default gate', () => {
    const { campaignDir, outputDir } = createVerifiedFixture('validation');
    expect(() => generatePublicationArtifacts(campaignDir, outputDir))
      .toThrow('Verified campaign contains no core-confirmatory experiments');

    const bundle = generatePublicationArtifacts(
      campaignDir,
      outputDir,
      { mode: 'pipeline-smoke' },
    );
    expect(bundle.scope).toMatchObject({
      mode: 'pipeline-smoke',
      publicationRole: 'validation',
      experimentIds: ['validation-fixture'],
    });
    expect(verifyPublicationBundle(outputDir)).toEqual([]);
    expect(fs.readFileSync(path.join(outputDir, 'PIPELINE_SMOKE_ONLY.md'), 'utf8'))
      .toContain('not confirmatory findings');
    expect(fs.readFileSync(path.join(outputDir, 'RESULTS.md'), 'utf8'))
      .toContain('NOT SCIENTIFIC EVIDENCE');
  });

  it('generates a clearly scoped supporting-exploratory robustness bundle', () => {
    const { campaignDir, outputDir } = createVerifiedFixture('supporting-exploratory');
    expect(() => generatePublicationArtifacts(campaignDir, outputDir))
      .toThrow('Verified campaign contains no core-confirmatory experiments');

    const bundle = generatePublicationArtifacts(campaignDir, outputDir, { mode: 'supporting' });
    expect(bundle.scope).toMatchObject({
      mode: 'supporting',
      publicationRole: 'supporting-exploratory',
      experimentIds: ['supporting-fixture'],
    });
    expect(verifyPublicationBundle(outputDir)).toEqual([]);
    expect(fs.readFileSync(path.join(outputDir, 'RESULTS.md'), 'utf8'))
      .toContain('Supporting-exploratory robustness experiments');
    expect(fs.readFileSync(path.join(outputDir, 'fragments', 'methods.tex'), 'utf8'))
      .toContain('supporting-exploratory experiment identifiers');
  });

  it('records campaign source provenance in an artifact reproduction report', () => {
    const { campaignDir, outputDir } = createVerifiedFixture();
    const reportPath = path.join(path.dirname(outputDir), 'reproduction-report.json');
    const report = runReproduction({
      campaignDir,
      outputDir,
      reportPath,
      profile: 'artifacts',
      rootDir: process.cwd(),
    });
    const campaign = JSON.parse(
      fs.readFileSync(path.join(campaignDir, 'campaign-manifest.json'), 'utf8'),
    ) as { provenance: { gitCommit: string } };
    expect(report.passed).toBe(true);
    expect(report.sourceGitSha).toBe(campaign.provenance.gitCommit);
    expect(report.publicationBundleIdentitySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(fs.readFileSync(reportPath, 'utf8'))).toEqual(report);
  });
});
