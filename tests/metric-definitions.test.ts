import { describe, expect, it } from 'vitest';
import { DAO } from '../lib/data-structures/dao';
import { Proposal } from '../lib/data-structures/proposal';
import { DAOMember } from '../lib/agents/base';
import {
  delegationConcentrationHhi,
  proposalReachedQuorum,
  proposalTurnout,
  wealthRankMobility,
} from '../lib/research/metric-definitions';

describe('publication metric definitions', () => {
  it('uses proposal-time supply and quorum snapshots', () => {
    const dao = new DAO('Metric DAO');
    dao.governanceQuorumPercentage = 0.2;
    const proposal = new Proposal(dao, 'creator', 'Title', 'Description', 0, 10);
    proposal.snapshotTaken = true;
    proposal.totalSupplySnapshot = 100;
    proposal.quorumThresholdSnapshot = 0.2;
    proposal.votesFor = 15;
    proposal.votesAgainst = 5;
    expect(proposalTurnout(proposal, 1000)).toBe(0.2);
    expect(proposalReachedQuorum(proposal, 1000, 0.8)).toBe(true);
  });

  it('calculates delegation HHI from incoming delegated balances', () => {
    const dao = new DAO('Metric DAO');
    const model = { dao } as never;
    const a = new DAOMember('a', model, 10, 0, 'main');
    const b = new DAOMember('b', model, 10, 0, 'main');
    const c = new DAOMember('c', model, 10, 0, 'main');
    a.delegations.set('c', 5);
    b.delegations.set('c', 5);
    expect(delegationConcentrationHhi([a, b, c])).toBe(1);
    b.delegations.clear();
    b.delegations.set('a', 5);
    expect(delegationConcentrationHhi([a, b, c])).toBe(0.5);
  });

  it('measures longitudinal rank displacement rather than equality', () => {
    const dao = new DAO('Metric DAO');
    const model = { dao } as never;
    const a = new DAOMember('a', model, 30, 0, 'main');
    const b = new DAOMember('b', model, 20, 0, 'main');
    const c = new DAOMember('c', model, 10, 0, 'main');
    const initial = new Map([['a', 30], ['b', 20], ['c', 10]]);
    expect(wealthRankMobility(initial, [a, b, c])).toBe(0);
    a.tokens = 10;
    c.tokens = 30;
    expect(wealthRankMobility(initial, [a, b, c])).toBe(1);
  });
});
