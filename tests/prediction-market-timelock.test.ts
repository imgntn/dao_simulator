import { beforeEach, describe, expect, it } from 'vitest';
import type { DAOMember } from '../lib/agents/base';
import { DAO } from '../lib/data-structures/dao';
import { PredictionMarket } from '../lib/data-structures/prediction-market';
import { TimelockController } from '../lib/data-structures/timelock';
import { Treasury } from '../lib/data-structures/treasury';
import type { MultiStageProposal } from '../lib/data-structures/multi-stage-proposal';
import { EventBus } from '../lib/utils/event-bus';

function createMember(uniqueId: string, tokens: number): DAOMember {
  return { uniqueId, tokens } as DAOMember;
}

function createProposal(id: string = 'proposal-1'): MultiStageProposal {
  return {
    uniqueId: id,
    title: 'Upgrade governance',
  } as MultiStageProposal;
}

describe('PredictionMarket data structure', () => {
  let dao: DAO;
  let treasury: Treasury;
  let market: PredictionMarket;
  let events: string[];

  beforeEach(() => {
    dao = new DAO('Prediction DAO');
    dao.currentStep = 5;
    treasury = new Treasury(dao.eventBus);
    market = new PredictionMarket(dao, treasury, dao.eventBus);
    events = [];
    dao.eventBus.subscribe('*', (event) => events.push(event.event));
  });

  it('rejects invalid or foreign bets without mutating balances', () => {
    const member = createMember('alice', 100);
    const prediction = market.createPrediction('Will it pass?', 10, { status: 'approved' });
    const foreignPrediction = {
      question: 'Foreign market',
      resolveStep: 10,
      target: null,
      bets: [],
      resolved: false,
      outcome: null,
    };

    expect(market.placeBet(member, prediction, 'pass', Number.NaN)).toBe(false);
    expect(market.placeBet(member, prediction, 'pass', Number.POSITIVE_INFINITY)).toBe(false);
    expect(market.placeBet(member, prediction, 'pass', 0)).toBe(false);
    expect(market.placeBet(member, prediction, 'maybe', 10)).toBe(false);
    expect(market.placeBet(member, prediction, 'pass', 101)).toBe(false);
    expect(market.placeBet(member, foreignPrediction, 'pass', 10)).toBe(false);

    expect(member.tokens).toBe(100);
    expect(treasury.tokens.get('DAO_TOKEN')).toBe(0);
    expect(prediction.bets).toHaveLength(0);
  });

  it('resolves deterministic target outcomes, pays winners, and retains analytics history', () => {
    const alice = createMember('alice', 100);
    const bob = createMember('bob', 100);
    const prediction = market.createPrediction('Will it pass?', 10, { status: 'approved' });

    expect(market.placeBet(alice, prediction, 'pass', 20)).toBe(true);
    expect(market.placeBet(bob, prediction, 'fail', 30)).toBe(true);
    expect(alice.tokens).toBe(80);
    expect(bob.tokens).toBe(70);
    expect(treasury.tokens.get('DAO_TOKEN')).toBe(50);

    market.resolvePredictions(10);

    expect(prediction.resolved).toBe(true);
    expect(prediction.outcome).toBe('pass');
    expect(alice.tokens).toBe(130);
    expect(bob.tokens).toBe(70);
    expect(treasury.tokens.get('DAO_TOKEN')).toBe(0);
    expect(market.predictions).toEqual([]);
    expect(market.getActivePredictions()).toEqual([]);
    expect(market.getResolvedPredictions()).toEqual([prediction]);
    expect(market.getStatistics()).toEqual({
      total: 1,
      active: 0,
      resolved: 1,
      totalBets: 2,
      totalVolume: 50,
    });
    expect(events).toEqual(expect.arrayContaining([
      'prediction_created',
      'bet_placed',
      'prediction_resolved',
    ]));
  });

  it('leaves the pool in treasury when no bet matches the outcome', () => {
    const alice = createMember('alice', 100);
    const prediction = market.createPrediction('Will it fail?', 10, { status: 'approved' });

    expect(market.placeBet(alice, prediction, 'fail', 25)).toBe(true);

    market.resolvePredictions(10);

    expect(prediction.outcome).toBe('pass');
    expect(alice.tokens).toBe(75);
    expect(treasury.tokens.get('DAO_TOKEN')).toBe(25);
    expect(market.getStatistics().resolved).toBe(1);
  });
});

describe('TimelockController dynamic extension invariants', () => {
  it('rejects invalid extensions and clamps positive extensions to the configured maximum', () => {
    const dao = new DAO('Timelock DAO');
    dao.currentStep = 10;
    const events: unknown[] = [];
    dao.eventBus.subscribe('timelock_extended', (event) => events.push(event));
    const controller = new TimelockController(dao, {
      minDelaySteps: 5,
      maxDelaySteps: 8,
      enableDynamicExtension: true,
    });
    const entry = controller.schedule(createProposal(), 5);

    expect(controller.extendTimelock(entry.proposalId, -2)).toBe(false);
    expect(controller.extendTimelock(entry.proposalId, Number.NaN)).toBe(false);
    expect(entry.executionStep).toBe(15);
    expect(entry.dynamicExtension).toBe(0);

    expect(controller.extendTimelock(entry.proposalId, 100)).toBe(true);
    expect(entry.executionStep).toBe(18);
    expect(entry.dynamicExtension).toBe(3);
    expect(controller.extendTimelock(entry.proposalId, 1)).toBe(false);
    expect(events).toHaveLength(1);
  });
});
