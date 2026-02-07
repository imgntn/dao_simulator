import { DAO } from '@/lib/data-structures/dao';
import { SimpleDataCollector } from '@/lib/engine/data-collector';

describe('SimpleDataCollector', () => {
  it('records history snapshots with treasury data', () => {
    const dao = new DAO('TestDAO');
    dao.currentStep = 1;
    dao.proposals = [{}, {}] as any;
    dao.projects = [{}] as any;
    dao.members = [
      { tokens: 100, reputation: 10, delegations: new Map(), uniqueId: 'member_1' },
    ] as any;
    dao.treasury.deposit('DAO_TOKEN', 500, dao.currentStep);

    // Pass collectionInterval=1 to collect every step (default is 10 for performance)
    const collector = new SimpleDataCollector(dao, 1, 1);
    collector.collect(dao);
    dao.currentStep = 2;
    dao.members.push({ tokens: 50, reputation: 5, delegations: new Map(), uniqueId: 'member_2' } as any);
    collector.collect(dao);

    expect(collector.history).toHaveLength(2);
    const latest = collector.history.at(-1);
    expect(latest).toMatchObject({
      step: 2,
      memberCount: 2,
      proposalCount: 2,
      projectCount: 1,
    });
    expect(typeof latest?.tokenPrice).toBe('number');
    expect(typeof latest?.treasuryFunds).toBe('number');
  });
});
