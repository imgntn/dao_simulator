/**
 * Tests for hierarchical learning and opponent modeling utilities.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { HierarchicalRLMixin, type Option } from '../lib/agents/learning/hierarchical-rl';
import { OpponentModel } from '../lib/agents/learning/opponent-model';
import { clearGlobalRandom, setSeed } from '../lib/utils/random';

describe('HierarchicalRLMixin', () => {
  const options: Option[] = [
    { name: 'scout', actions: ['observe', 'probe'], minDuration: 0, maxDuration: 1 },
    { name: 'attack', actions: ['target', 'withdraw'], minDuration: 1, maxDuration: 3 },
  ];

  afterEach(() => {
    clearGlobalRandom();
  });

  it('validates option definitions', () => {
    expect(() => new HierarchicalRLMixin([])).toThrow('requires at least one option');
    expect(() => new HierarchicalRLMixin([
      { name: 'empty', actions: [], minDuration: 0, maxDuration: 1 },
    ])).toThrow('requires at least one option');
  });

  it('selects options, learns sub-policy rewards, and updates meta-policy on termination', () => {
    setSeed(42);
    const hierarchy = new HierarchicalRLMixin(options, {
      metaConfig: {
        explorationRate: 0,
        learningRate: 1,
        adaptiveLearningRate: false,
        discountFactor: 0,
      },
      subConfig: {
        explorationRate: 0,
        learningRate: 1,
        adaptiveLearningRate: false,
        discountFactor: 0,
      },
      metaDiscountFactor: 1,
    });

    expect(hierarchy.selectAction('calm', 'low-risk')).toBe('observe');
    expect(hierarchy.getCurrentOption()).toBe('scout');
    expect(hierarchy.getOptionStepCount()).toBe(0);

    hierarchy.update('calm', 'low-risk', 5, 'volatile', 'high-risk');

    expect(hierarchy.getOptionStepCount()).toBe(1);
    expect(hierarchy.getSubQTableSize('scout')).toBe(1);
    expect(hierarchy.getTotalReward()).toBe(5);

    hierarchy.selectAction('volatile', 'high-risk');

    expect(hierarchy.getMetaQTableSize()).toBe(1);
    expect(hierarchy.getTotalQTableSize()).toBeGreaterThanOrEqual(2);
  });

  it('exports, imports, resets, and tolerates malformed state', () => {
    const hierarchy = new HierarchicalRLMixin(options, {
      metaConfig: { explorationRate: 0 },
      subConfig: { explorationRate: 0 },
    });

    hierarchy.selectAction('calm', 'low-risk');
    hierarchy.update('calm', 'low-risk', 2, 'calm', 'low-risk');
    hierarchy.endEpisode();

    const restored = new HierarchicalRLMixin(options, {
      metaConfig: { explorationRate: 0 },
      subConfig: { explorationRate: 0 },
    });
    restored.importState(hierarchy.exportState());

    expect(restored.getEpisodeCount()).toBe(1);
    expect(restored.getSubQTableSize('scout')).toBe(1);

    restored.importState({
      metaState: null,
      subStates: { scout: { qTable: null } },
      currentOption: 123,
      optionStepCount: -5,
      episodeCount: Number.NaN,
    });
    expect(restored.getCurrentOption()).toBeNull();
    expect(restored.getOptionStepCount()).toBe(0);

    restored.reset();
    expect(restored.getEpisodeCount()).toBe(0);
    expect(restored.getTotalReward()).toBe(0);
    expect(restored.getTotalQTableSize()).toBe(0);
    expect(restored.getOptions()).toEqual(options);
  });

  it('falls back safely when imported current option has no sub-policy', () => {
    const hierarchy = new HierarchicalRLMixin(options, {
      metaConfig: { explorationRate: 0 },
      subConfig: { explorationRate: 0 },
    });

    hierarchy.importState({
      currentOption: 'missing-option',
      optionStepCount: 0,
      episodeCount: 0,
      metaState: { qTable: {}, episodeCount: 0, explorationRate: 0, lastState: null, lastAction: null, totalReward: 0 },
      subStates: {},
    });

    expect(hierarchy.selectAction('state', 'detail')).toBe('observe');
  });
});

describe('OpponentModel', () => {
  it('predicts actions with smoothing and adjusts Q-values by counter probability', () => {
    const model = new OpponentModel({
      smoothingFactor: 1,
      opponentWeight: 0.5,
    });

    model.recordObservation({ opponentId: 'auditor', action: 'investigate', state: 'risky', step: 1 });
    model.recordObservation({ opponentId: 'auditor', action: 'investigate', state: 'risky', step: 2 });
    model.recordObservation({ opponentId: 'auditor', action: 'ignore', state: 'risky', step: 3 });

    expect(model.predictAction('auditor', 'risky')).toEqual({
      action: 'investigate',
      probability: 0.6,
    });

    const distribution = model.getActionDistribution('auditor', 'risky');
    expect(distribution.get('investigate')).toBeCloseTo(0.6);
    expect(distribution.get('ignore')).toBeCloseTo(0.4);

    const adjusted = model.adjustQValue(
      10,
      'attack',
      'risky',
      'auditor',
      new Set(['investigate']),
      -10,
      20
    );

    expect(adjusted).toBeCloseTo(6);
    expect(model.predictAction('unknown', 'risky')).toBeNull();
    expect(model.getActionDistribution('unknown', 'risky').size).toBe(0);
  });

  it('evicts stale opponents, decays old observations, and clamps config values', () => {
    const model = new OpponentModel({
      maxTrackedOpponents: 2,
      maxObservationsPerOpponent: 2,
      observationDecay: 0.5,
      opponentWeight: 2,
      smoothingFactor: -1,
    });

    model.recordObservation({ opponentId: 'old', action: 'scan', state: 's', step: 1 });
    model.recordObservation({ opponentId: 'mid', action: 'scan', state: 's', step: 2 });
    model.recordObservation({ opponentId: 'new', action: 'scan', state: 's', step: 3 });

    expect(model.getTrackedOpponents()).toEqual(['mid', 'new']);

    model.recordObservation({ opponentId: 'new', action: 'scan', state: 's', step: 4 });
    model.recordObservation({ opponentId: 'new', action: 'hide', state: 's', step: 5 });

    expect(model.getTotalObservations()).toBeLessThan(4);
    expect(model.adjustQValue(10, 'attack', 's', 'new', new Set(['scan']), -5, 15)).toBeLessThan(10);
  });

  it('round-trips and defensively imports serialized opponent models', () => {
    const model = new OpponentModel();
    model.recordObservation({ opponentId: 'auditor', action: 'investigate', state: 'risky', step: 1 });

    const restored = new OpponentModel();
    restored.importState(model.exportState());

    expect(restored.getTrackedOpponentCount()).toBe(1);
    expect(restored.predictAction('auditor', 'risky')?.action).toBe('investigate');

    restored.importState({
      models: [
        null,
        {
          opponentId: 'bad',
          actionCounts: { state: { invalid: Number.NaN, valid: 2 } },
          totalObservations: 'not-number',
          lastObservedStep: 10,
        },
      ],
    });

    expect(restored.getTrackedOpponents()).toEqual(['bad']);
    expect(restored.getActionDistribution('bad', 'state').has('invalid')).toBe(false);
    expect(restored.getActionDistribution('bad', 'state').has('valid')).toBe(true);

    restored.importState({ models: 'bad-shape' });
    expect(restored.getTrackedOpponentCount()).toBe(0);
    restored.reset();
    expect(restored.getTrackedOpponentCount()).toBe(0);
  });
});
