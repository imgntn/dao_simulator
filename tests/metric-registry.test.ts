import { describe, expect, it } from 'vitest';
import {
  BUILTIN_METRIC_IDS,
  METRIC_REGISTRY,
  METRIC_REGISTRY_SCHEMA_VERSION,
  getMetricDefinition,
} from '../lib/research/metric-registry';

describe('authoritative metric registry', () => {
  it('contains one complete, versioned definition for every builtin metric', () => {
    expect(METRIC_REGISTRY_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(BUILTIN_METRIC_IDS).toHaveLength(99);
    expect(new Set(BUILTIN_METRIC_IDS).size).toBe(BUILTIN_METRIC_IDS.length);

    for (const id of BUILTIN_METRIC_IDS) {
      const definition = getMetricDefinition(id);
      expect(definition).toBe(METRIC_REGISTRY[id]);
      expect(definition.id).toBe(id);
      expect(definition.definitionVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(definition.formula.length).toBeGreaterThan(12);
      expect(definition.numerator.length).toBeGreaterThan(2);
      expect(definition.denominator.length).toBeGreaterThan(2);
      expect(definition.construct.length).toBeGreaterThan(2);
      expect(definition.timeBasis.length).toBeGreaterThan(8);
      expect(definition.requiredState.length).toBeGreaterThan(0);
      expect(definition.interpretationLimits).toContain('not a causal estimate');
      expect(definition.acrossRunAggregation).toBe(
        'distribution of replicate-level values'
      );
      expect([
        'zero-is-observed-absence',
        'zero-is-undefined-denominator-sentinel',
      ]).toContain(definition.emptySetPolicy);
      expect(definition.missingDataBehavior.length).toBeGreaterThan(40);
    }
  });

  it('publishes explicit units and corrected semantic versions for high-risk metrics', () => {
    expect(METRIC_REGISTRY.avg_time_to_decision.unit).toBe('hours');
    expect(METRIC_REGISTRY.proposal_rate.unit).toContain('per 100');
    expect(METRIC_REGISTRY.governance_activity_index.unit).toContain('per 100');
    expect(METRIC_REGISTRY.token_conservation_error.unit).toBe('tokens');

    for (const id of [
      'average_turnout',
      'quorum_reach_rate',
      'delegate_concentration',
      'wealth_mobility',
      'avg_time_to_decision',
      'voter_concentration_gini',
      'governance_activity_index',
    ] as const) {
      expect(METRIC_REGISTRY[id].definitionVersion).toBe('2.0.0');
    }
  });

  it('publishes finite, ordered bounds wherever a metric is bounded', () => {
    for (const definition of Object.values(METRIC_REGISTRY)) {
      const [lower, upper] = definition.validRange;
      if (lower !== null) expect(Number.isFinite(lower)).toBe(true);
      if (upper !== null) expect(Number.isFinite(upper)).toBe(true);
      if (lower !== null && upper !== null) expect(lower).toBeLessThanOrEqual(upper);
    }
  });
});
