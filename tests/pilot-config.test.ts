import { describe, expect, it } from 'vitest';
import type { ExperimentConfig } from '../lib/research/experiment-config';
import { buildPilotConfig, PILOT_SEEDS } from '../lib/research/pilot-config';

describe('pilot configuration generation', () => {
  it('creates an eight-replicate matched-seed pilot without mutating the source', () => {
    const source: ExperimentConfig = {
      id: 'rq-test',
      name: 'Test',
      description: 'Test design',
      research: {
        classification: 'confirmatory',
        publicationRole: 'core-confirmatory',
        researchQuestionIds: ['RQX'],
        hypothesis: 'Treatment changes the outcome.',
        primaryOutcome: 'proposal_completion_rate',
        secondaryOutcomes: [],
        analysisModel: 'paired_contrast',
        comparisonCorrection: 'holm',
        smallestEffectOfInterest: { value: 0.05, unit: 'proportion', rationale: 'Material.' },
        analysisFamily: 'rq-test',
        experimentalUnit: 'One seeded run.',
        estimatedRuntimeMinutes: 100,
      },
      baseConfig: { template: 'compound' },
      sweep: { parameter: 'voting_activity', values: [0.1, 0.2] },
      execution: {
        runsPerConfig: 100,
        stepsPerRun: 100,
        seedStrategy: 'sequential',
        baseSeed: 1,
        workers: 8,
      },
      metrics: [
        { name: 'Completion', type: 'builtin', builtin: 'proposal_completion_rate' },
      ],
      output: {
        directory: 'results/paper/test',
        formats: ['json'],
        includeRawRuns: true,
        includeManifest: true,
      },
    };
    const pilot = buildPilotConfig(source);
    expect(pilot.id).toBe('rq-test-pilot');
    expect(pilot.execution.fixedSeeds).toEqual(PILOT_SEEDS);
    expect(pilot.execution.runsPerConfig).toBe(8);
    expect(pilot.output.directory).toBe('results/pilot/test');
    expect(source.execution.runsPerConfig).toBe(100);
  });
});
