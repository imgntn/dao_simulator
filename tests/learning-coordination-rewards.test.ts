/**
 * Tests for shared-learning coordination and event-driven reward aggregation.
 */

import { describe, expect, it } from 'vitest';
import { LearningMixin } from '../lib/agents/learning/learning-mixin';
import { RewardAggregator, createRewardAggregator } from '../lib/agents/learning/reward-aggregator';
import { SharedLearningCoordinator } from '../lib/agents/learning/shared-learning';
import { EventBus } from '../lib/utils/event-bus';

describe('SharedLearningCoordinator', () => {
  it('merges same-type Q-tables after the configured interval', () => {
    const first = createLearnerWithQ('market', 'buy', 10);
    const second = createLearnerWithQ('market', 'buy', 0);
    first.endEpisode();
    second.endEpisode();

    const coordinator = new SharedLearningCoordinator({
      mergeInterval: 1,
      mergeWeight: 0.5,
      minEpisodesForMerge: 1,
    });
    coordinator.register('agent_1', 'Trader', first);
    coordinator.register('agent_2', 'Trader', second);

    coordinator.step(1);

    expect(first.getQValue('market', 'buy')).toBeCloseTo(7.5);
    expect(second.getQValue('market', 'buy')).toBeCloseTo(1.875);
    expect(coordinator.getAgentCount()).toBe(2);
    expect(coordinator.getGroupCounts()).toMatchObject({ financial: 2 });
  });

  it('skips early learners, replaces duplicate registrations, and resets state', () => {
    const early = createLearnerWithQ('market', 'buy', 10);
    const mature = createLearnerWithQ('market', 'buy', 0);
    mature.endEpisode();

    const coordinator = new SharedLearningCoordinator({
      mergeInterval: 0,
      mergeWeight: 2,
      minEpisodesForMerge: 1,
    });
    coordinator.register('agent_1', 'Trader', early);
    coordinator.register('agent_1', 'Trader', mature);

    expect(coordinator.getAgentCount()).toBe(1);
    coordinator.step(0);
    expect(mature.getQValue('market', 'buy')).toBe(0);

    coordinator.unregister('agent_1');
    expect(coordinator.getAgentCount()).toBe(0);
    coordinator.register('agent_2', 'UnknownType', mature);
    expect(coordinator.getGroupCounts()).toMatchObject({ community: 1 });
    coordinator.reset();
    expect(coordinator.getAgentCount()).toBe(0);
    expect(coordinator.getSignal('community')).toBeUndefined();
  });

  it('generates and applies cross-category signals with clamped bias weights', () => {
    const financial = createLearnerWithQ('market', 'sell', -10);
    const governance = createLearnerWithQ('proposal', 'approve', 1);

    const coordinator = new SharedLearningCoordinator({
      mergeInterval: 1,
      crossCategoryEnabled: true,
      crossCategoryWeight: 2,
      minEpisodesForMerge: 0,
    });
    coordinator.register('financial_1', 'Trader', financial);
    coordinator.register('governance_1', 'ProposalCreator', governance);

    coordinator.step(1);

    expect(coordinator.getSignal('financial')).toMatchObject({
      sourceGroup: 'financial',
      avgQValue: -10,
      totalStates: 1,
      step: 1,
    });
    expect(governance.getQValue('proposal', 'approve')).toBe(-9);
  });
});

describe('RewardAggregator', () => {
  it('collects targeted and global rewards from the event bus', () => {
    const eventBus = new EventBus(false);
    const aggregator = new RewardAggregator('financial');
    aggregator.subscribeToEvents(eventBus, 'agent_1');

    eventBus.publish('trade_executed', { step: 1, agentId: 'agent_1', value: 4 });
    eventBus.publish('trade_executed', { step: 1, agentId: 'agent_2', value: 100 });
    eventBus.publish('token_price_change', { step: 1, value: 3 });

    expect(aggregator.getPendingCount('agent_1')).toBe(2);
    expect(aggregator.collectReward('agent_1')).toBeCloseTo(4.2);
    expect(aggregator.collectReward('agent_2')).toBe(0);

    aggregator.unsubscribeFromEvents(eventBus, 'agent_1');
    eventBus.publish('trade_executed', { step: 2, agentId: 'agent_1', value: 4 });
    expect(aggregator.getPendingCount('agent_1')).toBe(0);
  });

  it('clamps, discounts, summarizes, clears, and normalizes invalid values', () => {
    const aggregator = new RewardAggregator('governance', [
      { event: 'custom_signal', weight: 2, transform: (value) => value + 1 },
    ], [5, -5]);
    const eventBus = new EventBus(false);
    aggregator.subscribeToEvents(eventBus, 'member_1');

    eventBus.publish('custom_signal', { step: 1, memberId: 'member_1', amount: 2 });
    aggregator.addManualReward('member_1', 100, 1);
    aggregator.addManualReward('member_1', Number.NaN, 1);
    aggregator.setDecayRate(0.5);

    expect(aggregator.getPendingRewards('member_1')).toHaveLength(3);
    expect(aggregator.getRewardStats('member_1')).toMatchObject({
      count: 3,
      max: 5,
      byEvent: {
        custom_signal: 5,
        manual: 5,
      },
    });
    expect(aggregator.collectReward('member_1', 3)).toBe(2.5);
    expect(aggregator.collectAndClear('member_1')).toBe(5);
    expect(aggregator.getPendingCount('member_1')).toBe(0);

    aggregator.setRewardClamp(Number.NaN, 1);
    aggregator.addManualReward('member_1', 20);
    expect(aggregator.collectReward('member_1')).toBe(10);
    aggregator.resetAll();
    expect(aggregator.getRewardStats('member_1')).toEqual({
      count: 0,
      total: 0,
      min: 0,
      max: 0,
      byEvent: {},
    });
  });

  it('maps agent types to reward categories and defaults unknown agents to governance', () => {
    const trader = createRewardAggregator('rl_trader');
    const whistleblower = createRewardAggregator('Whistleblower');
    const unknown = createRewardAggregator('SomeNewAgent');

    expect(trader.getRewardSignals().some((signal) => signal.event === 'trade_executed')).toBe(true);
    expect(whistleblower.getRewardSignals().some((signal) => signal.event === 'attack_detected')).toBe(true);
    expect(unknown.getRewardSignals().some((signal) => signal.event === 'proposal_passed')).toBe(true);
  });
});

function createLearnerWithQ(state: string, action: string, reward: number): LearningMixin {
  const learner = new LearningMixin({
    learningRate: 1,
    discountFactor: 0,
    explorationRate: 0,
    adaptiveLearningRate: false,
    qBounds: [-100, 100],
  });

  learner.update(state, action, reward, 'next', []);
  return learner;
}
