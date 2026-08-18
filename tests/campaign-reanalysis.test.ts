import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  reanalyzeCampaign,
  verifyCampaignReanalysis,
} from '../lib/research/campaign-reanalysis';
import {
  campaignConditionId,
} from '../lib/research/campaign-analysis';
import {
  createCampaign,
  indexRunArtifacts,
  transitionCampaign,
  writeJsonAtomic,
} from '../lib/research/campaign-manifest';
import type {
  ExperimentConfig,
  RunResult,
} from '../lib/research/experiment-config';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function createSourceCampaign(): { campaignDir: string; outputDir: string } {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-reanalysis-'));
  temporaryDirectories.push(temporary);
  const campaignId = 'source-pilot';
  const config: ExperimentConfig = {
    id: 'pilot-fixture',
    name: 'Pilot fixture',
    research: {
      classification: 'exploratory',
      publicationRole: 'pilot-development',
      researchQuestionIds: ['RQ-FIXTURE'],
      hypothesis: 'The policy changes proposal completion.',
      primaryOutcome: 'proposal_completion_rate',
      secondaryOutcomes: [],
      analysisModel: 'paired_contrast',
      comparisonCorrection: 'holm',
      smallestEffectOfInterest: {
        value: 0.05,
        unit: 'absolute proportion',
        rationale: 'Fixture threshold.',
      },
      analysisFamily: 'fixture',
      experimentalUnit: 'One paired seeded simulation.',
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
    metrics: [{
      name: 'Proposal Completion Rate',
      type: 'builtin',
      builtin: 'proposal_completion_rate',
    }],
    output: { directory: 'unused', formats: ['json'], includeRawRuns: true },
  };
  const tasks = [false, true].flatMap(policy =>
    [101, 202].map((seed, runIndex) => {
      const runId = `run-${policy ? 'a-treatment' : 'z-reference'}-${seed}`;
      const runConfig = { policy };
      return {
        runId,
        condition: policy,
        conditionId: campaignConditionId(policy, runConfig),
        replicateIndex: runIndex,
        seed,
        runConfig,
      };
    })
  );
  createCampaign({
    rootDir: process.cwd(),
    outputRootDir: temporary,
    campaignId,
    resolvedConfig: {
      schemaVersion: '1.1.0',
      campaignId,
      experiments: [{
        experimentId: config.id,
        config,
        tasks: tasks.map(({ runConfig: _runConfig, ...task }) => task),
      }],
    },
    expectedRuns: tasks.length,
    workerCount: 1,
    allowDirty: true,
    command: ['fixture'],
  });
  const campaignDir = path.join(temporary, 'campaigns', campaignId);
  transitionCampaign(campaignDir, 'validating');
  transitionCampaign(campaignDir, 'running');
  const artifacts = tasks.map((task, index) => {
    const result: RunResult = {
      runId: task.runId,
      experimentName: config.name,
      conditionId: task.conditionId,
      sweepValue: task.condition,
      runIndex: task.replicateIndex,
      config: task.runConfig as never,
      seed: task.seed,
      metrics: {
        'Proposal Completion Rate': (task.condition ? 0.4 : 0.2) + task.replicateIndex * 0.01,
      },
      startedAt: '2026-07-17T00:00:00.000Z',
      completedAt: `2026-07-17T00:00:0${index + 1}.000Z`,
      durationMs: 1,
      stepsCompleted: 2,
    };
    const relativePath = `experiments/${config.id}/runs/${task.runId}.json`;
    writeJsonAtomic(path.join(campaignDir, relativePath), result);
    return {
      runId: task.runId,
      experimentId: config.id!,
      conditionId: task.conditionId,
      replicateIndex: task.replicateIndex,
      seed: task.seed,
      path: relativePath,
    };
  });
  indexRunArtifacts(campaignDir, artifacts);
  transitionCampaign(campaignDir, 'completed');
  transitionCampaign(campaignDir, 'verified');
  return { campaignDir, outputDir: path.join(temporary, 'reanalysis') };
}

describe('campaign reanalysis', () => {
  it('binds derived analysis to verified source runs and detects tampering', () => {
    const { campaignDir, outputDir } = createSourceCampaign();
    const manifest = reanalyzeCampaign({
      campaignDir,
      outputDir,
      reanalysisId: 'fixture-reanalysis',
      experimentIds: ['pilot-fixture'],
    });

    expect(manifest.sourceRuns).toHaveLength(4);
    expect(manifest.designInputs).toEqual([]);
    expect(verifyCampaignReanalysis(outputDir)).toEqual({ valid: true, errors: [] });
    const analysis = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'analysis.json'), 'utf8'),
    ) as {
      experiments: Array<{
        referenceCondition: { factors: { policy: boolean } };
        pairedEffects: Array<{ meanDifference: number }>;
      }>;
    };
    expect(analysis.experiments[0].referenceCondition.factors.policy).toBe(false);
    expect(analysis.experiments[0].pairedEffects[0].meanDifference).toBeCloseTo(0.2);

    fs.appendFileSync(path.join(outputDir, 'analysis.json'), '\n');
    expect(verifyCampaignReanalysis(outputDir).errors).toContain(
      'Size mismatch for analysis'
    );
    expect(verifyCampaignReanalysis(outputDir).errors).toContain(
      'Hash mismatch for analysis'
    );
  });
});
