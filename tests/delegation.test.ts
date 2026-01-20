// Transitive Delegation Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { DAOMember } from '@/lib/agents/base';
import { LiquidDelegator } from '@/lib/agents/liquid-delegator';
import { DAOSimulation } from '@/lib/engine/simulation';
import { Proposal } from '@/lib/data-structures/proposal';
import { DelegationResolver } from '@/lib/delegation/delegation-resolver';

describe('DelegationResolver', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
  });

  describe('resolveVotingPower', () => {
    it('should return own tokens + staked for member with no delegations', () => {
      const member = new DAOMember('member1', simulation, 100, 10, 'North America');
      member.stakedTokens = 50;
      simulation.dao.addMember(member);

      const power = DelegationResolver.resolveVotingPower(member);
      expect(power).toBe(150); // 100 tokens + 50 staked
    });

    it('should include direct delegation in voting power', () => {
      const delegator = new DAOMember('delegator', simulation, 100, 10, 'North America');
      const delegate = new DAOMember('delegate', simulation, 50, 10, 'Europe');
      simulation.dao.addMember(delegator);
      simulation.dao.addMember(delegate);

      // Delegator delegates 30 tokens to delegate
      delegator.delegate(30, delegate);

      // Delegate should have: 50 (own) + 30 (delegated) = 80
      const power = DelegationResolver.resolveVotingPower(delegate);
      expect(power).toBe(80);
    });

    it('should calculate transitive power: A -> B -> C', () => {
      const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
      const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
      const memberC = new DAOMember('C', simulation, 25, 10, 'Asia');
      simulation.dao.addMember(memberA);
      simulation.dao.addMember(memberB);
      simulation.dao.addMember(memberC);

      // A delegates 100 tokens to B
      memberA.delegate(100, memberB);
      // B delegates 50 tokens to C
      memberB.delegate(50, memberC);

      // C should have: 25 (own) + 50 (from B) + transitive (from A via B)
      // B has: 0 (delegated all) + 100 (from A)
      // C gets: 25 + 50 + (100) = 175
      const powerC = DelegationResolver.resolveVotingPower(memberC);
      expect(powerC).toBe(175);

      // B should have: 0 (delegated all to C) + 100 (from A) = 100
      // But wait - B delegated to C, so B's delegates array is empty
      const powerB = DelegationResolver.resolveVotingPower(memberB);
      expect(powerB).toBe(100); // 0 own (delegated) + 100 from A
    });

    it('should handle cycle detection', () => {
      const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
      const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
      simulation.dao.addMember(memberA);
      simulation.dao.addMember(memberB);

      // A delegates to B
      memberA.delegate(50, memberB);
      // Try to make B delegate to A (would create cycle)
      const couldDelegate = memberB.delegate(25, memberA);

      // Should be prevented
      expect(couldDelegate).toBe(false);
    });
  });

  describe('wouldCreateCycle', () => {
    it('should detect direct circular delegation', () => {
      const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
      const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
      simulation.dao.addMember(memberA);
      simulation.dao.addMember(memberB);

      // A delegates to B
      memberA.delegate(50, memberB);

      // Check if B -> A would create cycle
      const wouldCycle = DelegationResolver.wouldCreateCycle(memberB, memberA);
      expect(wouldCycle).toBe(true);
    });

    it('should detect deep chain cycle: A -> B -> C, then C -> A', () => {
      const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
      const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
      const memberC = new DAOMember('C', simulation, 25, 10, 'Asia');
      simulation.dao.addMember(memberA);
      simulation.dao.addMember(memberB);
      simulation.dao.addMember(memberC);

      // A delegates to B
      memberA.delegate(50, memberB);
      // B delegates to C
      memberB.delegate(25, memberC);

      // Check if C -> A would create cycle
      const wouldCycle = DelegationResolver.wouldCreateCycle(memberC, memberA);
      expect(wouldCycle).toBe(true);
    });

    it('should allow non-cyclic delegation', () => {
      const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
      const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
      const memberC = new DAOMember('C', simulation, 25, 10, 'Asia');
      simulation.dao.addMember(memberA);
      simulation.dao.addMember(memberB);
      simulation.dao.addMember(memberC);

      // A delegates to B
      memberA.delegate(50, memberB);

      // C -> B should not create cycle (no path from B back to C)
      const wouldCycle = DelegationResolver.wouldCreateCycle(memberC, memberB);
      expect(wouldCycle).toBe(false);
    });
  });

  describe('getDelegationChain', () => {
    it('should return single member when no representative', () => {
      const member = new DAOMember('member1', simulation, 100, 10, 'North America');
      simulation.dao.addMember(member);

      const chain = DelegationResolver.getDelegationChain(member);
      expect(chain).toHaveLength(1);
      expect(chain[0]).toBe(member);
    });

    it('should follow representative chain for LiquidDelegator', () => {
      const delegator = new LiquidDelegator('delegator', simulation, 100, 10, 'North America');
      const rep1 = new DAOMember('rep1', simulation, 50, 10, 'Europe');
      const rep2 = new DAOMember('rep2', simulation, 25, 10, 'Asia');
      simulation.dao.addMember(delegator);
      simulation.dao.addMember(rep1);
      simulation.dao.addMember(rep2);

      // Set up chain: delegator -> rep1 -> rep2
      delegator.delegateToMember(rep1);
      // Note: rep1 would need to be a LiquidDelegator to continue the chain
      // This test verifies the chain stops when there's no representative

      const chain = DelegationResolver.getDelegationChain(delegator);
      expect(chain).toHaveLength(2);
      expect(chain[0]).toBe(delegator);
      expect(chain[1]).toBe(rep1);
    });
  });

  describe('getAllDelegators', () => {
    it('should return empty array for member with no delegators', () => {
      const member = new DAOMember('member1', simulation, 100, 10, 'North America');
      simulation.dao.addMember(member);

      const delegators = DelegationResolver.getAllDelegators(member);
      expect(delegators).toHaveLength(0);
    });

    it('should return direct delegators', () => {
      const delegator1 = new DAOMember('delegator1', simulation, 100, 10, 'North America');
      const delegator2 = new DAOMember('delegator2', simulation, 50, 10, 'Europe');
      const delegate = new DAOMember('delegate', simulation, 25, 10, 'Asia');
      simulation.dao.addMember(delegator1);
      simulation.dao.addMember(delegator2);
      simulation.dao.addMember(delegate);

      delegator1.delegate(50, delegate);
      delegator2.delegate(25, delegate);

      const delegators = DelegationResolver.getAllDelegators(delegate);
      expect(delegators).toHaveLength(2);
      expect(delegators).toContain(delegator1);
      expect(delegators).toContain(delegator2);
    });

    it('should return transitive delegators', () => {
      const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
      const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
      const memberC = new DAOMember('C', simulation, 25, 10, 'Asia');
      simulation.dao.addMember(memberA);
      simulation.dao.addMember(memberB);
      simulation.dao.addMember(memberC);

      // A -> B -> C
      memberA.delegate(50, memberB);
      memberB.delegate(25, memberC);

      // C should have B as direct delegator and A as transitive
      const delegators = DelegationResolver.getAllDelegators(memberC);
      expect(delegators).toHaveLength(2);
      expect(delegators).toContain(memberB);
      expect(delegators).toContain(memberA);
    });
  });
});

describe('Voting with Delegation', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
  });

  it('should use effective voting power when voting', () => {
    const delegator = new DAOMember('delegator', simulation, 100, 10, 'North America');
    const delegate = new DAOMember('delegate', simulation, 50, 10, 'Europe');
    simulation.dao.addMember(delegator);
    simulation.dao.addMember(delegate);

    // Delegator delegates 80 tokens to delegate
    delegator.delegate(80, delegate);

    // Create a proposal
    const proposal = new Proposal(
      simulation.dao,
      'creator',
      'Test Proposal',
      'Description',
      1000,
      100,
      'Test Topic'
    );
    proposal.uniqueId = 'test_proposal_1';
    simulation.dao.proposals.push(proposal);
    proposal.takeVotingPowerSnapshot();

    // Delegate votes - should have effective weight of 50 + 80 = 130
    delegate.voteOnProposal(proposal);

    const voteData = delegate.votes.get(proposal.uniqueId);
    expect(voteData).toBeDefined();
    // Weight should reflect delegated power
    expect(voteData!.weight).toBe(130);
  });

  it('should prevent double-voting after direct vote revokes delegation', () => {
    const delegator = new DAOMember('delegator', simulation, 100, 10, 'North America');
    const delegate = new DAOMember('delegate', simulation, 50, 10, 'Europe');
    simulation.dao.addMember(delegator);
    simulation.dao.addMember(delegate);

    // Delegator delegates 80 tokens to delegate
    delegator.delegate(80, delegate);

    // Create a proposal
    const proposal = new Proposal(
      simulation.dao,
      'creator',
      'Test Proposal',
      'Description',
      1000,
      100,
      'Test Topic'
    );
    proposal.uniqueId = 'test_proposal_2';
    simulation.dao.proposals.push(proposal);
    proposal.takeVotingPowerSnapshot();

    // Delegate votes first
    delegate.voteOnProposal(proposal);

    // Delegator votes directly - their delegated power should be revoked
    delegator.voteOnProposal(proposal);

    // Check that delegation was revoked for this proposal
    expect(proposal.isDelegationRevokedFor(delegator.uniqueId)).toBe(true);
  });
});

describe('Voting Power Snapshot with Delegation', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
  });

  it('should capture delegated power in snapshot', () => {
    const delegator = new DAOMember('delegator', simulation, 100, 10, 'North America');
    const delegate = new DAOMember('delegate', simulation, 50, 10, 'Europe');
    simulation.dao.addMember(delegator);
    simulation.dao.addMember(delegate);

    // Set up delegation before proposal creation
    delegator.delegate(80, delegate);

    // Create proposal and take snapshot
    const proposal = new Proposal(
      simulation.dao,
      'creator',
      'Test Proposal',
      'Description',
      1000,
      100,
      'Test Topic'
    );
    proposal.uniqueId = 'test_proposal_3';
    simulation.dao.proposals.push(proposal);
    proposal.takeVotingPowerSnapshot();

    // Delegate's snapshot power should include delegated tokens
    const delegateSnapshotPower = proposal.getSnapshotVotingPower(delegate.uniqueId);
    expect(delegateSnapshotPower).toBe(130); // 50 own + 80 delegated

    // Delegator's snapshot power should be reduced
    const delegatorSnapshotPower = proposal.getSnapshotVotingPower(delegator.uniqueId);
    expect(delegatorSnapshotPower).toBe(20); // 100 - 80 delegated = 20
  });

  it('should capture transitive delegation in snapshot', () => {
    const memberA = new DAOMember('A', simulation, 100, 10, 'North America');
    const memberB = new DAOMember('B', simulation, 50, 10, 'Europe');
    const memberC = new DAOMember('C', simulation, 25, 10, 'Asia');
    simulation.dao.addMember(memberA);
    simulation.dao.addMember(memberB);
    simulation.dao.addMember(memberC);

    // A delegates all to B, B delegates all to C
    memberA.delegate(100, memberB);
    memberB.delegate(50, memberC);

    // Create proposal and take snapshot
    const proposal = new Proposal(
      simulation.dao,
      'creator',
      'Test Proposal',
      'Description',
      1000,
      100,
      'Test Topic'
    );
    proposal.uniqueId = 'test_proposal_4';
    simulation.dao.proposals.push(proposal);
    proposal.takeVotingPowerSnapshot();

    // C should have: 25 (own) + 50 (from B) + 100 (from A via B) = 175
    const powerC = proposal.getSnapshotVotingPower(memberC.uniqueId);
    expect(powerC).toBe(175);
  });
});

describe('LiquidDelegator Integration', () => {
  let simulation: DAOSimulation;

  beforeEach(() => {
    simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
  });

  it('should delegate to representative', () => {
    const delegator = new LiquidDelegator('delegator', simulation, 100, 10, 'North America');
    const representative = new DAOMember('rep', simulation, 50, 10, 'Europe');
    simulation.dao.addMember(delegator);
    simulation.dao.addMember(representative);

    delegator.delegateToMember(representative);

    expect(delegator.representative).toBe(representative);
    expect(representative.delegates).toContain(delegator);
  });

  it('should receive representative vote', () => {
    const delegator = new LiquidDelegator('delegator', simulation, 100, 10, 'North America');
    const representative = new DAOMember('rep', simulation, 50, 10, 'Europe');
    simulation.dao.addMember(delegator);
    simulation.dao.addMember(representative);

    delegator.delegateToMember(representative);

    const proposal = new Proposal(
      simulation.dao,
      'creator',
      'Test Proposal',
      'Description',
      1000,
      100,
      'Test Topic'
    );
    proposal.uniqueId = 'test_proposal_5';
    simulation.dao.proposals.push(proposal);

    // Simulate representative vote notification
    delegator.receiveRepresentativeVote(proposal, true, 1);

    expect(delegator.votes.has(proposal.uniqueId)).toBe(true);
    expect(delegator.votes.get(proposal.uniqueId)?.vote).toBe(true);
  });
});
