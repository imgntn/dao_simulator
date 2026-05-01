import { describe, expect, it } from 'vitest';
import type { DAOMember } from '../lib/agents/base';
import { DAO } from '../lib/data-structures/dao';
import { Proposal } from '../lib/data-structures/proposal';

function member(uniqueId: string, tokens: number, stakedTokens: number = 0): DAOMember {
  return {
    uniqueId,
    tokens,
    stakedTokens,
    delegations: new Map(),
    delegates: [],
  } as unknown as DAOMember;
}

describe('Proposal lifecycle invariants', () => {
  it('sanitizes constructor funding and duration inputs', () => {
    const dao = new DAO('Proposal DAO');
    const proposal = new Proposal(dao, 'creator', 'Bad inputs', 'desc', Number.NaN, -10);

    expect(proposal.fundingGoal).toBe(0);
    expect(proposal.duration).toBe(0);
    expect(proposal.votingPeriod).toBe(0);
  });

  it('rejects invalid vote choices and weights without mutating totals', () => {
    const dao = new DAO('Proposal DAO');
    const proposal = new Proposal(dao, 'creator', 'Vote safety', 'desc', 0, 10);

    expect(proposal.addVote('alice', true, Number.NaN)).toBe(false);
    expect(proposal.addVote('alice', true, Number.POSITIVE_INFINITY)).toBe(false);
    expect(proposal.addVote('alice', true, -1)).toBe(false);
    expect(proposal.addVote('alice', 'invalid' as unknown as boolean, 1)).toBe(false);

    expect(proposal.votes.size).toBe(0);
    expect(proposal.votesFor).toBe(0);
    expect(proposal.votesAgainst).toBe(0);
    expect(proposal.votesAbstain).toBe(0);
  });

  it('sanitizes snapshot power and prevents post-snapshot over-voting', () => {
    const dao = new DAO('Proposal DAO');
    dao.addMember(member('alice', 10));
    dao.addMember(member('bob', Number.NaN, 5));
    const proposal = new Proposal(dao, 'creator', 'Snapshot safety', 'desc', 0, 10);

    proposal.takeVotingPowerSnapshot();

    expect(proposal.totalSupplySnapshot).toBe(15);
    expect(proposal.getSnapshotVotingPower('alice')).toBe(10);
    expect(proposal.getSnapshotVotingPower('bob')).toBe(0);
    expect(proposal.addVote('alice', true, 100)).toBe(true);
    expect(proposal.votesFor).toBe(10);
    expect(proposal.addVote('bob', true, 5)).toBe(false);
    expect(proposal.addVote('carol', true, 5)).toBe(false);
  });

  it('ignores invalid delegated support and investment updates', () => {
    const dao = new DAO('Proposal DAO');
    const proposal = new Proposal(dao, 'creator', 'Funding safety', 'desc', 100, 10);

    proposal.receiveDelegatedSupport('alice', 10);
    proposal.receiveDelegatedSupport('alice', Number.NaN);
    proposal.receiveDelegatedSupport('alice', -5);
    proposal.receiveInvestment('investor', 25);
    proposal.receiveInvestment('investor', Number.POSITIVE_INFINITY);
    proposal.receiveInvestment('investor', -10);

    expect(proposal.delegatedSupport.get('alice')).toBe(10);
    expect(proposal.currentFunding).toBe(25);
  });

  it('sanitizes checkpoint restoration state', () => {
    const dao = new DAO('Proposal DAO');
    const restored = Proposal.fromDict({
      status: 'corrupted',
      fundingGoal: Number.NaN,
      duration: -1,
      votesFor: Number.NaN,
      votesAgainst: -10,
      votesAbstain: 3,
      currentFunding: Number.POSITIVE_INFINITY,
      creationTime: -5,
      lastActivityStep: Number.NaN,
      resolvedTime: -99,
      votingPeriod: Number.NaN,
      bondAmount: -20,
      votingPowerSnapshot: {
        alice: 10,
        bob: Number.NaN,
        carol: -5,
      },
      totalSupplySnapshot: Number.POSITIVE_INFINITY,
      snapshotTaken: true,
    }, dao);

    expect(restored.status).toBe('open');
    expect(restored.fundingGoal).toBe(0);
    expect(restored.duration).toBe(0);
    expect(restored.votesFor).toBe(0);
    expect(restored.votesAgainst).toBe(0);
    expect(restored.votesAbstain).toBe(3);
    expect(restored.currentFunding).toBe(0);
    expect(restored.creationTime).toBe(0);
    expect(restored.lastActivityStep).toBe(0);
    expect(restored.resolvedTime).toBe(0);
    expect(restored.votingPeriod).toBe(0);
    expect(restored.bondAmount).toBe(0);
    expect(restored.getSnapshotVotingPower('alice')).toBe(10);
    expect(restored.getSnapshotVotingPower('bob')).toBe(0);
    expect(restored.getSnapshotVotingPower('carol')).toBe(0);
    expect(restored.totalSupplySnapshot).toBe(0);
    expect(restored.snapshotTaken).toBe(true);
  });
});
