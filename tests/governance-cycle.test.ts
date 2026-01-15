/**
 * Governance Cycle Tests
 *
 * Tests for Optimism-style structured governance seasons and cycles.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GovernanceCycleController,
  createOptimismGovernanceCycles,
} from '../lib/governance/governance-cycle';
import { EventBus } from '../lib/utils/event-bus';

describe('GovernanceCycleController', () => {
  let controller: GovernanceCycleController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new GovernanceCycleController({
      proposalSubmissionSteps: 48,  // 2 days
      reviewSteps: 72,               // 3 days
      votingSteps: 168,              // 7 days
      executionSteps: 48,            // 2 days
      reflectionSteps: 24,           // 1 day
      cyclesPerSeason: 3,            // 3 cycles per season for testing
      breakBetweenSeasons: 168,
    });
    controller.setEventBus(eventBus);
  });

  describe('startSeason', () => {
    it('should start a new governance season', () => {
      const season = controller.startSeason(
        'Season 1: Growth',
        1000000,
        'OP',
        ['Protocol upgrades', 'Grants'],
        1
      );

      expect(season).toBeDefined();
      expect(season.id).toBeDefined();
      expect(season.title).toBe('Season 1: Growth');
      expect(season.status).toBe('active');
      expect(season.totalBudget).toBe(1000000);
    });

    it('should create first cycle automatically', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      const cycle = controller.getCurrentCycle();
      expect(cycle).toBeDefined();
      expect(cycle?.currentPhase).toBe('proposal_submission');
    });

    it('should emit season_started event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('season_started', (data) => events.push(data));

      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      expect(events.length).toBe(1);
    });
  });

  describe('processCycle', () => {
    it('should transition phases over time', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      // Initially in proposal_submission
      expect(controller.getCurrentCycle()?.currentPhase).toBe('proposal_submission');

      // Process after submission phase (1 + 48 = 49)
      controller.processCycle(50);
      expect(controller.getCurrentCycle()?.currentPhase).toBe('review');

      // Process after review phase (49 + 72 = 121)
      controller.processCycle(125);
      expect(controller.getCurrentCycle()?.currentPhase).toBe('voting');
    });

    it('should emit phase_changed event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('cycle_phase_changed', (data) => events.push(data));

      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.processCycle(50);  // Transition to review

      expect(events.length).toBe(1);
    });

    it('should start next cycle when current ends', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      const firstCycle = controller.getCurrentCycle();

      // Process past entire cycle (48 + 72 + 168 + 48 + 24 = 360)
      controller.processCycle(365);

      const secondCycle = controller.getCurrentCycle();
      expect(secondCycle?.id).not.toBe(firstCycle?.id);
    });

    it('should complete season after all cycles', () => {
      const events: unknown[] = [];
      eventBus.subscribe('season_completed', (data) => events.push(data));

      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      // Cycle length = 48 + 72 + 168 + 48 + 24 = 360
      // With 3 cycles per season = 1080 total
      controller.processCycle(365);   // Complete cycle 1
      controller.processCycle(730);   // Complete cycle 2
      controller.processCycle(1090);  // Complete cycle 3

      expect(events.length).toBe(1);
      expect(controller.getCurrentSeason()).toBeNull();
    });
  });

  describe('registerProposal', () => {
    it('should register proposal during submission phase', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      const result = controller.registerProposal('proposal_1', 5);

      expect(result).toBe(true);
      expect(controller.getCurrentCycle()?.proposalIds.has('proposal_1')).toBe(true);
    });

    it('should reject registration outside submission phase', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.processCycle(50);  // Move to review phase

      const result = controller.registerProposal('proposal_1', 55);

      expect(result).toBe(false);
    });

    it('should emit proposal_registered event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('proposal_registered_for_cycle', (data) => events.push(data));

      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.registerProposal('proposal_1', 5);

      expect(events.length).toBe(1);
    });
  });

  describe('markProposalApproved', () => {
    it('should mark registered proposal as approved', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.registerProposal('proposal_1', 5);

      controller.markProposalApproved('proposal_1', 200);

      expect(controller.getCurrentCycle()?.approvedProposalIds.has('proposal_1')).toBe(true);
    });

    it('should not mark unregistered proposal', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      controller.markProposalApproved('unknown', 200);

      expect(controller.getCurrentCycle()?.approvedProposalIds.has('unknown')).toBe(false);
    });
  });

  describe('markProposalRejected', () => {
    it('should mark registered proposal as rejected', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.registerProposal('proposal_1', 5);

      controller.markProposalRejected('proposal_1', 200);

      expect(controller.getCurrentCycle()?.rejectedProposalIds.has('proposal_1')).toBe(true);
    });
  });

  describe('canSubmitProposal', () => {
    it('should return true during submission phase', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      expect(controller.canSubmitProposal()).toBe(true);
    });

    it('should return false during other phases', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.processCycle(50);  // Move to review
      expect(controller.canSubmitProposal()).toBe(false);
    });

    it('should return true when no season active', () => {
      expect(controller.canSubmitProposal()).toBe(true);
    });
  });

  describe('isVotingActive', () => {
    it('should return true during voting phase', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.processCycle(125);  // Move to voting
      expect(controller.isVotingActive()).toBe(true);
    });

    it('should return false during other phases', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      expect(controller.isVotingActive()).toBe(false);
    });
  });

  describe('getCycleDuration', () => {
    it('should calculate correct cycle duration', () => {
      const duration = controller.getCycleDuration();
      // 48 + 72 + 168 + 48 + 24 = 360
      expect(duration).toBe(360);
    });
  });

  describe('getCyclesForSeason', () => {
    it('should return cycles for a season', () => {
      const season = controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.processCycle(365);  // Complete cycle 1, start cycle 2

      const cycles = controller.getCyclesForSeason(season.id);
      expect(cycles.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);

      const stats = controller.getStats();

      expect(stats.totalSeasons).toBe(1);
      expect(stats.completedSeasons).toBe(0);
      expect(stats.totalCycles).toBe(1);
      expect(stats.currentSeason).toBe(1);
      expect(stats.currentCycle).toBe(1);
      expect(stats.currentPhase).toBe('proposal_submission');
    });
  });

  describe('updateVotingStats', () => {
    it('should update cycle voting statistics', () => {
      controller.startSeason('Season 1', 1000000, 'OP', [], 1);
      controller.updateVotingStats(5000, 0.45);

      const cycle = controller.getCurrentCycle();
      expect(cycle?.totalVotes).toBe(5000);
      expect(cycle?.participationRate).toBe(0.45);
    });
  });
});

describe('createOptimismGovernanceCycles', () => {
  it('should create controller with Optimism defaults', () => {
    const controller = createOptimismGovernanceCycles();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(GovernanceCycleController);

    // Verify cycle duration (360 steps = 15 days)
    expect(controller.getCycleDuration()).toBe(360);
  });
});
