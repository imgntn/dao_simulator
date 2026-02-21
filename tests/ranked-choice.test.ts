/**
 * Tests for Ranked Choice Voting (IRV) mechanism
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InstantRunoffRule } from '@/lib/utils/governance-plugins';
import {
  RankedChoiceVotingStrategy,
  getStrategy,
} from '@/lib/utils/voting-strategies';
import { Proposal } from '@/lib/data-structures/proposal';

// =============================================================================
// InstantRunoffRule Unit Tests
// =============================================================================

describe('InstantRunoffRule', () => {
  let rule: InstantRunoffRule;

  beforeEach(() => {
    rule = new InstantRunoffRule();
  });

  describe('runIRV', () => {
    it('returns winner with clear majority on first round', () => {
      const ballots = new Map<string, string[]>();
      ballots.set('a1', ['A', 'B', 'C']);
      ballots.set('a2', ['A', 'C', 'B']);
      ballots.set('a3', ['A', 'B', 'C']);
      ballots.set('a4', ['B', 'A', 'C']);
      ballots.set('a5', ['C', 'B', 'A']);

      // A has 3/5 = 60% > 50% — wins immediately
      const winner = rule.runIRV(ballots, new Set(['A', 'B', 'C']));
      expect(winner).toBe('A');
    });

    it('eliminates lowest and redistributes', () => {
      const ballots = new Map<string, string[]>();
      // Round 1: A=2, B=2, C=1 → C eliminated
      // Round 2: C's voter preferred B → B=3, A=2 → B wins
      ballots.set('a1', ['A', 'B', 'C']);
      ballots.set('a2', ['A', 'C', 'B']);
      ballots.set('a3', ['B', 'A', 'C']);
      ballots.set('a4', ['B', 'C', 'A']);
      ballots.set('a5', ['C', 'B', 'A']); // C eliminated → goes to B

      const winner = rule.runIRV(ballots, new Set(['A', 'B', 'C']));
      expect(winner).toBe('B');
    });

    it('handles two-candidate race', () => {
      const ballots = new Map<string, string[]>();
      ballots.set('a1', ['X', 'Y']);
      ballots.set('a2', ['Y', 'X']);
      ballots.set('a3', ['X', 'Y']);

      const winner = rule.runIRV(ballots, new Set(['X', 'Y']));
      expect(winner).toBe('X');
    });

    it('handles single remaining candidate after eliminations', () => {
      const ballots = new Map<string, string[]>();
      // A=1, B=1, C=1, D=2 → eliminate one with fewest
      // Multiple rounds of elimination
      ballots.set('a1', ['A', 'D', 'C', 'B']);
      ballots.set('a2', ['B', 'D', 'A', 'C']);
      ballots.set('a3', ['C', 'D', 'A', 'B']);
      ballots.set('a4', ['D', 'A', 'B', 'C']);
      ballots.set('a5', ['D', 'B', 'A', 'C']);

      const winner = rule.runIRV(ballots, new Set(['A', 'B', 'C', 'D']));
      expect(winner).toBe('D'); // D gets majority after eliminations
    });

    it('returns null for empty ballots', () => {
      const ballots = new Map<string, string[]>();
      const winner = rule.runIRV(ballots, new Set(['A', 'B']));
      expect(winner).toBeNull();
    });

    it('handles ballots with exhausted preferences', () => {
      const ballots = new Map<string, string[]>();
      // Some voters only rank 1 option
      ballots.set('a1', ['A']);
      ballots.set('a2', ['B']);
      ballots.set('a3', ['C', 'B']); // Only ranks C and B

      // Round 1: A=1, B=1, C=1 → eliminate one (A first alphabetically due to Map order)
      // a1's ballot is exhausted after A eliminated
      // Round 2: B=1, C=1 — tie, eliminate first found
      const winner = rule.runIRV(ballots, new Set(['A', 'B', 'C']));
      expect(winner).toBeDefined();
      // Winner should be one of the candidates
      expect(['A', 'B', 'C']).toContain(winner);
    });
  });

  describe('approve (with proposal)', () => {
    it('falls back to majority when no ballots present', () => {
      // Create a mock proposal/dao
      const mockDao = {
        members: [{ uniqueId: 'a1' }, { uniqueId: 'a2' }],
        daoId: 'test',
      } as any;
      const proposal = new Proposal(mockDao, 'creator', 'Test', 'desc', 0, 10);
      proposal.votesFor = 5;
      proposal.votesAgainst = 3;

      expect(rule.approve(proposal, mockDao)).toBe(true);
    });

    it('uses IRV when ballots are present', () => {
      const mockDao = {
        members: [
          { uniqueId: 'a1' },
          { uniqueId: 'a2' },
          { uniqueId: 'a3' },
        ],
        daoId: 'test',
      } as any;
      const proposal = new Proposal(mockDao, 'creator', 'Test', 'desc', 0, 10);
      proposal.options = ['Approve', 'Reject', 'Defer'];

      // Set up ballots
      proposal.ballots.set('a1', ['Approve', 'Defer', 'Reject']);
      proposal.ballots.set('a2', ['Approve', 'Reject', 'Defer']);
      proposal.ballots.set('a3', ['Reject', 'Approve', 'Defer']);

      // Approve has 2/3 first-choice votes = 66% > 50% → approved
      expect(rule.approve(proposal, mockDao)).toBe(true);
    });
  });
});

// =============================================================================
// RankedChoiceVotingStrategy Tests
// =============================================================================

describe('RankedChoiceVotingStrategy', () => {
  it('is registered in the strategy registry', () => {
    const strategy = getStrategy('ranked-choice');
    expect(strategy).toBeDefined();
    expect(strategy).toBeInstanceOf(RankedChoiceVotingStrategy);
  });

  it('records standard vote when no options set', () => {
    const strategy = new RankedChoiceVotingStrategy();
    const mockDao = {
      members: [],
      daoId: 'test',
      currentStep: 1,
      eventBus: null,
    } as any;
    const proposal = new Proposal(mockDao, 'creator', 'Test', 'desc', 0, 10);
    proposal.uniqueId = 'p1';

    const member = {
      uniqueId: 'a1',
      optimism: 0.7,
      model: { currentStep: 1, eventBus: null, dao: mockDao, forumSimulation: null },
      votes: new Map(),
      calibratedVotingProbability: undefined,
      oppositionBias: 0,
      decideVote: () => 'yes' as const,
    } as any;

    strategy.vote(member, proposal);
    // Should have a standard vote recorded
    expect(member.votes.has('p1')).toBe(true);
  });

  it('submits ranked ballot when options are set', () => {
    const strategy = new RankedChoiceVotingStrategy();
    const mockDao = {
      members: [],
      daoId: 'test',
      currentStep: 1,
      eventBus: null,
    } as any;
    const proposal = new Proposal(mockDao, 'creator', 'Test', 'desc', 0, 10);
    proposal.uniqueId = 'p1';
    proposal.options = ['Option A', 'Option B', 'Option C'];

    const member = {
      uniqueId: 'a1',
      optimism: 0.5,
      model: { currentStep: 1, eventBus: null, dao: mockDao, forumSimulation: null },
      votes: new Map(),
      calibratedVotingProbability: undefined,
      oppositionBias: 0,
      decideVote: () => 'yes' as const,
    } as any;

    strategy.vote(member, proposal);

    // Should have a ranked ballot
    expect(proposal.ballots.has('a1')).toBe(true);
    const rankings = proposal.ballots.get('a1')!;
    expect(rankings).toHaveLength(3);
    // All options should be present in some order
    expect(new Set(rankings)).toEqual(new Set(['Option A', 'Option B', 'Option C']));
  });
});
