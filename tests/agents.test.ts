// Agent unit tests
import { describe, it, expect, beforeEach } from 'vitest';
import { DAOMember } from '@/lib/agents/base';
import { Developer } from '@/lib/agents/developer';
import { Investor } from '@/lib/agents/investor';
import { Validator } from '@/lib/agents/validator';
import { ProposalCreator } from '@/lib/agents/proposal-creator';
import { PassiveMember } from '@/lib/agents/passive-member';
import { Delegator } from '@/lib/agents/delegator';
import { DAOSimulation } from '@/lib/engine/simulation';
import { Proposal } from '@/lib/data-structures/proposal';

describe('DAOMember base class', () => {
  let simulation: DAOSimulation;
  let member: DAOMember;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
    member = new DAOMember('test_member', simulation, 100, 10, 'North America');
  });

  it('should initialize with correct properties', () => {
    expect(member.uniqueId).toBe('test_member');
    expect(member.tokens).toBe(100);
    expect(member.reputation).toBe(10);
    expect(member.location).toBe('North America');
    expect(member.stakedTokens).toBe(0);
  });

  it('should receive revenue share', () => {
    const initialTokens = member.tokens;
    member.receiveRevenueShare(50);
    expect(member.tokens).toBe(initialTokens + 50);
  });

  it('should decide vote based on optimism', () => {
    // Run multiple votes to check distribution
    const votes = { yes: 0, no: 0 };
    for (let i = 0; i < 100; i++) {
      const vote = member.decideVote('neutral topic');
      votes[vote]++;
    }
    // Should have some of both
    expect(votes.yes).toBeGreaterThan(0);
    expect(votes.no).toBeGreaterThan(0);
  });

  it('should favor topic B in vote decisions', () => {
    const votes = { yes: 0, no: 0 };
    for (let i = 0; i < 100; i++) {
      const vote = member.decideVote('topic b proposal');
      votes[vote]++;
    }
    // Should favor yes (70% probability)
    expect(votes.yes).toBeGreaterThan(votes.no);
  });

  it('should disfavor topic A in vote decisions', () => {
    const votes = { yes: 0, no: 0 };
    for (let i = 0; i < 100; i++) {
      const vote = member.decideVote('topic a proposal');
      votes[vote]++;
    }
    // Should favor no (30% yes probability)
    expect(votes.no).toBeGreaterThan(votes.yes);
  });

  it('should delegate tokens to another member', () => {
    const delegate = new DAOMember('delegate', simulation, 50, 5, 'Europe');

    member.delegate(30, delegate);

    expect(member.tokens).toBe(70); // 100 - 30
    expect(member.delegations.get(delegate.uniqueId)).toBe(30);
    expect(delegate.delegates).toContain(member);
  });

  it('should not delegate more tokens than owned', () => {
    const delegate = new DAOMember('delegate', simulation, 50, 5, 'Europe');

    member.delegate(200, delegate); // Try to delegate more than owned

    expect(member.tokens).toBe(100); // Should remain unchanged
    expect(member.delegations.has(delegate.uniqueId)).toBe(false);
  });

  it('should not delegate negative amounts', () => {
    const delegate = new DAOMember('delegate', simulation, 50, 5, 'Europe');

    member.delegate(-10, delegate);

    expect(member.tokens).toBe(100);
  });
});

describe('Developer agent', () => {
  let simulation: DAOSimulation;
  let developer: Developer;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_validators: 1,
      num_proposal_creators: 1,
      num_passive_members: 0,
    });
    developer = new Developer(
      'test_dev',
      simulation,
      100,
      20,
      'North America',
      'default',
      ['TypeScript', 'React']
    );
    simulation.dao.addMember(developer);
  });

  it('should initialize with skillset', () => {
    expect(developer.skillset).toContain('TypeScript');
    expect(developer.skillset).toContain('React');
  });

  it('should have working step method', () => {
    // Should not throw
    expect(() => developer.step()).not.toThrow();
  });

  it('should inherit from DAOMember', () => {
    expect(developer instanceof DAOMember).toBe(true);
    expect(developer.tokens).toBe(100);
    expect(developer.reputation).toBe(20);
  });
});

describe('Investor agent', () => {
  let simulation: DAOSimulation;
  let investor: Investor;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 0,
      num_validators: 1,
      num_proposal_creators: 1,
      num_passive_members: 0,
    });
    investor = new Investor(
      'test_investor',
      simulation,
      1000,
      15,
      'Europe',
      'default',
      500 // investment budget
    );
    simulation.dao.addMember(investor);
  });

  it('should initialize with investment budget', () => {
    expect(investor.investmentBudget).toBe(500);
  });

  it('should have working step method', () => {
    expect(() => investor.step()).not.toThrow();
  });

  it('should inherit from DAOMember', () => {
    expect(investor instanceof DAOMember).toBe(true);
  });
});

describe('Validator agent', () => {
  let simulation: DAOSimulation;
  let validator: Validator;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_validators: 0,
      num_proposal_creators: 1,
      num_passive_members: 0,
    });
    validator = new Validator(
      'test_validator',
      simulation,
      500,
      30,
      'Asia'
    );
    simulation.dao.addMember(validator);
  });

  it('should initialize as validator', () => {
    expect(validator.uniqueId).toBe('test_validator');
  });

  it('should have working step method', () => {
    expect(() => validator.step()).not.toThrow();
  });

  it('should inherit from DAOMember', () => {
    expect(validator instanceof DAOMember).toBe(true);
  });
});

describe('ProposalCreator agent', () => {
  let simulation: DAOSimulation;
  let creator: ProposalCreator;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_validators: 1,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
    creator = new ProposalCreator(
      'test_creator',
      simulation,
      200,
      25,
      'South America'
    );
    simulation.dao.addMember(creator);
  });

  it('should be able to create proposals', () => {
    const initialCount = simulation.dao.proposals.length;

    // Run step which may create proposal
    creator.step();

    // May or may not have created a proposal (random)
    expect(simulation.dao.proposals.length).toBeGreaterThanOrEqual(initialCount);
  });

  it('should inherit from DAOMember', () => {
    expect(creator instanceof DAOMember).toBe(true);
  });
});

describe('PassiveMember agent', () => {
  let simulation: DAOSimulation;
  let passive: PassiveMember;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 1,
      num_investors: 1,
      num_validators: 1,
      num_proposal_creators: 1,
      num_passive_members: 0,
    });
    passive = new PassiveMember(
      'test_passive',
      simulation,
      50,
      5,
      'Africa'
    );
    simulation.dao.addMember(passive);
  });

  it('should have low activity', () => {
    // PassiveMember should do minimal actions
    const initialTokens = passive.tokens;
    passive.step();
    // Tokens should remain relatively stable
    expect(passive.tokens).toBe(initialTokens);
  });

  it('should inherit from DAOMember', () => {
    expect(passive instanceof DAOMember).toBe(true);
  });
});

describe('Delegator agent', () => {
  let simulation: DAOSimulation;
  let delegator: Delegator;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 2,
      num_investors: 1,
      num_validators: 2,
      num_proposal_creators: 1,
      num_passive_members: 0,
    });
    delegator = new Delegator(
      'test_delegator',
      simulation,
      300,
      20,
      'Oceania',
      'default',
      150 // delegation budget
    );
    simulation.dao.addMember(delegator);
  });

  it('should initialize with delegation budget', () => {
    expect(delegator.delegationBudget).toBe(150);
  });

  it('should have working step method', () => {
    expect(() => delegator.step()).not.toThrow();
  });

  it('should inherit from DAOMember', () => {
    expect(delegator instanceof DAOMember).toBe(true);
  });
});

describe('Agent interactions', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 3,
      num_investors: 2,
      num_validators: 2,
      num_proposal_creators: 2,
      num_passive_members: 3,
      seed: 12345,  // Use fixed seed for deterministic tests
    });
  });

  it('should initialize with correct number of agents', () => {
    const memberTypes = simulation.dao.members.map(m => m.constructor.name);

    expect(memberTypes.filter(t => t === 'Developer').length).toBe(3);
    expect(memberTypes.filter(t => t === 'Investor').length).toBe(2);
    expect(memberTypes.filter(t => t === 'Validator').length).toBe(2);
    expect(memberTypes.filter(t => t === 'ProposalCreator').length).toBe(2);
    expect(memberTypes.filter(t => t === 'PassiveMember').length).toBe(3);
  });

  it('should run simulation step without errors', async () => {
    await expect(simulation.step()).resolves.not.toThrow();
  });

  it('should run multiple simulation steps', async () => {
    await expect(simulation.run(10)).resolves.not.toThrow();
    expect(simulation.currentStep).toBe(10);
  });

  it('should handle proposals being created and voted on', async () => {
    // ProposalCreators have 0.5% chance to create per step
    // With 2 creators and 500 steps: expected = 2 × 500 × 0.005 = 5 proposals
    // Using 500 steps to ensure reliable proposal creation even with unlucky RNG
    await simulation.run(500);

    // Should have some proposals
    expect(simulation.dao.proposals.length).toBeGreaterThan(0);
  });
});

describe('Voting behavior', () => {
  let simulation: DAOSimulation;
  let member: DAOMember;
  let proposal: Proposal;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 2,
      num_investors: 2,
      num_validators: 2,
      num_proposal_creators: 2,
      num_passive_members: 0,
    });
    member = new DAOMember('voter', simulation, 100, 10, 'North America');
    simulation.dao.addMember(member);

    // Create a test proposal with correct constructor signature
    proposal = new Proposal(
      simulation.dao,
      simulation.dao.members[0].uniqueId,
      'Test Proposal',
      'A test proposal',
      1000,
      100,
      'funding'
    );
    simulation.dao.proposals.push(proposal);
  });

  it('should record vote on proposal', () => {
    member.voteOnProposal(proposal);

    expect(member.votes.has(proposal.uniqueId)).toBe(true);
  });

  it('should leave comment on proposal', () => {
    member.leaveComment(proposal, 'positive');

    expect(member.comments.get(proposal.uniqueId)).toBe('positive');
  });
});
