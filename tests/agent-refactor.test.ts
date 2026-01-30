// Comprehensive tests for refactored and new agents
import { describe, it, expect, beforeEach } from 'vitest';
import { DAOSimulation } from '@/lib/engine/simulation';
import { DAOMember } from '@/lib/agents/base';
import { Trader } from '@/lib/agents/trader';
import { BountyHunter } from '@/lib/agents/bounty-hunter';
import { Speculator } from '@/lib/agents/speculator';
import { Regulator } from '@/lib/agents/regulator';
import { LiquidDelegator } from '@/lib/agents/liquid-delegator';
import { ServiceProvider } from '@/lib/agents/service-provider';
import { AdaptiveInvestor } from '@/lib/agents/adaptive-investor';
import { Artist } from '@/lib/agents/artist';
import { Collector } from '@/lib/agents/collector';
import { RLTrader } from '@/lib/agents/rl-trader';
import { GovernanceExpert } from '@/lib/agents/governance-expert';
import { RiskManager } from '@/lib/agents/risk-manager';
import { MarketMaker } from '@/lib/agents/market-maker';
import { Whistleblower } from '@/lib/agents/whistleblower';
import { setSeed } from '@/lib/utils/random';

describe('Trader agent fixes', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_traders: 1,
      seed: 42,
    });
  });

  it('should trade fraction of holdings, not fixed amount', () => {
    const trader = simulation.dao.members.find(m => m instanceof Trader) as Trader;
    expect(trader).toBeDefined();
    expect(trader.tradeFraction).toBeGreaterThanOrEqual(0.01);
    expect(trader.tradeFraction).toBeLessThanOrEqual(0.1);
  });

  it('should have seeded lastPrice', () => {
    const trader = simulation.dao.members.find(m => m instanceof Trader) as Trader;
    expect(trader.lastPrice).toBeDefined();
    expect(typeof trader.lastPrice).toBe('number');
  });
});

describe('BountyHunter work requirement', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_bounty_hunters: 1,
      seed: 42,
    });
  });

  it('should have work efficiency', () => {
    const hunter = simulation.dao.members.find(m => m instanceof BountyHunter) as BountyHunter;
    expect(hunter).toBeDefined();
    expect(hunter.workEfficiency).toBeGreaterThanOrEqual(0.5);
    expect(hunter.workEfficiency).toBeLessThanOrEqual(1.5);
  });

  it('should track active bounty and completed bounties', () => {
    const hunter = simulation.dao.members.find(m => m instanceof BountyHunter) as BountyHunter;
    expect(hunter.activeBounty).toBeNull();
    expect(hunter.completedBounties).toEqual([]);
  });
});

describe('Speculator fixes', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_speculators: 1,
      seed: 42,
    });
  });

  it('should track predictions and bets', () => {
    const speculator = simulation.dao.members.find(m => m instanceof Speculator) as Speculator;
    expect(speculator).toBeDefined();
    expect(speculator.predictions).toBeInstanceOf(Set);
    expect(speculator.bets).toBeInstanceOf(Map);
  });
});

describe('Regulator configurable compliance', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_regulators: 1,
      seed: 42,
    });
  });

  it('should have configurable compliance config', () => {
    const regulator = simulation.dao.members.find(m => m instanceof Regulator) as Regulator;
    expect(regulator).toBeDefined();
    expect(regulator.complianceConfig).toBeDefined();
    expect(regulator.complianceConfig.maxFundingGoal).toBe(10000);
    expect(regulator.complianceConfig.maxDuration).toBe(365);
  });

  it('should track inspection count', () => {
    const regulator = simulation.dao.members.find(m => m instanceof Regulator) as Regulator;
    expect(regulator.inspectionCount).toBe(0);
  });
});

describe('LiquidDelegator type safety', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_liquid_delegators: 1,
      seed: 42,
    });
  });

  it('should have properly typed representative', () => {
    const delegator = simulation.dao.members.find(m => m instanceof LiquidDelegator) as LiquidDelegator;
    expect(delegator).toBeDefined();
    expect(delegator.representative).toBeNull();
    expect(delegator.delegationHistory).toEqual([]);
  });
});

describe('ServiceProvider fixes', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_service_providers: 1,
      seed: 42,
    });
  });

  it('should have specialization and quality rating', () => {
    const provider = simulation.dao.members.find(m => m instanceof ServiceProvider) as ServiceProvider;
    expect(provider).toBeDefined();
    expect(provider.specialization).toBeDefined();
    expect(['legal', 'financial', 'technical', 'advisory']).toContain(provider.specialization);
    expect(provider.qualityRating).toBeGreaterThanOrEqual(0.5);
    expect(provider.qualityRating).toBeLessThanOrEqual(1.5);
  });

  it('should track max service budget', () => {
    const provider = simulation.dao.members.find(m => m instanceof ServiceProvider) as ServiceProvider;
    expect(provider.maxServiceBudget).toBe(provider.serviceBudget);
  });
});

describe('AdaptiveInvestor Q-value bounds', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_adaptive_investors: 1,
      seed: 42,
    });
  });

  it('should have clamped learning rate and epsilon', () => {
    const investor = simulation.dao.members.find(m => m instanceof AdaptiveInvestor) as AdaptiveInvestor;
    expect(investor).toBeDefined();
    expect(investor.learningRate).toBeGreaterThanOrEqual(0);
    expect(investor.learningRate).toBeLessThanOrEqual(1);
    expect(investor.epsilon).toBeGreaterThanOrEqual(0);
    expect(investor.epsilon).toBeLessThanOrEqual(1);
  });

  it('should track total returns', () => {
    const investor = simulation.dao.members.find(m => m instanceof AdaptiveInvestor) as AdaptiveInvestor;
    expect(investor.totalReturns).toBe(0);
  });
});

describe('Artist fixes', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_artists: 1,
      seed: 42,
    });
  });

  it('should have art style', () => {
    const artist = simulation.dao.members.find(m => m instanceof Artist) as Artist;
    expect(artist).toBeDefined();
    expect(['abstract', 'portrait', 'landscape', 'digital', 'generative']).toContain(artist.artStyle);
  });

  it('should track minted and sold counts', () => {
    const artist = simulation.dao.members.find(m => m instanceof Artist) as Artist;
    expect(artist.mintedCount).toBe(0);
    expect(artist.soldCount).toBe(0);
    expect(artist.totalEarnings).toBe(0);
  });
});

describe('Collector fixes', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_collectors: 1,
      seed: 42,
    });
  });

  it('should have collection and spending tracking', () => {
    const collector = simulation.dao.members.find(m => m instanceof Collector) as Collector;
    expect(collector).toBeDefined();
    expect(collector.collection).toBeInstanceOf(Set);
    expect(collector.totalSpent).toBe(0);
  });

  it('should have optional preferred style', () => {
    const collector = simulation.dao.members.find(m => m instanceof Collector) as Collector;
    // preferredStyle can be null or a valid style
    if (collector.preferredStyle !== null) {
      expect(['abstract', 'portrait', 'landscape', 'digital', 'generative']).toContain(collector.preferredStyle);
    }
  });
});

describe('RLTrader fixes', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_rl_traders: 1,
      seed: 42,
    });
  });

  it('should have clamped hyperparameters', () => {
    const trader = simulation.dao.members.find(m => m instanceof RLTrader) as RLTrader;
    expect(trader).toBeDefined();
    expect(trader.learningRate).toBeGreaterThanOrEqual(0);
    expect(trader.learningRate).toBeLessThanOrEqual(1);
    expect(trader.discount).toBeGreaterThanOrEqual(0);
    expect(trader.discount).toBeLessThanOrEqual(1);
    expect(trader.epsilon).toBeGreaterThanOrEqual(0);
    expect(trader.epsilon).toBeLessThanOrEqual(1);
  });

  it('should have trading stats', () => {
    const trader = simulation.dao.members.find(m => m instanceof RLTrader) as RLTrader;
    expect(trader.totalReward).toBe(0);
    expect(trader.tradeCount).toBe(0);
  });

  it('should include hold action', () => {
    expect(RLTrader.ACTIONS).toContain('hold');
  });
});

describe('New agents - GovernanceExpert', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_governance_experts: 1,
      seed: 42,
    });
  });

  it('should have specializations', () => {
    const expert = simulation.dao.members.find(m => m instanceof GovernanceExpert) as GovernanceExpert;
    expect(expert).toBeDefined();
    expect(expert.specialization).toHaveLength(2);
  });

  it('should have accuracy and influence ratings', () => {
    const expert = simulation.dao.members.find(m => m instanceof GovernanceExpert) as GovernanceExpert;
    expect(expert.accuracyRating).toBeGreaterThanOrEqual(0.5);
    expect(expert.accuracyRating).toBeLessThanOrEqual(0.8);
    expect(expert.advisorInfluence).toBeGreaterThanOrEqual(0.5);
    expect(expert.advisorInfluence).toBeLessThanOrEqual(1.0);
  });

  it('should track analyses', () => {
    const expert = simulation.dao.members.find(m => m instanceof GovernanceExpert) as GovernanceExpert;
    expect(expert.analyses).toBeInstanceOf(Map);
  });
});

describe('New agents - RiskManager', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_risk_managers: 1,
      seed: 42,
    });
  });

  it('should have risk parameters', () => {
    const manager = simulation.dao.members.find(m => m instanceof RiskManager) as RiskManager;
    expect(manager).toBeDefined();
    expect(manager.targetStakeRatio).toBeGreaterThanOrEqual(0.2);
    expect(manager.targetStakeRatio).toBeLessThanOrEqual(0.6);
    expect(manager.riskTolerance).toBeGreaterThanOrEqual(0);
    expect(manager.riskTolerance).toBeLessThanOrEqual(1);
  });

  it('should track alerts and portfolio history', () => {
    const manager = simulation.dao.members.find(m => m instanceof RiskManager) as RiskManager;
    expect(manager.alerts).toEqual([]);
    expect(manager.portfolioHistory).toEqual([]);
    expect(manager.rebalanceCount).toBe(0);
  });
});

describe('New agents - MarketMaker', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_market_makers: 1,
      seed: 42,
    });
  });

  it('should have liquidity parameters', () => {
    const maker = simulation.dao.members.find(m => m instanceof MarketMaker) as MarketMaker;
    expect(maker).toBeDefined();
    expect(maker.targetLiquidityRatio).toBeGreaterThanOrEqual(0.1);
    expect(maker.targetLiquidityRatio).toBeLessThanOrEqual(0.5);
    expect(maker.riskAversion).toBeGreaterThanOrEqual(0.3);
    expect(maker.riskAversion).toBeLessThanOrEqual(0.7);
  });

  it('should track positions and stats', () => {
    const maker = simulation.dao.members.find(m => m instanceof MarketMaker) as MarketMaker;
    expect(maker.positions).toBeInstanceOf(Map);
    expect(maker.stats.feesEarned).toBe(0);
    expect(maker.stats.impermanentLoss).toBe(0);
  });
});

describe('New agents - Whistleblower', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_whistleblowers: 1,
      seed: 42,
    });
  });

  it('should have detection skill', () => {
    const whistleblower = simulation.dao.members.find(m => m instanceof Whistleblower) as Whistleblower;
    expect(whistleblower).toBeDefined();
    expect(whistleblower.detectionSkill).toBeGreaterThanOrEqual(0.3);
    expect(whistleblower.detectionSkill).toBeLessThanOrEqual(0.8);
  });

  it('should track investigations and reports', () => {
    const whistleblower = simulation.dao.members.find(m => m instanceof Whistleblower) as Whistleblower;
    expect(whistleblower.investigations).toEqual([]);
    expect(whistleblower.suspicions).toBeInstanceOf(Map);
    expect(whistleblower.successfulReports).toBe(0);
    expect(whistleblower.falseReports).toBe(0);
    expect(whistleblower.totalRewards).toBe(0);
  });
});

describe('Seeded RNG reproducibility', () => {
  it('should produce identical simulations with same seed', async () => {
    setSeed(12345);
    const sim1 = new DAOSimulation({
      num_developers: 2,
      num_investors: 2,
      num_traders: 1,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      seed: 12345,
    });
    await sim1.run(10);
    const tokens1 = sim1.dao.members.map(m => m.tokens);

    setSeed(12345);
    const sim2 = new DAOSimulation({
      num_developers: 2,
      num_investors: 2,
      num_traders: 1,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      seed: 12345,
    });
    await sim2.run(10);
    const tokens2 = sim2.dao.members.map(m => m.tokens);

    expect(tokens1).toEqual(tokens2);
  });
});
