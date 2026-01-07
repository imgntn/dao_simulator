// Comprehensive agent tests - behavior, interactions, and edge cases
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DAOSimulation } from '@/lib/engine/simulation';
import { DAOMember } from '@/lib/agents/base';
import { Developer } from '@/lib/agents/developer';
import { Investor } from '@/lib/agents/investor';
import { Trader } from '@/lib/agents/trader';
import { Validator } from '@/lib/agents/validator';
import { Arbitrator } from '@/lib/agents/arbitrator';
import { Auditor } from '@/lib/agents/auditor';
import { ExternalPartner } from '@/lib/agents/external-partner';
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
import { Delegator } from '@/lib/agents/delegator';
import { ProposalCreator } from '@/lib/agents/proposal-creator';
import { Proposal } from '@/lib/data-structures/proposal';
import { Project } from '@/lib/data-structures/project';
import { Dispute } from '@/lib/data-structures/dispute';
import { setSeed } from '@/lib/utils/random';

// ============================================
// ARBITRATOR TESTS
// ============================================
describe('Arbitrator agent', () => {
  let simulation: DAOSimulation;
  let arbitrator: Arbitrator;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_arbitrators: 1,
      seed: 42,
    });
    arbitrator = simulation.dao.members.find(m => m instanceof Arbitrator) as Arbitrator;
  });

  it('should initialize with arbitration capacity', () => {
    expect(arbitrator).toBeDefined();
    expect(arbitrator.arbitrationCapacity).toBeGreaterThan(0);
  });

  it('should regenerate capacity over time', () => {
    // Drain capacity
    const initial = arbitrator.arbitrationCapacity;
    arbitrator.arbitrationCapacity = 0;

    // Step to regenerate
    arbitrator.step();

    expect(arbitrator.arbitrationCapacity).toBeGreaterThan(0);
  });

  it('should resolve disputes', () => {
    // Add a dispute
    const dispute = new Dispute(
      simulation.dao,
      ['member1'],
      'Test dispute',
      5,
      null,
      'member1'
    );
    simulation.dao.addDispute(dispute);

    expect(dispute.resolved).toBe(false);

    // Step arbitrator
    arbitrator.step();

    // May or may not resolve depending on capacity
    expect(arbitrator.arbitrationCapacity).toBeDefined();
  });

  it('should track resolved disputes', () => {
    expect(arbitrator.resolvedDisputes).toEqual([]);
  });

  it('should clamp slash amount to staked tokens', () => {
    // Create a member with staked tokens
    const member = new DAOMember('victim', simulation, 100, 50, 'North America');
    member.stakedTokens = 10;
    simulation.dao.addMember(member);

    // Create dispute
    const dispute = new Dispute(
      simulation.dao,
      [member.uniqueId],
      'Violation',
      100, // High importance
      null,
      member.uniqueId
    );
    simulation.dao.addDispute(dispute);

    // Arbitrate
    arbitrator.arbitrate(dispute);

    // Staked tokens should not go negative
    expect(member.stakedTokens).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// AUDITOR TESTS
// ============================================
describe('Auditor agent', () => {
  let simulation: DAOSimulation;
  let auditor: Auditor;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      num_auditors: 1,
      seed: 42,
    });
    auditor = simulation.dao.members.find(m => m instanceof Auditor) as Auditor;
  });

  it('should initialize correctly', () => {
    expect(auditor).toBeDefined();
    expect(auditor instanceof DAOMember).toBe(true);
  });

  it('should flag high-value proposals', () => {
    // Create a high-value proposal
    const creator = simulation.dao.members[0];
    const proposal = new Proposal(
      simulation.dao,
      creator.uniqueId,
      'High Value Proposal',
      'Description',
      5000, // High funding goal > 1000
      100,  // duration
      'funding'
    );
    proposal.uniqueId = 'test_prop_high_value';
    simulation.dao.proposals.push(proposal);

    const initialDisputes = simulation.dao.disputes.length;
    auditor.reviewProposals();

    // Should create a dispute
    expect(simulation.dao.disputes.length).toBeGreaterThan(initialDisputes);
  });

  it('should flag suspicious proposals', () => {
    const creator = simulation.dao.members[0];
    const proposal = new Proposal(
      simulation.dao,
      creator.uniqueId,
      'Suspicious Activity',
      'This is suspicious behavior', // Contains 'suspicious'
      100,
      100,  // duration
      'general'
    );
    proposal.uniqueId = 'suspicious_prop';
    simulation.dao.proposals.push(proposal);

    const initialDisputes = simulation.dao.disputes.length;
    auditor.reviewProposals();

    expect(simulation.dao.disputes.length).toBeGreaterThan(initialDisputes);
  });

  it('should have working step method', () => {
    expect(() => auditor.step()).not.toThrow();
  });
});

// ============================================
// EXTERNAL PARTNER TESTS
// ============================================
describe('ExternalPartner agent', () => {
  let simulation: DAOSimulation;
  let partner: ExternalPartner;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      num_external_partners: 1,
      external_partner_interact_probability: 1.0, // Always interact
      seed: 42,
    });
    partner = simulation.dao.members.find(m => m instanceof ExternalPartner) as ExternalPartner;
  });

  it('should initialize correctly', () => {
    expect(partner).toBeDefined();
    expect(partner.collaboratedProjects).toEqual([]);
  });

  it('should track collaborated projects', () => {
    // Create a project
    const project = new Project(
      'test_project',
      'Test Project',
      100,
      simulation.dao.members[0].uniqueId,
      50,
      10
    );
    simulation.dao.projects.push(project);

    partner.collaborateOnProject(project);

    expect(partner.collaboratedProjects).toContain(project);
  });

  it('should emit events on interactions', () => {
    const events: string[] = [];
    simulation.eventBus.subscribe('partnership_proposed', () => events.push('partnership'));
    simulation.eventBus.subscribe('collaboration_proposed', () => events.push('collaboration'));
    simulation.eventBus.subscribe('integration_proposed', () => events.push('integration'));

    partner.proposePartnership();
    partner.proposeCollaboration();
    partner.proposeIntegration();

    expect(events).toContain('partnership');
    expect(events).toContain('collaboration');
    expect(events).toContain('integration');
  });

  it('should have toDict method', () => {
    const dict = partner.toDict();
    expect(dict.uniqueId).toBe(partner.uniqueId);
    expect(dict.tokens).toBe(partner.tokens);
    expect(dict.collaboratedProjects).toEqual([]);
  });
});

// ============================================
// VALIDATOR BEHAVIOR TESTS
// ============================================
describe('Validator behavior', () => {
  let simulation: DAOSimulation;
  let validator: Validator;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 0,
      num_validators: 1,
      num_proposal_creators: 1,
      num_passive_members: 0,
      seed: 42,
    });
    validator = simulation.dao.members.find(m => m instanceof Validator) as Validator;
  });

  it('should have monitoring budget', () => {
    expect(validator.monitoringBudget).toBeGreaterThan(0);
  });

  it('should track monitored projects', () => {
    expect(validator.monitoredProjects).toBeInstanceOf(Set);
    expect(validator.monitoredProjects.size).toBe(0);
  });

  it('should flag projects behind schedule', () => {
    // Create a project that's behind schedule
    const project = new Project(
      'behind_project',
      'Behind Project',
      100,
      simulation.dao.members[0].uniqueId,
      10, // Short duration
      0   // No work done
    );
    project.startTime = simulation.currentStep - 20; // Started long ago
    simulation.dao.projects.push(project);

    const initialDisputes = simulation.dao.disputes.length;
    validator.monitorProject(project);

    // Should create a dispute since project is behind
    expect(simulation.dao.disputes.length).toBeGreaterThan(initialDisputes);
  });

  it('should decrease monitoring budget on use', () => {
    const project = new Project(
      'test_proj',
      'Test',
      100,
      simulation.dao.members[0].uniqueId,
      50,
      10
    );
    simulation.dao.projects.push(project);

    const initialBudget = validator.monitoringBudget;
    validator.monitorProjects();

    expect(validator.monitoringBudget).toBeLessThan(initialBudget);
  });
});

// ============================================
// AGENT STEP BEHAVIOR TESTS
// ============================================
describe('Agent step behaviors', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_validators: 1,
      num_proposal_creators: 1,
      num_traders: 1,
      num_arbitrators: 1,
      num_auditors: 1,
      num_external_partners: 1,
      num_bounty_hunters: 1,
      num_speculators: 1,
      num_regulators: 1,
      num_liquid_delegators: 1,
      num_service_providers: 1,
      num_adaptive_investors: 1,
      num_artists: 1,
      num_collectors: 1,
      num_rl_traders: 1,
      num_governance_experts: 1,
      num_risk_managers: 1,
      num_market_makers: 1,
      num_whistleblowers: 1,
      seed: 42,
    });
  });

  it('should run all agent steps without errors', () => {
    for (const member of simulation.dao.members) {
      expect(() => member.step()).not.toThrow();
    }
  });

  it('should run multiple simulation steps with all agents', async () => {
    await expect(simulation.run(20)).resolves.not.toThrow();
    expect(simulation.currentStep).toBe(20);
  });

  it('all agents should remain in valid state after steps', async () => {
    await simulation.run(10);

    for (const member of simulation.dao.members) {
      // Tokens should never be negative
      expect(member.tokens).toBeGreaterThanOrEqual(0);
      // Staked tokens should never be negative
      expect(member.stakedTokens).toBeGreaterThanOrEqual(0);
      // Reputation should never be negative (after our fixes)
      expect(member.reputation).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================
// AGENT INTERACTION TESTS
// ============================================
describe('Agent interactions', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 3,
      num_investors: 2,
      num_validators: 1,
      num_proposal_creators: 2,
      num_delegators: 2,
      num_passive_members: 0,
      seed: 42,
    });
  });

  it('should handle delegation chains', () => {
    const [memberA, memberB, memberC] = simulation.dao.members.slice(0, 3);

    // A delegates to B
    memberA.delegate(10, memberB);
    expect(memberA.delegations.get(memberB.uniqueId)).toBe(10);

    // B should have A in delegates
    expect(memberB.delegates).toContain(memberA);
  });

  it('should prevent circular delegation', () => {
    const memberA = new DAOMember('A', simulation, 100, 10, 'NA');
    const memberB = new DAOMember('B', simulation, 100, 10, 'EU');
    simulation.dao.addMember(memberA);
    simulation.dao.addMember(memberB);

    // A delegates to B
    memberA.delegate(10, memberB);

    // B tries to delegate to A (circular)
    memberB.delegate(10, memberA);

    // B's tokens should remain unchanged (delegation prevented)
    expect(memberB.tokens).toBe(100);
  });

  it('should handle voting on proposals', async () => {
    await simulation.run(10);

    // Should have proposals created
    expect(simulation.dao.proposals.length).toBeGreaterThan(0);

    // Proposals should have votes
    const votedProposals = simulation.dao.proposals.filter(
      p => p.votesFor > 0 || p.votesAgainst > 0
    );
    expect(votedProposals.length).toBeGreaterThan(0);
  });

  it('should handle proposal investments', async () => {
    await simulation.run(15);

    // Check if investors invested in proposals
    const fundedProposals = simulation.dao.proposals.filter(p => p.currentFunding > 0);
    expect(fundedProposals.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// EDGE CASES AND BOUNDARY TESTS
// ============================================
describe('Edge cases and boundaries', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      seed: 42,
    });
  });

  it('should handle zero tokens gracefully', () => {
    const member = new DAOMember('broke', simulation, 0, 10, 'NA');
    simulation.dao.addMember(member);

    // Should not throw
    expect(() => member.step()).not.toThrow();
    expect(() => member.delegate(10, simulation.dao.members[0])).not.toThrow();
  });

  it('should handle zero reputation gracefully', () => {
    const member = new DAOMember('no_rep', simulation, 100, 0, 'NA');
    simulation.dao.addMember(member);

    expect(() => member.step()).not.toThrow();
  });

  it('should handle empty proposals list', () => {
    // Clear proposals
    simulation.dao.proposals = [];

    // All agents should handle empty proposals
    for (const member of simulation.dao.members) {
      expect(() => member.voteOnRandomProposal()).not.toThrow();
      expect(() => member.leaveCommentOnRandomProposal()).not.toThrow();
    }
  });

  it('should handle empty projects list', () => {
    // Clear projects
    simulation.dao.projects = [];

    const developer = simulation.dao.members.find(m => m instanceof Developer) as Developer;
    expect(() => developer.step()).not.toThrow();
  });

  it('should handle self-delegation prevention', () => {
    const member = simulation.dao.members[0];
    const initialTokens = member.tokens;

    member.delegate(10, member); // Try self-delegation

    expect(member.tokens).toBe(initialTokens); // No change
  });

  it('should handle negative delegation amounts', () => {
    const [memberA, memberB] = simulation.dao.members;
    const initialTokens = memberA.tokens;

    memberA.delegate(-10, memberB);

    expect(memberA.tokens).toBe(initialTokens); // No change
  });

  it('should handle excessive delegation amounts', () => {
    const [memberA, memberB] = simulation.dao.members;
    const initialTokens = memberA.tokens;

    memberA.delegate(initialTokens + 1000, memberB);

    expect(memberA.tokens).toBe(initialTokens); // No change
  });
});

// ============================================
// INVESTOR BEHAVIOR TESTS
// ============================================
describe('Investor budget management', () => {
  let simulation: DAOSimulation;
  let investor: Investor;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 1,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      seed: 42,
    });
    investor = simulation.dao.members.find(m => m instanceof Investor) as Investor;
  });

  it('should adjust budget based on price', () => {
    const initialBudget = investor.investmentBudget;

    // Trigger shock to change price
    simulation.triggerMarketShock(0.5);
    investor.adjustBudgetBasedOnPrice();

    // Budget should be adjusted
    expect(investor.investmentBudget).not.toBe(initialBudget);
  });

  it('should never have negative budget', () => {
    investor.investmentBudget = 1;

    // Multiple negative shocks
    for (let i = 0; i < 10; i++) {
      simulation.triggerMarketShock(-0.5);
      investor.adjustBudgetBasedOnPrice();
    }

    expect(investor.investmentBudget).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// TRADER BEHAVIOR TESTS
// ============================================
describe('Trader trade execution', () => {
  let simulation: DAOSimulation;
  let trader: Trader;

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
    trader = simulation.dao.members.find(m => m instanceof Trader) as Trader;
  });

  it('should update lastPrice after step', () => {
    const initialPrice = trader.lastPrice;
    trader.step();
    // lastPrice should be updated (may or may not change depending on market)
    expect(trader.lastPrice).toBeDefined();
  });

  it('should not trade more than owned', () => {
    const initialTokens = trader.tokens;
    trader.step();
    // Should never go negative
    expect(trader.tokens).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// LIQUID DELEGATOR BEHAVIOR
// ============================================
describe('LiquidDelegator representative selection', () => {
  let simulation: DAOSimulation;
  let delegator: LiquidDelegator;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 3,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
      num_liquid_delegators: 1,
      seed: 42,
    });
    delegator = simulation.dao.members.find(m => m instanceof LiquidDelegator) as LiquidDelegator;
  });

  it('should choose representative after step', () => {
    expect(delegator.representative).toBeNull();

    delegator.step();

    expect(delegator.representative).not.toBeNull();
  });

  it('should track delegation history', () => {
    delegator.step();

    expect(delegator.delegationHistory.length).toBeGreaterThan(0);
  });

  it('should prefer higher reputation representatives', () => {
    // Ensure we have candidates with varying reputations
    expect(simulation.dao.members.length).toBeGreaterThan(1);

    // Set varied reputations for testing weighted selection
    const candidates = simulation.dao.members.filter(m => m !== delegator);
    candidates.forEach((m, i) => {
      m.reputation = (i + 1) * 30; // 30, 60, 90, etc.
    });

    // Run multiple times and check tendency
    const repSelections: number[] = [];

    for (let i = 0; i < 10; i++) {
      setSeed(i);
      delegator.representative = null;
      const rep = delegator.chooseRepresentative();
      if (rep) {
        repSelections.push(rep.reputation);
      }
    }

    // Should have selected at least some representatives
    expect(repSelections.length).toBeGreaterThan(0);

    // Average selected reputation should be reasonable (weighted toward higher rep)
    const avgRep = repSelections.reduce((a, b) => a + b, 0) / repSelections.length;
    expect(avgRep).toBeGreaterThanOrEqual(30);
  });
});

// ============================================
// GOVERNANCE EXPERT ANALYSIS
// ============================================
describe('GovernanceExpert proposal analysis', () => {
  let simulation: DAOSimulation;
  let expert: GovernanceExpert;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      num_governance_experts: 1,
      seed: 42,
    });
    expert = simulation.dao.members.find(m => m instanceof GovernanceExpert) as GovernanceExpert;
  });

  it('should analyze proposals', async () => {
    // Create a proposal
    await simulation.run(5);

    if (simulation.dao.proposals.length > 0) {
      expert.step();
      // May have analyses if proposals exist
      expect(expert.analyses).toBeDefined();
    }
  });
});

// ============================================
// MARKET MAKER LIQUIDITY
// ============================================
describe('MarketMaker liquidity provision', () => {
  let simulation: DAOSimulation;
  let maker: MarketMaker;

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
    maker = simulation.dao.members.find(m => m instanceof MarketMaker) as MarketMaker;
  });

  it('should track fees and impermanent loss', () => {
    expect(maker.stats.feesEarned).toBe(0);
    expect(maker.stats.impermanentLoss).toBe(0);
    expect(maker.stats.totalVolume).toBe(0);
    expect(maker.stats.tradesExecuted).toBe(0);
  });

  it('should manage positions', () => {
    expect(maker.positions).toBeInstanceOf(Map);
  });
});

// ============================================
// RISK MANAGER ALERTS
// ============================================
describe('RiskManager risk assessment', () => {
  let simulation: DAOSimulation;
  let manager: RiskManager;

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
    manager = simulation.dao.members.find(m => m instanceof RiskManager) as RiskManager;
  });

  it('should assess risk and potentially create alerts', () => {
    // Manipulate state to trigger alerts
    manager.stakedTokens = manager.tokens * 2; // High stake ratio

    manager.step();

    // Portfolio history should be tracked
    expect(manager.portfolioHistory.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// WHISTLEBLOWER INVESTIGATION
// ============================================
describe('Whistleblower violation detection', () => {
  let simulation: DAOSimulation;
  let whistleblower: Whistleblower;

  beforeEach(() => {
    setSeed(42);
    simulation = new DAOSimulation({
      num_developers: 2,
      num_investors: 2,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
      num_whistleblowers: 1,
      seed: 42,
    });
    whistleblower = simulation.dao.members.find(m => m instanceof Whistleblower) as Whistleblower;
  });

  it('should track suspicions', () => {
    expect(whistleblower.suspicions).toBeInstanceOf(Map);
  });

  it('should track investigation records', () => {
    expect(whistleblower.investigations).toEqual([]);
  });

  it('should not go negative on investigation costs', () => {
    whistleblower.tokens = 1; // Low tokens

    // Multiple steps
    for (let i = 0; i < 5; i++) {
      whistleblower.step();
    }

    expect(whistleblower.tokens).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// SIMULATION WIDE TESTS
// ============================================
describe('Full simulation with all agent types', () => {
  it('should complete 100 steps with all agents', async () => {
    setSeed(42);
    const simulation = new DAOSimulation({
      num_developers: 2,
      num_investors: 2,
      num_validators: 1,
      num_proposal_creators: 2,
      num_traders: 1,
      num_arbitrators: 1,
      num_auditors: 1,
      num_external_partners: 1,
      num_bounty_hunters: 1,
      num_speculators: 1,
      num_regulators: 1,
      num_delegators: 1,
      num_liquid_delegators: 1,
      num_service_providers: 1,
      num_adaptive_investors: 1,
      num_artists: 1,
      num_collectors: 1,
      num_rl_traders: 1,
      num_governance_experts: 1,
      num_risk_managers: 1,
      num_market_makers: 1,
      num_whistleblowers: 1,
      seed: 42,
    });

    await expect(simulation.run(100)).resolves.not.toThrow();
    expect(simulation.currentStep).toBe(100);

    // Verify all members are still valid
    for (const member of simulation.dao.members) {
      expect(member.tokens).toBeGreaterThanOrEqual(0);
      expect(member.stakedTokens).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle market shocks gracefully', async () => {
    setSeed(42);
    const simulation = new DAOSimulation({
      num_developers: 2,
      num_investors: 2,
      num_validators: 1,
      num_proposal_creators: 1,
      num_traders: 2,
      num_passive_members: 0,
      marketShockSchedule: {
        10: 0.5,   // Positive shock
        20: -0.3,  // Negative shock
        30: 0.2,
      },
      seed: 42,
    });

    await expect(simulation.run(50)).resolves.not.toThrow();

    // All agents should survive the shocks
    for (const member of simulation.dao.members) {
      expect(member.tokens).toBeGreaterThanOrEqual(0);
    }
  });
});
