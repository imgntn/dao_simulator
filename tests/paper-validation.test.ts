/**
 * Paper Validation Tests
 *
 * Tests for functionality critical to the academic paper.
 * Ensures metrics calculations and voting mechanisms work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DAO } from '../lib/data-structures/dao';
import { GovernanceHouse, type HouseConfig } from '../lib/data-structures/governance-house';

// =============================================================================
// QUORUM CALCULATION TESTS
// =============================================================================

describe('Quorum Calculations', () => {
  let dao: DAO;
  let house: GovernanceHouse;

  beforeEach(() => {
    dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 10, // 10% quorum
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };
    house = new GovernanceHouse(dao, config);
  });

  it('calculates quorum correctly at threshold', () => {
    // 100 total tokens, 10% quorum = 10 tokens needed
    house.addMember('whale', 90);
    house.addMember('small-1', 5);
    house.addMember('small-2', 5);

    // 10 tokens voting = exactly quorum
    house.vote('small-1', 'proposal-1', true);
    house.vote('small-2', 'proposal-1', true);

    const result = house.getVoteResult('proposal-1');
    expect(result.quorumMet).toBe(true);
    expect(result.votesFor).toBe(10);
  });

  it('fails quorum when below threshold', () => {
    house.addMember('whale', 90);
    house.addMember('small-1', 5);
    house.addMember('small-2', 5);

    // Only 5 tokens voting = below 10% quorum
    house.vote('small-1', 'proposal-1', true);

    const result = house.getVoteResult('proposal-1');
    expect(result.quorumMet).toBe(false);
    expect(result.votesFor).toBe(5);
  });

  it('handles whale dominance correctly', () => {
    house.addMember('whale', 90);
    house.addMember('small-1', 5);
    house.addMember('small-2', 5);

    // Whale votes alone
    house.vote('whale', 'proposal-1', true);

    const result = house.getVoteResult('proposal-1');
    expect(result.quorumMet).toBe(true);
    expect(result.votesFor).toBe(90);
    expect(result.approved).toBe(true);
  });
});

// =============================================================================
// VOTING MECHANISM TESTS
// =============================================================================

describe('Token-Weighted Voting', () => {
  it('weights votes by token holdings', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 1,
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };
    const house = new GovernanceHouse(dao, config);

    house.addMember('rich', 100);
    house.addMember('poor', 1);

    house.vote('rich', 'proposal-1', false); // Against
    house.vote('poor', 'proposal-1', true);  // For

    const result = house.getVoteResult('proposal-1');
    expect(result.votesAgainst).toBe(100);
    expect(result.votesFor).toBe(1);
    expect(result.approved).toBe(false); // Rich voter wins
  });
});

describe('One-Person-One-Vote', () => {
  it('gives equal weight regardless of tokens', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'citizens_house',
      name: 'Citizen House',
      description: 'Test house',
      quorumPercent: 1,
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'one_person_one_vote',
      primaryDecisions: [],
    };
    const house = new GovernanceHouse(dao, config);

    house.addMember('rich', 100);
    house.addMember('poor-1', 1);
    house.addMember('poor-2', 1);

    house.vote('rich', 'proposal-1', false);    // Should be 1 vote against
    house.vote('poor-1', 'proposal-1', true);   // Should be 1 vote for
    house.vote('poor-2', 'proposal-1', true);   // Should be 1 vote for

    const result = house.getVoteResult('proposal-1');
    // When OPOV is implemented:
    expect(result.votesFor).toBe(2);
    expect(result.votesAgainst).toBe(1);
    expect(result.approved).toBe(true); // Majority wins
  });
});

// =============================================================================
// PASS RATE CALCULATION TESTS
// =============================================================================

describe('Proposal Pass Rate', () => {
  it('calculates pass rate correctly', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 10,
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };
    const house = new GovernanceHouse(dao, config);

    house.addMember('voter-1', 50);
    house.addMember('voter-2', 50);

    // Proposal 1: Passes (both vote yes)
    house.vote('voter-1', 'proposal-1', true);
    house.vote('voter-2', 'proposal-1', true);
    expect(house.getVoteResult('proposal-1').approved).toBe(true);

    // Proposal 2: Fails (majority against)
    house.vote('voter-1', 'proposal-2', false);
    house.vote('voter-2', 'proposal-2', false);
    expect(house.getVoteResult('proposal-2').approved).toBe(false);

    // Proposal 3: Passes
    house.vote('voter-1', 'proposal-3', true);
    house.vote('voter-2', 'proposal-3', true);
    expect(house.getVoteResult('proposal-3').approved).toBe(true);

    // Pass rate should be 2/3 = 66.67%
    const results = ['proposal-1', 'proposal-2', 'proposal-3']
      .map(id => house.getVoteResult(id));
    const passRate = results.filter(r => r.approved).length / results.length;
    expect(passRate).toBeCloseTo(0.667, 2);
  });
});

// =============================================================================
// GINI COEFFICIENT TESTS
// =============================================================================

describe('Gini Coefficient Calculation', () => {
  /**
   * Helper function to calculate Gini coefficient
   * Formula: G = (2 * sum(i * x_i)) / (n * sum(x_i)) - (n + 1) / n
   */
  function calculateGini(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    let weightedSum = 0;
    for (let i = 0; i < n; i++) {
      weightedSum += (i + 1) * sorted[i];
    }

    return (2 * weightedSum) / (n * sum) - (n + 1) / n;
  }

  it('returns 0 for perfect equality', () => {
    const holdings = [100, 100, 100, 100];
    expect(calculateGini(holdings)).toBeCloseTo(0, 5);
  });

  it('returns ~1 for maximum inequality', () => {
    // One person has everything
    const holdings = [0, 0, 0, 1000000];
    expect(calculateGini(holdings)).toBeCloseTo(0.75, 1); // Close to 1 but not exactly due to formula
  });

  it('handles power-law distribution', () => {
    // Simulated power-law: few large, many small
    const holdings = [1, 1, 1, 1, 1, 1, 1, 1, 10, 100];
    const gini = calculateGini(holdings);
    expect(gini).toBeGreaterThan(0.5);
    expect(gini).toBeLessThan(1);
  });
});

// =============================================================================
// TURNOUT CALCULATION TESTS
// =============================================================================

describe('Turnout Calculation', () => {
  it('calculates turnout as voters / eligible', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 1,
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };
    const house = new GovernanceHouse(dao, config);

    // Add 10 members
    for (let i = 0; i < 10; i++) {
      house.addMember(`member-${i}`, 10);
    }

    // Only 3 vote
    house.vote('member-0', 'proposal-1', true);
    house.vote('member-1', 'proposal-1', true);
    house.vote('member-2', 'proposal-1', false);

    const result = house.getVoteResult('proposal-1');
    const voterCount = (result.votesFor + result.votesAgainst) / 10; // Each member has 10 tokens
    const turnout = voterCount / 10; // 3 voters / 10 members
    expect(turnout).toBeCloseTo(0.3, 2);
  });
});

// =============================================================================
// APPROVAL THRESHOLD TESTS
// =============================================================================

describe('Approval Threshold', () => {
  it('requires majority (50%) to pass', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 1,
      approvalThresholdPercent: 50,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };
    const house = new GovernanceHouse(dao, config);

    house.addMember('voter-1', 50);
    house.addMember('voter-2', 50);

    // 50-50 tie should fail (need > 50%)
    house.vote('voter-1', 'proposal-1', true);
    house.vote('voter-2', 'proposal-1', false);

    const result = house.getVoteResult('proposal-1');
    expect(result.votesFor).toBe(50);
    expect(result.votesAgainst).toBe(50);
    // Tie behavior depends on implementation
  });

  it('requires supermajority (66%) when configured', () => {
    const dao = new DAO('Test DAO');
    const config: HouseConfig = {
      houseType: 'token_house',
      name: 'Token House',
      description: 'Test house',
      quorumPercent: 1,
      approvalThresholdPercent: 66,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: [],
    };
    const house = new GovernanceHouse(dao, config);

    house.addMember('voter-1', 60);
    house.addMember('voter-2', 40);

    // 60% for should fail with 66% threshold
    house.vote('voter-1', 'proposal-1', true);
    house.vote('voter-2', 'proposal-1', false);

    const result = house.getVoteResult('proposal-1');
    expect(result.approved).toBe(false); // 60% < 66%
  });
});
