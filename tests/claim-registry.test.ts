import { describe, expect, it } from 'vitest';
import {
  auditClaimRegistry,
  buildClaimRegistry,
} from '../lib/research/claim-registry';

function analysisFixture(): Record<string, unknown> {
  return {
    schemaVersion: '1.0.0',
    campaignId: 'campaign-one',
    generatedAt: '2026-07-17T00:00:00.000Z',
    experiments: [{
      experimentId: 'experiment-one',
      classification: 'confirmatory',
    }],
    pairedEffects: [{
      experimentId: 'experiment-one',
      researchQuestionIds: ['RQ1'],
      outcome: 'proposal_completion_rate',
      outcomeMetricName: 'Proposal Completion Rate',
      conditionA: 'a',
      conditionB: 'b',
      conditionLabels: { a: 'control', b: 'treatment' },
      experimentalUnit: 'paired_seed',
      nPairs: 2,
      meanDifference: 0.2,
      confidenceInterval: { lower: 0.1, upper: 0.3, level: 0.95 },
      pValue: 0.01,
      adjustedPValue: 0.02,
      correctionMethod: 'holm',
      cohensDz: 1.2,
      practicalEquivalenceInterval: { lower: -0.05, upper: 0.05 },
      practicallyEquivalent: false,
      practicallyImportant: true,
      rejectedAfterCorrection: true,
      differences: [
        { seed: 1, value: 0.1, runIdA: 'a-1', runIdB: 'b-1' },
        { seed: 2, value: 0.3, runIdA: 'a-2', runIdB: 'b-2' },
      ],
    }],
  };
}

describe('claim registry', () => {
  it('generates stable, source-linked model-conditional claims', () => {
    const registry = buildClaimRegistry('campaign-one', analysisFixture(), {
      path: 'analysis/analysis.json',
      sha256: 'abc123',
    });
    expect(registry.claims).toHaveLength(1);
    expect(registry.claims[0].id).toBe('C-RQ1-001');
    expect(registry.claims[0].status).toBe('supported-practically-important');
    expect(registry.claims[0].source.runIds).toEqual(['a-1', 'a-2', 'b-1', 'b-2']);
    expect(registry.claims[0].outcome.metricDefinitionVersion).toBe('2.0.0');
    expect(auditClaimRegistry(registry, {
      campaignId: 'campaign-one',
      analysisPath: 'analysis/analysis.json',
      analysisSha256: 'abc123',
      runIds: new Set(['a-1', 'a-2', 'b-1', 'b-2']),
    })).toEqual([]);
  });

  it('detects stale hashes and unknown source runs', () => {
    const registry = buildClaimRegistry('campaign-one', analysisFixture(), {
      path: 'analysis/analysis.json',
      sha256: 'abc123',
    });
    expect(auditClaimRegistry(registry, {
      campaignId: 'campaign-one',
      analysisPath: 'analysis/analysis.json',
      analysisSha256: 'different',
      runIds: new Set(),
    })).toEqual(expect.arrayContaining([
      expect.stringMatching(/hash mismatch/),
      expect.stringMatching(/unknown source run/),
    ]));
  });
});
