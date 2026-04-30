/**
 * Tests for lightweight learning utilities used by adaptive agents.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeuralNetwork, type NetworkState } from '../lib/agents/learning/neural-network';
import { DQNMixin } from '../lib/agents/learning/dqn-mixin';
import { PolicyGradientMixin } from '../lib/agents/learning/policy-gradient';
import { clearGlobalRandom, setSeed } from '../lib/utils/random';

describe('NeuralNetwork', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates architecture and input/target dimensions', () => {
    expect(() => new NeuralNetwork(0, [{ size: 1, activation: 'linear' }])).toThrow('inputSize');
    expect(() => new NeuralNetwork(2, [])).toThrow('at least one layer');
    expect(() => new NeuralNetwork(2, [{ size: 0, activation: 'linear' }])).toThrow('layers[0].size');

    const network = new NeuralNetwork(2, [{ size: 1, activation: 'linear' }]);

    expect(() => network.forward([1])).toThrow('Expected input size 2');
    expect(() => network.backward([1], 0.1)).toThrow('forward() must be called');
    network.forward([1, 2]);
    expect(() => network.backward([1, 2], 0.1)).toThrow('Expected 1 targets');
    expect(() => network.backward([1], Number.NaN)).toThrow('learningRate');
  });

  it('runs deterministic forward passes for supported activations', () => {
    const network = new NeuralNetwork(2, [
      { size: 4, activation: 'linear' },
      { size: 4, activation: 'linear' },
    ]);
    const state: NetworkState = {
      inputSize: 2,
      layerDefs: [
        { size: 4, activation: 'linear' },
        { size: 4, activation: 'linear' },
      ],
      weights: [
        [
          [1, -1],
          [-1, 1],
          [2, 0],
          [0, -2],
        ],
        [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ],
      ],
      biases: [
        [0, 0, -1, 1],
        [0, 0, 0, 0],
      ],
    };
    network.importState(state);

    expect(network.forward([3, 1])).toEqual([2, -2, 5, -1]);

    const relu = NeuralNetwork.fromState({
      ...state,
      layerDefs: [{ size: 4, activation: 'relu' }, { size: 4, activation: 'linear' }],
    });
    const tanh = NeuralNetwork.fromState({
      ...state,
      layerDefs: [{ size: 4, activation: 'tanh' }, { size: 4, activation: 'linear' }],
    });
    const sigmoid = NeuralNetwork.fromState({
      ...state,
      layerDefs: [{ size: 4, activation: 'sigmoid' }, { size: 4, activation: 'linear' }],
    });

    expect(relu.forward([3, 1])).toEqual([2, 0, 5, 0]);
    expect(tanh.forward([3, 1])[0]).toBeCloseTo(Math.tanh(2));
    expect(sigmoid.forward([3, 1])[0]).toBeCloseTo(1 / (1 + Math.exp(-2)));
  });

  it('trains linear outputs, clones state, and validates compatible copies', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const network = new NeuralNetwork(1, [{ size: 1, activation: 'linear' }]);

    const before = network.forward([1])[0];
    const loss = network.backward([2], 0.25);
    const after = network.forward([1])[0];

    expect(before).toBe(0);
    expect(loss).toBe(4);
    expect(after).toBeGreaterThan(before);
    expect(network.getInputSize()).toBe(1);
    expect(network.getOutputSize()).toBe(1);
    expect(network.getParameterCount()).toBe(2);

    const exported = network.exportState();
    exported.weights[0][0][0] = 999;
    expect(network.forward([1])[0]).not.toBe(999);

    const restored = NeuralNetwork.fromState(network.exportState());
    expect(restored.forward([1])[0]).toBeCloseTo(network.forward([1])[0]);

    const target = new NeuralNetwork(1, [{ size: 1, activation: 'linear' }]);
    target.copyFrom(network);
    expect(target.forward([1])[0]).toBeCloseTo(network.forward([1])[0]);
    target.softUpdate(restored, 0.5);
    expect(() => target.softUpdate(restored, 1.5)).toThrow('tau');
    expect(() => target.copyFrom(new NeuralNetwork(2, [{ size: 1, activation: 'linear' }]))).toThrow('compatible');
  });

  it('rejects malformed imported network states', () => {
    const network = new NeuralNetwork(2, [{ size: 1, activation: 'linear' }]);
    const state = network.exportState();

    expect(() => network.importState({ ...state, inputSize: 3 })).toThrow('architecture');
    expect(() => network.importState({ ...state, weights: [] })).toThrow('layer count');
    expect(() => network.importState({
      ...state,
      weights: [[[Number.NaN, 1]]],
    })).toThrow('weights');
  });
});

describe('DQNMixin', () => {
  afterEach(() => {
    clearGlobalRandom();
  });

  it('selects, trains on replay, serializes, and resets deterministic DQN state', () => {
    setSeed(123);
    const dqn = new DQNMixin(2, ['hold', 'buy'], {
      explorationRate: 0,
      explorationDecay: 0.5,
      minExploration: 0.05,
      hiddenLayers: [{ size: 2, activation: 'linear' }],
      replayBufferSize: 3,
      batchSize: 1,
      trainInterval: 1,
      targetUpdateInterval: 1,
      targetUpdateRate: 1,
      rewardClip: [-1, 1],
    });

    expect(dqn.getActions()).toEqual(['hold', 'buy']);
    expect(dqn.getParameterCount()).toBe(12);
    expect(dqn.selectAction([0.2, 0.4])).toBeGreaterThanOrEqual(0);
    expect(dqn.selectActionName([0.2, 0.4])).toMatch(/hold|buy/);

    dqn.update([0, 0], 1, 5, [1, 0], false);
    dqn.update([1, 0], 0, -5, [0, 1], true);
    dqn.update([0, 1], 1, 0.5, [1, 1], false);
    dqn.update([1, 1], 0, 0.25, [0, 0], false);

    expect(dqn.getReplayBufferSize()).toBe(3);
    expect(dqn.getStepCount()).toBe(4);
    expect(dqn.getTotalReward()).toBe(0.75);
    dqn.endEpisode();
    expect(dqn.getEpisodeCount()).toBe(1);
    expect(dqn.getExplorationRate()).toBe(0.05);

    const exported = dqn.exportState();
    const restored = new DQNMixin(2, ['hold', 'buy'], {
      explorationRate: 0,
      hiddenLayers: [{ size: 2, activation: 'linear' }],
    });
    restored.importState(exported);

    expect(restored.getQValues([0.25, 0.75])).toEqual(dqn.getQValues([0.25, 0.75]));
    expect(restored.getStepCount()).toBe(4);

    restored.reset();
    expect(restored.getReplayBufferSize()).toBe(0);
    expect(restored.getStepCount()).toBe(0);
  });
});

describe('PolicyGradientMixin', () => {
  afterEach(() => {
    clearGlobalRandom();
  });

  it('selects actions, learns from retained available actions, and decays temperature', () => {
    setSeed(7);
    const pg = new PolicyGradientMixin({
      learningRate: 0.2,
      discountFactor: 1,
      temperature: 1,
      minTemperature: 0.5,
      temperatureDecay: 0.5,
      useBaseline: false,
      entropyWeight: 0,
    });

    expect(() => pg.selectAction('proposal', [])).toThrow('No available actions');
    expect(pg.selectAction('proposal', ['vote'])).toBe('vote');
    expect(pg.getActionProbability('proposal', 'vote', ['vote', 'abstain'])).toBe(0.5);

    pg.recordStep('proposal', 'vote', 10, ['vote', 'abstain']);
    pg.endEpisode();

    expect(pg.getEpisodeCount()).toBe(1);
    expect(pg.getTemperature()).toBe(0.5);
    expect(pg.getStateCount()).toBe(1);
    expect(pg.getTotalReward()).toBe(10);
    expect(pg.getActionProbability('proposal', 'vote', ['vote', 'abstain'])).toBeGreaterThan(0.5);
    expect(pg.getActionProbability('proposal', 'abstain', ['vote', 'abstain'])).toBeLessThan(0.5);
  });

  it('updates baseline, forces long-trajectory updates, merges, imports, and resets', () => {
    const pg = new PolicyGradientMixin({
      learningRate: 0.1,
      discountFactor: 0.5,
      temperature: 1,
      maxTrajectoryLength: 2,
      useBaseline: true,
      entropyWeight: 0,
    });
    const other = new PolicyGradientMixin({ learningRate: 0.1, useBaseline: false, entropyWeight: 0 });

    pg.recordStep('state', 'a', 2, ['a', 'b']);
    pg.recordStep('state', 'a', 2, ['a', 'b']);
    expect(pg.getStateCount()).toBe(1);
    pg.endEpisode();
    expect(pg.getBaseline()).toBeGreaterThan(0);

    other.recordStep('state', 'b', 5, ['a', 'b']);
    other.endEpisode();
    const beforeMerge = pg.getActionProbability('state', 'b', ['a', 'b']);
    pg.mergeFrom(other, 1);
    expect(pg.getActionProbability('state', 'b', ['a', 'b'])).toBeGreaterThan(beforeMerge);

    const exported = pg.exportState();
    const restored = new PolicyGradientMixin();
    restored.importState(exported);
    expect(restored.exportState()).toEqual(exported);

    restored.reset();
    expect(restored.getStateCount()).toBe(0);
    expect(restored.getBaseline()).toBe(0);
    expect(restored.getEpisodeCount()).toBe(0);
  });
});
