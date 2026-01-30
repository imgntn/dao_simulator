import { describe, it, expect } from 'vitest';
import { DAO } from '../lib/data-structures/dao';
import { GovernanceHouse, type HouseConfig } from '../lib/data-structures/governance-house';

describe('GovernanceHouse quorum', () => {
  it('uses total participation for quorum checks', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 50,
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };

    const house = new GovernanceHouse(dao, config);
    house.addMember('member-a', 50);
    house.addMember('member-b', 50);

    house.vote('member-a', 'proposal-1', true, 40);
    house.vote('member-b', 'proposal-1', false, 30);

    const result = house.getVoteResult('proposal-1');
    expect(result.quorumMet).toBe(true);
  });
});
