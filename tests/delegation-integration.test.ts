// Delegation Integration Tests
// Tests that delegation mechanisms improve governance outcomes (quorum achievement, participation)

import { describe, it, expect, beforeEach } from 'vitest';
import { DAOMember } from '@/lib/agents/base';
import { LiquidDelegator } from '@/lib/agents/liquid-delegator';
import { DAOSimulation } from '@/lib/engine/simulation';
import { Proposal } from '@/lib/data-structures/proposal';
import { DelegationResolver } from '@/lib/delegation/delegation-resolver';
import { setSeed } from '@/lib/utils/random';

describe('Delegation and Quorum Achievement', () => {
  beforeEach(() => {
    // Use fixed seed for reproducible tests
    setSeed(12345);
  });

  it('should improve effective participation through token delegation', () => {
    const simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    // Create 10 members with varying activity levels
    const activeMembers: DAOMember[] = [];
    const passiveMembers: DAOMember[] = [];

    for (let i = 0; i < 3; i++) {
      const member = new DAOMember(`active_${i}`, simulation, 100, 50, 'North America');
      simulation.dao.addMember(member);
      activeMembers.push(member);
    }

    for (let i = 0; i < 7; i++) {
      const member = new DAOMember(`passive_${i}`, simulation, 100, 10, 'Europe');
      simulation.dao.addMember(member);
      passiveMembers.push(member);
    }

    // Total voting power = 10 * 100 = 1000 tokens
    // With 3 active members voting (300 tokens), quorum might not be met

    // Create a proposal
    const proposal = new Proposal(
      simulation.dao,
      activeMembers[0].uniqueId,
      'Test Governance Proposal',
      'Testing delegation impact on quorum',
      1000,
      100,
      'governance'
    );
    proposal.uniqueId = 'quorum_test_1';
    simulation.dao.proposals.push(proposal);
    proposal.takeVotingPowerSnapshot();

    // SCENARIO 1: No delegation - only active members vote
    // Each active member has 100 tokens
    for (const member of activeMembers) {
      member.voteOnProposal(proposal);
    }

    // Without delegation: 300/1000 = 30% participation
    const votesWithoutDelegation = proposal.votesFor + proposal.votesAgainst;
    expect(votesWithoutDelegation).toBe(300);

    // SCENARIO 2: With delegation - passive members delegate to active
    // Reset for second test
    const simulation2 = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    const activeMembers2: DAOMember[] = [];
    const passiveMembers2: DAOMember[] = [];

    for (let i = 0; i < 3; i++) {
      const member = new DAOMember(`active_${i}`, simulation2, 100, 50, 'North America');
      simulation2.dao.addMember(member);
      activeMembers2.push(member);
    }

    for (let i = 0; i < 7; i++) {
      const member = new DAOMember(`passive_${i}`, simulation2, 100, 10, 'Europe');
      simulation2.dao.addMember(member);
      passiveMembers2.push(member);
    }

    // Passive members delegate 80% of their tokens to active members
    for (let i = 0; i < passiveMembers2.length; i++) {
      const delegateTo = activeMembers2[i % activeMembers2.length];
      passiveMembers2[i].delegate(80, delegateTo);
    }

    const proposal2 = new Proposal(
      simulation2.dao,
      activeMembers2[0].uniqueId,
      'Test Governance Proposal',
      'Testing delegation impact on quorum',
      1000,
      100,
      'governance'
    );
    proposal2.uniqueId = 'quorum_test_2';
    simulation2.dao.proposals.push(proposal2);
    proposal2.takeVotingPowerSnapshot();

    // Active members vote with delegated power
    for (const member of activeMembers2) {
      member.voteOnProposal(proposal2);
    }

    // With delegation: 3 active members each have ~100 + ~187 (from ~2.3 passive each)
    // Total voting power used should be significantly higher
    const votesWithDelegation = proposal2.votesFor + proposal2.votesAgainst;

    // Delegation should increase participation
    expect(votesWithDelegation).toBeGreaterThan(votesWithoutDelegation);
    // With 7 * 80 = 560 delegated tokens + 300 own = 860
    expect(votesWithDelegation).toBe(860);
  });

  it('should maintain cache isolation in multi-DAO scenarios', () => {
    // This tests the P0 fix for the static member cache bug
    const simulation1 = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
    simulation1.dao.daoId = 'dao_alpha';

    const simulation2 = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });
    simulation2.dao.daoId = 'dao_beta';

    // Add members to both DAOs with same uniqueId prefix
    const memberA1 = new DAOMember('member_A', simulation1, 100, 10, 'North America', 'default', 'dao_alpha');
    const memberA2 = new DAOMember('member_A', simulation2, 200, 20, 'Europe', 'default', 'dao_beta');

    simulation1.dao.addMember(memberA1);
    simulation2.dao.addMember(memberA2);

    // Clear any existing cache
    DAOMember.clearMemberLookupCache();

    // Run at same step
    simulation1.currentStep = 5;
    simulation2.currentStep = 5;

    // Create delegations in both DAOs
    const memberB1 = new DAOMember('member_B', simulation1, 50, 5, 'Asia', 'default', 'dao_alpha');
    const memberB2 = new DAOMember('member_B', simulation2, 150, 15, 'Asia', 'default', 'dao_beta');
    simulation1.dao.addMember(memberB1);
    simulation2.dao.addMember(memberB2);

    memberA1.delegate(30, memberB1);
    memberA2.delegate(60, memberB2);

    // Verify voting power is correct for each DAO (cache should be isolated)
    const powerB1 = DelegationResolver.resolveVotingPower(memberB1);
    const powerB2 = DelegationResolver.resolveVotingPower(memberB2);

    // B1 should have: 50 (own) + 30 (from A1) = 80
    expect(powerB1).toBe(80);
    // B2 should have: 150 (own) + 60 (from A2) = 210
    expect(powerB2).toBe(210);

    // Crucially, there should be no cross-contamination
    expect(powerB1).not.toBe(powerB2);
  });

  it('should support liquid delegation representative chains', () => {
    const simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    // Create a delegation chain: voter1 -> voter2 -> expert
    const voter1 = new LiquidDelegator('voter1', simulation, 100, 10, 'North America');
    const voter2 = new LiquidDelegator('voter2', simulation, 100, 20, 'Europe');
    const expert = new DAOMember('expert', simulation, 100, 50, 'Asia');

    simulation.dao.addMember(voter1);
    simulation.dao.addMember(voter2);
    simulation.dao.addMember(expert);

    // Set up chain
    voter1.delegateToMember(voter2);
    voter2.delegateToMember(expert);

    // Verify chain
    const chain = DelegationResolver.getDelegationChain(voter1);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe(voter1);
    expect(chain[1]).toBe(voter2);
    expect(chain[2]).toBe(expert);

    // Terminal representative should be expert
    const terminal = DelegationResolver.getTerminalRepresentative(voter1);
    expect(terminal).toBe(expert);
  });

  it('should handle representative field being set via base class method', () => {
    const simulation = new DAOSimulation({
      num_developers: 0,
      num_investors: 0,
      num_validators: 0,
      num_proposal_creators: 0,
      num_passive_members: 0,
    });

    const member = new DAOMember('member', simulation, 100, 10, 'North America');
    const rep = new DAOMember('rep', simulation, 100, 20, 'Europe');
    simulation.dao.addMember(member);
    simulation.dao.addMember(rep);

    // Use setRepresentative from base class
    member.setRepresentative(rep);

    // Verify bidirectional relationship
    expect(member.representative).toBe(rep);
    expect(rep.delegates).toContain(member);

    // Clear representative
    member.setRepresentative(null);
    expect(member.representative).toBeNull();
    expect(rep.delegates).not.toContain(member);
  });
});

describe('Multi-run Delegation Experiments', () => {
  it('should show delegation consistently improves quorum over multiple runs', () => {
    const NUM_RUNS = 10;
    const quorumWithDelegation: number[] = [];
    const quorumWithoutDelegation: number[] = [];

    for (let run = 0; run < NUM_RUNS; run++) {
      // Set unique seed for each run but reproducible
      setSeed(42 + run);

      // Without delegation
      const simNoDel = new DAOSimulation({
        num_developers: 0,
        num_investors: 0,
        num_validators: 0,
        num_proposal_creators: 0,
        num_passive_members: 0,
      });

      for (let i = 0; i < 5; i++) {
        simNoDel.dao.addMember(new DAOMember(`m${i}`, simNoDel, 100, 10, 'NA'));
      }

      const propNoDel = new Proposal(simNoDel.dao, 'm0', 'Test', 'Desc', 100, 100, 'topic');
      propNoDel.uniqueId = `prop_no_del_${run}`;
      simNoDel.dao.proposals.push(propNoDel);
      propNoDel.takeVotingPowerSnapshot();

      // Simulate 30% voting probability
      for (const m of simNoDel.dao.members) {
        if (Math.random() < 0.3) {
          m.voteOnProposal(propNoDel);
        }
      }
      quorumWithoutDelegation.push(propNoDel.votesFor + propNoDel.votesAgainst);

      // With delegation
      setSeed(42 + run); // Reset seed for fair comparison
      const simWithDel = new DAOSimulation({
        num_developers: 0,
        num_investors: 0,
        num_validators: 0,
        num_proposal_creators: 0,
        num_passive_members: 0,
      });

      const activeM = new DAOMember('active', simWithDel, 100, 50, 'NA');
      simWithDel.dao.addMember(activeM);

      for (let i = 0; i < 4; i++) {
        const passive = new DAOMember(`p${i}`, simWithDel, 100, 10, 'NA');
        simWithDel.dao.addMember(passive);
        passive.delegate(80, activeM); // Delegate 80% to active member
      }

      const propWithDel = new Proposal(simWithDel.dao, 'active', 'Test', 'Desc', 100, 100, 'topic');
      propWithDel.uniqueId = `prop_with_del_${run}`;
      simWithDel.dao.proposals.push(propWithDel);
      propWithDel.takeVotingPowerSnapshot();

      // Active member always votes
      activeM.voteOnProposal(propWithDel);

      // Passive members vote with 30% probability
      for (const m of simWithDel.dao.members) {
        if (m !== activeM && Math.random() < 0.3) {
          m.voteOnProposal(propWithDel);
        }
      }
      quorumWithDelegation.push(propWithDel.votesFor + propWithDel.votesAgainst);
    }

    // Calculate averages
    const avgNoDel = quorumWithoutDelegation.reduce((a, b) => a + b, 0) / NUM_RUNS;
    const avgWithDel = quorumWithDelegation.reduce((a, b) => a + b, 0) / NUM_RUNS;

    // Delegation should improve average participation
    expect(avgWithDel).toBeGreaterThan(avgNoDel);
  });
});
