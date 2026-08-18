import { describe, expect, it } from 'vitest';
import {
  assertRunMatchesPlan,
  buildCampaignAnalysis,
  campaignConditionId,
  campaignRunConditionId,
  type CampaignExperimentInput,
} from '../lib/research/campaign-analysis';
import type {
  ExperimentConfig,
  RunResult,
} from '../lib/research/experiment-config';

function fixtureInput(options: {
  analysisModel?: 'paired_contrast' | 'factorial_ols';
  unit?: string;
  primary?: 'proposal_completion_rate' | 'median_time_to_decision';
} = {}): CampaignExperimentInput {
  const primary = options.primary ?? 'proposal_completion_rate';
  const metricName = primary === 'proposal_completion_rate'
    ? 'Proposal Completion Rate'
    : 'Median Time to Decision';
  const config: ExperimentConfig = {
    id: 'fixture-experiment',
    name: 'Fixture experiment',
    research: {
      classification: 'exploratory',
      publicationRole: 'pilot-development',
      researchQuestionIds: ['RQX'],
      hypothesis: 'The treatment changes the outcome.',
      primaryOutcome: primary,
      secondaryOutcomes: [],
      analysisModel: options.analysisModel ?? 'factorial_ols',
      comparisonCorrection: 'holm',
      smallestEffectOfInterest: {
        value: 0.1,
        unit: options.unit ?? 'absolute proportion',
        rationale: 'Fixture threshold.',
      },
      analysisFamily: 'fixture-family',
      experimentalUnit: 'One seeded replicate.',
    },
    baseConfig: { template: 'compound' },
    sweep: {
      grid: [
        { parameter: 'policy', values: [false, true] },
        { parameter: 'level', values: [1, 2] },
      ],
    },
    execution: {
      runsPerConfig: 4,
      stepsPerRun: 5,
      seedStrategy: 'fixed',
      fixedSeeds: [11, 22, 33, 44],
      workers: 1,
    },
    metrics: [{ name: metricName, type: 'builtin', builtin: primary }],
    output: { directory: 'results/fixture', formats: ['json'] },
  };
  const results: RunResult[] = [];
  let order = 0;
  for (const policy of [false, true]) {
    for (const level of [1, 2]) {
      for (const seed of [11, 22, 33, 44]) {
        const value = primary === 'median_time_to_decision'
          ? 10 + Number(policy) * 2 + level + seed / 100
            + Number(policy) * seed / 10_000
            + level * seed / 100_000
          : 0.2 + Number(policy) * 0.1 + level * 0.02 + seed / 10_000
            + Number(policy) * seed / 1_000_000
            + level * seed / 10_000_000;
        results.push({
          runId: `run-${order++}`,
          experimentName: config.name,
          sweepValue: `${policy}-${level}`,
          runIndex: results.length % 4,
          config: { policy, level } as never,
          seed,
          metrics: { [metricName]: value },
          timeline: [0, 2, 4].map(step => ({
            step,
            memberCount: 100 + step,
            proposalCount: step / 2,
            projectCount: 0,
            tokenPrice: value + step / 100,
            treasuryFunds: 10_000 + value * 100 - step,
            gini: 0.2,
            reputationGini: 0.1,
            participationRate: 0.3,
          })),
          startedAt: '2026-07-17T00:00:00.000Z',
          completedAt: `2026-07-17T00:00:${String(order).padStart(2, '0')}.000Z`,
          durationMs: 1,
          stepsCompleted: 5,
        });
      }
    }
  }
  return { config, results };
}

describe('campaign analysis artifacts', () => {
  it('identifies conditions independently of replicate seeds and output paths', () => {
    const input = fixtureInput({ analysisModel: 'paired_contrast' });
    const first = structuredClone(input.results[0]);
    const repeated = structuredClone(input.results[0]);
    const repeatedConfig = repeated.config as {
      seed?: number;
      csvFilename?: string;
      voting_activity?: number;
    };
    repeated.seed = 999;
    repeatedConfig.seed = 999;
    repeatedConfig.csvFilename = 'replicate-999.csv';

    expect(campaignRunConditionId(repeated)).toBe(campaignRunConditionId(first));
    repeatedConfig.voting_activity = 0.9;
    expect(campaignRunConditionId(repeated)).not.toBe(campaignRunConditionId(first));
  });

  it('preserves the planned condition identity after runtime config expansion', () => {
    const input = fixtureInput({ analysisModel: 'paired_contrast' });
    const result = structuredClone(input.results[0]);
    const plannedConfig = {
      voting_activity: 0.4,
      population: { total: 20, composition: { passive_members: 1 } },
    };
    const plannedConditionId = campaignConditionId(result.sweepValue, plannedConfig);
    result.conditionId = plannedConditionId;
    result.config = {
      ...(result.config as object),
      voting_activity: 0.4,
      num_passive_members: 20,
      useIndexedDB: false,
      seed: result.seed,
    } as typeof result.config;

    expect(campaignRunConditionId(result)).toBe(plannedConditionId);
    expect(campaignRunConditionId(result)).not.toBe(
      campaignConditionId(result.sweepValue, result.config)
    );
    expect(() => assertRunMatchesPlan(result, {
      runId: result.runId,
      conditionId: plannedConditionId,
      replicateIndex: result.runIndex,
      seed: result.seed,
    })).not.toThrow();
    expect(() => assertRunMatchesPlan(result, {
      runId: result.runId,
      conditionId: plannedConditionId,
      replicateIndex: result.runIndex,
      seed: result.seed + 1,
    })).toThrow(/seed differs from plan/);
  });

  it('builds deterministic descriptives, paired contrasts, power, and factorial models', () => {
    const input = fixtureInput();
    const artifact = buildCampaignAnalysis('fixture-campaign', [input]);
    expect(artifact.campaignId).toBe('fixture-campaign');
    expect(artifact.generatedAt).toBe('2026-07-17T00:00:16.000Z');
    expect(artifact.pairedEffects).toHaveLength(3);
    expect(artifact.factorialModels).toHaveLength(1);
    expect(artifact.schemaVersion).toBe('1.1.0');
    const factorial = artifact.factorialModels[0] as {
      responseSurface: Array<{
        factors: Record<string, unknown>;
        meanConfidenceInterval: { lower: number; upper: number };
      }>;
    };
    expect(factorial.responseSurface).toHaveLength(4);
    expect(factorial.responseSurface[0].factors).toEqual({ level: 1, policy: false });
    expect(factorial.responseSurface[0].meanConfidenceInterval.lower)
      .toBeLessThan(factorial.responseSurface[0].meanConfidenceInterval.upper);
    expect(artifact.timeSeries).toHaveLength(4);
    const experiment = artifact.experiments[0] as Record<string, unknown>;
    expect(experiment.conditionCount).toBe(4);
    expect(experiment.runCount).toBe(16);
    expect((experiment.pilotPower as { recommendedPairs: number }).recommendedPairs)
      .toBeGreaterThanOrEqual(2);
    expect(artifact.nonFiniteReplacements).toEqual([]);
    const firstSeries = artifact.timeSeries[0] as { points: unknown[] };
    expect(firstSeries.points).toHaveLength(3);
    expect(buildCampaignAnalysis('fixture-campaign', [input])).toEqual(artifact);
  });

  it('converts a relative smallest effect to the primary outcome scale', () => {
    const artifact = buildCampaignAnalysis('relative-campaign', [
      fixtureInput({
        analysisModel: 'paired_contrast',
        unit: 'relative change',
        primary: 'median_time_to_decision',
      }),
    ]);
    const experiment = artifact.experiments[0] as {
      smallestEffectOfInterest: { outcomeScaleValue: number };
    };
    expect(experiment.smallestEffectOfInterest.outcomeScaleValue).toBeGreaterThan(1);
    expect(artifact.factorialModels).toEqual([]);
  });

  it('fails closed when the run set is incomplete', () => {
    const input = fixtureInput();
    input.results.pop();
    expect(() => buildCampaignAnalysis('incomplete', [input])).toThrow(/expected 4/);
  });

  it('records mathematically non-finite inferential values as explicit JSON-safe nulls', () => {
    const input = fixtureInput({ analysisModel: 'paired_contrast' });
    for (const result of input.results) {
      result.metrics['Proposal Completion Rate'] =
        (result.config as unknown as { policy: boolean }).policy ? 2 : 1;
    }
    const artifact = buildCampaignAnalysis('degenerate', [input]);
    expect(artifact.nonFiniteReplacements.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toMatch(/"tStatistic":(?:Infinity|-Infinity|NaN)/);
    expect(serialized).toContain('"tStatistic":null');
  });
});
