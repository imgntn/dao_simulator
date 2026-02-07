// Tests for Q-learning infrastructure
import { describe, it, expect, beforeEach } from 'vitest';
import { LearningMixin, DEFAULT_LEARNING_CONFIG, LearningState } from '@/lib/agents/learning';
import { setSeed } from '@/lib/utils/random';

describe('LearningMixin', () => {
  let learning: LearningMixin;

  beforeEach(() => {
    setSeed(42);
    learning = new LearningMixin();
  });

  describe('Q-value basics', () => {
    it('should return 0 for unknown state-action pairs', () => {
      expect(learning.getQValue('unknown_state', 'unknown_action')).toBe(0);
    });

    it('should update and retrieve Q-values', () => {
      const actions = ['a', 'b', 'c'];
      learning.update('state1', 'a', 1.0, 'state2', actions);

      const q = learning.getQValue('state1', 'a');
      expect(q).toBeGreaterThan(0);
    });

    it('should clamp Q-values within bounds', () => {
      const actions = ['a'];

      // Repeatedly update with large positive reward
      for (let i = 0; i < 1000; i++) {
        learning.update('s', 'a', 100, 's', actions);
      }

      const q = learning.getQValue('s', 'a');
      expect(q).toBeLessThanOrEqual(50); // Default upper bound
      expect(q).toBeGreaterThanOrEqual(-50); // Default lower bound
    });

    it('should respect custom Q-value bounds', () => {
      const bounded = new LearningMixin({ qBounds: [-10, 10] });
      const actions = ['a'];

      for (let i = 0; i < 100; i++) {
        bounded.update('s', 'a', 50, 's', actions);
      }

      expect(bounded.getQValue('s', 'a')).toBeLessThanOrEqual(10);
    });
  });

  describe('Action selection', () => {
    it('should select from available actions', () => {
      const actions = ['buy', 'sell', 'hold'];
      const action = learning.selectAction('state', actions);

      expect(actions).toContain(action);
    });

    it('should throw when no actions available', () => {
      expect(() => learning.selectAction('state', [])).toThrow('No available actions');
    });

    it('should exploit best action when exploration is 0', () => {
      const noExplore = new LearningMixin({ explorationRate: 0 });
      const actions = ['a', 'b', 'c'];

      // Train 'b' to be the best action
      for (let i = 0; i < 50; i++) {
        noExplore.update('s', 'b', 10, 's', actions);
        noExplore.update('s', 'a', -1, 's', actions);
        noExplore.update('s', 'c', -1, 's', actions);
      }

      // Should always select 'b'
      for (let i = 0; i < 10; i++) {
        expect(noExplore.selectAction('s', actions)).toBe('b');
      }
    });

    it('should explore randomly with high exploration rate', () => {
      setSeed(12345);
      const highExplore = new LearningMixin({ explorationRate: 1.0 });
      const actions = ['a', 'b', 'c', 'd'];
      const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };

      // With 100% exploration, should select all actions
      for (let i = 0; i < 100; i++) {
        const action = highExplore.selectAction('s', actions);
        counts[action]++;
      }

      // Each action should be selected at least once
      expect(counts.a).toBeGreaterThan(0);
      expect(counts.b).toBeGreaterThan(0);
      expect(counts.c).toBeGreaterThan(0);
      expect(counts.d).toBeGreaterThan(0);
    });
  });

  describe('Q-learning update rule', () => {
    it('should increase Q-value for positive reward', () => {
      const actions = ['a'];
      const before = learning.getQValue('s1', 'a');

      learning.update('s1', 'a', 5.0, 's2', actions);

      const after = learning.getQValue('s1', 'a');
      expect(after).toBeGreaterThan(before);
    });

    it('should decrease Q-value for negative reward', () => {
      const actions = ['a'];

      // First give some positive value
      learning.update('s1', 'a', 10, 's2', actions);
      const before = learning.getQValue('s1', 'a');

      // Then give negative reward
      learning.update('s1', 'a', -20, 's2', actions);

      const after = learning.getQValue('s1', 'a');
      expect(after).toBeLessThan(before);
    });

    it('should incorporate future rewards via discount factor', () => {
      const actions = ['a', 'b'];
      const highDiscount = new LearningMixin({ discountFactor: 0.99, learningRate: 0.5 });
      const lowDiscount = new LearningMixin({ discountFactor: 0.1, learningRate: 0.5 });

      // Set up high Q-value in next state
      highDiscount.update('s2', 'a', 100, 's3', actions);
      lowDiscount.update('s2', 'a', 100, 's3', actions);

      // Update from s1 to s2 with small immediate reward
      highDiscount.update('s1', 'a', 1, 's2', actions);
      lowDiscount.update('s1', 'a', 1, 's2', actions);

      // High discount should have higher Q in s1 due to future rewards
      expect(highDiscount.getQValue('s1', 'a')).toBeGreaterThan(lowDiscount.getQValue('s1', 'a'));
    });

    it('should converge on simple deterministic problem', () => {
      // Simple MDP: s1 --(a, r=0)--> s2 --(a, r=10)--> terminal
      const actions = ['a'];
      const fastLearner = new LearningMixin({
        learningRate: 0.5,
        discountFactor: 0.9,
        explorationRate: 0
      });

      // Train many episodes
      for (let ep = 0; ep < 100; ep++) {
        fastLearner.update('s2', 'a', 10, 'terminal', []);  // Terminal has no actions
        fastLearner.update('s1', 'a', 0, 's2', actions);
      }

      // Q(s2, a) should be ~10 (immediate reward at terminal)
      // Q(s1, a) should be ~0 + 0.9 * Q(s2, a) = ~9
      expect(fastLearner.getQValue('s2', 'a')).toBeCloseTo(10, 0);
      expect(fastLearner.getQValue('s1', 'a')).toBeGreaterThan(5);
    });
  });

  describe('Exploration decay', () => {
    it('should decay exploration rate on endEpisode', () => {
      const initial = learning.getExplorationRate();

      learning.endEpisode();

      expect(learning.getExplorationRate()).toBeLessThan(initial);
      expect(learning.getEpisodeCount()).toBe(1);
    });

    it('should not decay below minimum', () => {
      const minExplore = new LearningMixin({
        explorationRate: 0.5,
        explorationDecay: 0.5,
        minExploration: 0.1
      });

      // Decay many times
      for (let i = 0; i < 100; i++) {
        minExplore.endEpisode();
      }

      expect(minExplore.getExplorationRate()).toBeGreaterThanOrEqual(0.1);
    });

    it('should reset exploration rate', () => {
      for (let i = 0; i < 10; i++) {
        learning.endEpisode();
      }

      const decayed = learning.getExplorationRate();
      expect(decayed).toBeLessThan(DEFAULT_LEARNING_CONFIG.explorationRate);

      learning.resetExploration();
      expect(learning.getExplorationRate()).toBe(DEFAULT_LEARNING_CONFIG.explorationRate);
    });
  });

  describe('State tracking', () => {
    it('should track Q-table size', () => {
      expect(learning.getQTableSize()).toBe(0);
      expect(learning.getStateCount()).toBe(0);

      learning.update('s1', 'a', 1, 's2', ['a', 'b']);
      learning.update('s1', 'b', 1, 's2', ['a', 'b']);
      learning.update('s2', 'a', 1, 's3', ['a']);

      expect(learning.getQTableSize()).toBe(3); // 3 state-action pairs
      expect(learning.getStateCount()).toBe(2); // 2 unique states
    });

    it('should track total reward', () => {
      expect(learning.getTotalReward()).toBe(0);

      learning.update('s', 'a', 5, 's', ['a']);
      learning.update('s', 'a', 3, 's', ['a']);
      learning.update('s', 'a', -2, 's', ['a']);

      expect(learning.getTotalReward()).toBe(6);
    });
  });

  describe('Serialization', () => {
    it('should export and import learning state', () => {
      // Build up some state
      learning.update('s1', 'a', 5, 's2', ['a', 'b']);
      learning.update('s2', 'b', 10, 's3', ['a', 'b']);
      learning.endEpisode();
      learning.endEpisode();

      const exported = learning.exportLearningState();

      // Create fresh mixin and import
      const restored = new LearningMixin();
      restored.importLearningState(exported);

      expect(restored.getQValue('s1', 'a')).toBe(learning.getQValue('s1', 'a'));
      expect(restored.getQValue('s2', 'b')).toBe(learning.getQValue('s2', 'b'));
      expect(restored.getEpisodeCount()).toBe(2);
      expect(restored.getExplorationRate()).toBe(learning.getExplorationRate());
    });

    it('should deep copy Q-table on export', () => {
      learning.update('s', 'a', 5, 's', ['a']);
      const exported = learning.exportLearningState();

      // Modify original
      learning.update('s', 'a', 100, 's', ['a']);

      // Exported should be unchanged
      expect(exported.qTable['s']['a']).not.toBe(learning.getQValue('s', 'a'));
    });
  });

  describe('Merge and prune', () => {
    it('should merge Q-values from another mixin', () => {
      const other = new LearningMixin();

      learning.update('s1', 'a', 10, 's2', ['a']);
      other.update('s1', 'a', 20, 's2', ['a']);
      other.update('s2', 'b', 5, 's3', ['b']); // New state

      learning.mergeFrom(other, 0.5);

      // s1,a should be average of 10 and 20
      const merged = learning.getQValue('s1', 'a');
      expect(merged).toBeGreaterThan(learning.getQValue('s1', 'a') * 0.4);

      // Should have new state from other
      expect(learning.getQValue('s2', 'b')).toBeGreaterThan(0);
    });

    it('should prune low-value states', () => {
      // Add some significant states
      for (let i = 0; i < 10; i++) {
        learning.update('important', 'a', 10, 's', ['a']);
      }

      // Add some trivial states
      learning.update('trivial1', 'a', 0.001, 's', ['a']);
      learning.update('trivial2', 'a', 0.001, 's', ['a']);

      const before = learning.getStateCount();
      const removed = learning.prune(0.5);

      expect(removed).toBeGreaterThan(0);
      expect(learning.getStateCount()).toBeLessThan(before);
      expect(learning.getQValue('important', 'a')).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should use default config', () => {
      const config = learning.getConfig();

      expect(config.learningRate).toBe(DEFAULT_LEARNING_CONFIG.learningRate);
      expect(config.discountFactor).toBe(DEFAULT_LEARNING_CONFIG.discountFactor);
      expect(config.explorationRate).toBe(DEFAULT_LEARNING_CONFIG.explorationRate);
    });

    it('should allow custom config', () => {
      const custom = new LearningMixin({
        learningRate: 0.5,
        discountFactor: 0.8,
        explorationRate: 0.1,
      });

      const config = custom.getConfig();
      expect(config.learningRate).toBe(0.5);
      expect(config.discountFactor).toBe(0.8);
      expect(config.explorationRate).toBe(0.1);
    });

    it('should clamp invalid config values', () => {
      const invalid = new LearningMixin({
        learningRate: 5.0, // Should clamp to 1
        discountFactor: -0.5, // Should clamp to 0
        explorationRate: 2.0, // Should clamp to 1
      });

      const config = invalid.getConfig();
      expect(config.learningRate).toBe(1);
      expect(config.discountFactor).toBe(0);
      expect(config.explorationRate).toBe(1);
    });

    it('should update config dynamically', () => {
      learning.updateConfig({ learningRate: 0.9 });

      expect(learning.getConfig().learningRate).toBe(0.9);
    });
  });

  describe('Reset', () => {
    it('should clear all state on reset', () => {
      learning.update('s', 'a', 10, 's', ['a']);
      learning.endEpisode();
      learning.endEpisode();

      learning.reset();

      expect(learning.getQTableSize()).toBe(0);
      expect(learning.getStateCount()).toBe(0);
      expect(learning.getEpisodeCount()).toBe(0);
      expect(learning.getTotalReward()).toBe(0);
      expect(learning.getExplorationRate()).toBe(DEFAULT_LEARNING_CONFIG.explorationRate);
    });
  });
});

describe('Learning reproducibility', () => {
  it('should produce identical learning with same seed', () => {
    const actions = ['a', 'b', 'c'];

    setSeed(999);
    const learning1 = new LearningMixin({ explorationRate: 0.5 });
    const actions1: string[] = [];
    for (let i = 0; i < 50; i++) {
      const action = learning1.selectAction('state', actions);
      actions1.push(action);
      learning1.update('state', action, i % 3 === 0 ? 1 : -1, 'state', actions);
    }

    setSeed(999);
    const learning2 = new LearningMixin({ explorationRate: 0.5 });
    const actions2: string[] = [];
    for (let i = 0; i < 50; i++) {
      const action = learning2.selectAction('state', actions);
      actions2.push(action);
      learning2.update('state', action, i % 3 === 0 ? 1 : -1, 'state', actions);
    }

    expect(actions1).toEqual(actions2);
    expect(learning1.exportLearningState().qTable).toEqual(learning2.exportLearningState().qTable);
  });
});
