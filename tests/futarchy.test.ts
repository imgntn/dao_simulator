/**
 * Tests for Futarchy (Prediction Market Voting) mechanism
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PredictionMarket } from '@/lib/utils/prediction-market';
import { FutarchyRule } from '@/lib/utils/governance-plugins';
import { FutarchyVotingStrategy, getStrategy } from '@/lib/utils/voting-strategies';
import { Proposal } from '@/lib/data-structures/proposal';

// =============================================================================
// LMSR PredictionMarket Tests
// =============================================================================

describe('PredictionMarket (LMSR)', () => {
  let market: PredictionMarket;

  beforeEach(() => {
    market = new PredictionMarket({ liquidity: 100 });
  });

  describe('initial state', () => {
    it('starts with 50/50 prices', () => {
      expect(market.getYesPrice()).toBeCloseTo(0.5, 5);
      expect(market.getNoPrice()).toBeCloseTo(0.5, 5);
    });

    it('prices sum to 1', () => {
      expect(market.getYesPrice() + market.getNoPrice()).toBeCloseTo(1, 10);
    });

    it('is not resolved initially', () => {
      expect(market.resolved).toBe(false);
      expect(market.outcome).toBeUndefined();
    });
  });

  describe('trading', () => {
    it('buying YES increases YES price', () => {
      const priceBefore = market.getYesPrice();
      market.trade('agent1', 'yes', 50, 0);
      expect(market.getYesPrice()).toBeGreaterThan(priceBefore);
    });

    it('buying NO increases NO price', () => {
      const noPrice = market.getNoPrice();
      market.trade('agent1', 'no', 50, 0);
      expect(market.getNoPrice()).toBeGreaterThan(noPrice);
    });

    it('prices always sum to 1 after trades', () => {
      market.trade('a1', 'yes', 30, 0);
      market.trade('a2', 'no', 20, 1);
      market.trade('a3', 'yes', 100, 2);
      expect(market.getYesPrice() + market.getNoPrice()).toBeCloseTo(1, 10);
    });

    it('returns positive cost for valid trades', () => {
      const cost = market.trade('agent1', 'yes', 10, 0);
      expect(cost).toBeGreaterThan(0);
    });

    it('returns 0 for zero amount', () => {
      const cost = market.trade('agent1', 'yes', 0, 0);
      expect(cost).toBe(0);
    });

    it('records trades in history', () => {
      market.trade('a1', 'yes', 10, 0);
      market.trade('a2', 'no', 5, 1);
      expect(market.trades).toHaveLength(2);
      expect(market.trades[0].agentId).toBe('a1');
      expect(market.trades[0].side).toBe('yes');
      expect(market.trades[1].side).toBe('no');
    });

    it('does not allow trading after resolution', () => {
      market.resolve();
      const cost = market.trade('a1', 'yes', 100, 10);
      expect(cost).toBe(0);
    });

    it('large YES trades push price close to 1', () => {
      market.trade('a1', 'yes', 500, 0);
      expect(market.getYesPrice()).toBeGreaterThan(0.9);
    });

    it('large NO trades push price close to 0', () => {
      market.trade('a1', 'no', 500, 0);
      expect(market.getYesPrice()).toBeLessThan(0.1);
    });
  });

  describe('cost function', () => {
    it('costToBuyYes increases with amount', () => {
      const cost10 = market.costToBuyYes(10);
      const cost50 = market.costToBuyYes(50);
      expect(cost50).toBeGreaterThan(cost10);
    });

    it('cost increases with existing position (price impact)', () => {
      const costFirst = market.costToBuyYes(10);
      market.trade('a1', 'yes', 100, 0); // Move price up
      const costSecond = market.costToBuyYes(10);
      // Second purchase should cost more (price is higher)
      expect(costSecond).toBeGreaterThan(costFirst);
    });
  });

  describe('resolution', () => {
    it('resolves YES when YES price > threshold', () => {
      market.trade('a1', 'yes', 200, 0);
      const result = market.resolve(0.5);
      expect(result).toBe(true);
      expect(market.outcome).toBe(true);
      expect(market.resolved).toBe(true);
    });

    it('resolves NO when YES price < threshold', () => {
      market.trade('a1', 'no', 200, 0);
      const result = market.resolve(0.5);
      expect(result).toBe(false);
      expect(market.outcome).toBe(false);
    });

    it('resolves NO at 50/50 with threshold 0.5', () => {
      // Exactly 0.5 is NOT > 0.5, so resolve NO
      const result = market.resolve(0.5);
      expect(result).toBe(false);
    });

    it('shouldResolve checks step threshold', () => {
      const m = new PredictionMarket({ resolutionStep: 50 });
      expect(m.shouldResolve(49)).toBe(false);
      expect(m.shouldResolve(50)).toBe(true);
      expect(m.shouldResolve(100)).toBe(true);
    });

    it('shouldResolve returns false after resolution', () => {
      const m = new PredictionMarket({ resolutionStep: 10 });
      m.resolve();
      expect(m.shouldResolve(20)).toBe(false);
    });
  });

  describe('liquidity parameter', () => {
    it('higher liquidity means less price impact', () => {
      const lowLiq = new PredictionMarket({ liquidity: 10 });
      const highLiq = new PredictionMarket({ liquidity: 1000 });

      lowLiq.trade('a1', 'yes', 50, 0);
      highLiq.trade('a1', 'yes', 50, 0);

      // Low liquidity should have bigger price move
      const lowDelta = Math.abs(lowLiq.getYesPrice() - 0.5);
      const highDelta = Math.abs(highLiq.getYesPrice() - 0.5);
      expect(lowDelta).toBeGreaterThan(highDelta);
    });
  });
});

// =============================================================================
// FutarchyRule Tests
// =============================================================================

describe('FutarchyRule', () => {
  it('falls back to majority when no market attached', () => {
    const rule = new FutarchyRule();
    const mockDao = { members: [], daoId: 'test', predictionMarkets: new Map() } as any;
    const proposal = new Proposal(mockDao, 'c', 'T', 'd', 0, 10);
    proposal.votesFor = 10;
    proposal.votesAgainst = 5;
    expect(rule.approve(proposal, mockDao)).toBe(true);
  });

  it('approves when YES price > threshold', () => {
    const rule = new FutarchyRule();
    const market = new PredictionMarket({ liquidity: 100 });
    market.trade('a1', 'yes', 200, 0); // Push YES price high

    const mockDao = {
      members: [],
      daoId: 'test',
      predictionMarkets: new Map([['p1', market]]),
    } as any;
    const proposal = new Proposal(mockDao, 'c', 'T', 'd', 0, 10);
    proposal.uniqueId = 'p1';

    expect(rule.approve(proposal, mockDao)).toBe(true);
  });

  it('rejects when NO dominates', () => {
    const rule = new FutarchyRule();
    const market = new PredictionMarket({ liquidity: 100 });
    market.trade('a1', 'no', 200, 0);

    const mockDao = {
      members: [],
      daoId: 'test',
      predictionMarkets: new Map([['p1', market]]),
    } as any;
    const proposal = new Proposal(mockDao, 'c', 'T', 'd', 0, 10);
    proposal.uniqueId = 'p1';

    expect(rule.approve(proposal, mockDao)).toBe(false);
  });

  it('uses resolved outcome when market is resolved', () => {
    const rule = new FutarchyRule();
    const market = new PredictionMarket({ liquidity: 100 });
    market.trade('a1', 'yes', 200, 0);
    market.resolve(0.5); // Resolve YES

    const mockDao = {
      members: [],
      daoId: 'test',
      predictionMarkets: new Map([['p1', market]]),
    } as any;
    const proposal = new Proposal(mockDao, 'c', 'T', 'd', 0, 10);
    proposal.uniqueId = 'p1';

    expect(rule.approve(proposal, mockDao)).toBe(true);
  });

  it('respects custom threshold', () => {
    const rule = new FutarchyRule({ approvalThreshold: 0.7 });
    const market = new PredictionMarket({ liquidity: 100 });
    // Buy some YES but not enough to push past 0.7
    market.trade('a1', 'yes', 50, 0);

    const mockDao = {
      members: [],
      daoId: 'test',
      predictionMarkets: new Map([['p1', market]]),
    } as any;
    const proposal = new Proposal(mockDao, 'c', 'T', 'd', 0, 10);
    proposal.uniqueId = 'p1';

    // YES price with 50 tokens at liquidity 100 is ~0.62, below 0.7 threshold
    if (market.getYesPrice() < 0.7) {
      expect(rule.approve(proposal, mockDao)).toBe(false);
    }
  });
});

// =============================================================================
// FutarchyVotingStrategy Tests
// =============================================================================

describe('FutarchyVotingStrategy', () => {
  it('is registered in the strategy registry', () => {
    const strategy = getStrategy('futarchy');
    expect(strategy).toBeDefined();
    expect(strategy).toBeInstanceOf(FutarchyVotingStrategy);
  });

  it('falls back to standard vote when no market exists', () => {
    const strategy = new FutarchyVotingStrategy();
    const mockDao = {
      members: [],
      daoId: 'test',
      currentStep: 1,
      eventBus: null,
      predictionMarkets: new Map(),
    } as any;
    const proposal = new Proposal(mockDao, 'c', 'T', 'd', 0, 10);
    proposal.uniqueId = 'p1';

    const member = {
      uniqueId: 'a1',
      tokens: 100,
      optimism: 0.7,
      model: { currentStep: 1, eventBus: null, dao: mockDao, forumSimulation: null },
      votes: new Map(),
      calibratedVotingProbability: undefined,
      oppositionBias: 0,
      decideVote: () => 'yes' as const,
    } as any;

    strategy.vote(member, proposal);
    expect(member.votes.has('p1')).toBe(true);
  });
});
