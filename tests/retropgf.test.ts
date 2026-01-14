/**
 * RetroPGF Tests
 *
 * Tests for Optimism's Retroactive Public Goods Funding system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RetroPGFController,
  createOptimismRetroPGF,
  type RetroPGFRound,
  type RetroPGFProject,
} from '../lib/governance/retropgf';
import { EventBus } from '../lib/utils/event-bus';

describe('RetroPGFController', () => {
  let controller: RetroPGFController;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus(false);
    controller = new RetroPGFController({
      nominationPeriodSteps: 30,
      votingPeriodSteps: 50,
      minProjectsToAllocate: 1,
    });
    controller.setEventBus(eventBus);
  });

  describe('createRound', () => {
    it('should create a new RetroPGF round', () => {
      const round = controller.createRound(
        'Round 1',
        'First RetroPGF round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2', 'citizen_3'],
        1
      );

      expect(round).toBeDefined();
      expect(round.title).toBe('Round 1');
      expect(round.totalBudget).toBe(1000000);
      expect(round.status).toBe('nominations');
    });

    it('should emit round_created event', () => {
      const events: unknown[] = [];
      eventBus.subscribe('retropgf_round_created', (data) => events.push(data));

      controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      expect(events.length).toBe(1);
    });
  });

  describe('nominateProject', () => {
    it('should allow nominating a project', () => {
      const round = controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      const project = controller.nominateProject(
        round.id,
        'citizen_1',
        'Project Alpha',
        'A great public goods project',
        'infrastructure',
        'This project helped many people',
        5
      );

      expect(project).toBeDefined();
      expect(project?.name).toBe('Project Alpha');
    });

    it('should reject nominations when no active round exists', () => {
      const project = controller.nominateProject(
        'invalid_round',
        'citizen_1',
        'Project Alpha',
        'A great public goods project',
        'infrastructure',
        'This project helped many people',
        5
      );

      expect(project).toBeNull();
    });

    it('should reject nominations outside nomination period', () => {
      const round = controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      // Process to move past nomination period (step 35, nomination ends at 31)
      controller.processRound(round.id, 35);

      const project = controller.nominateProject(
        round.id,
        'citizen_1',
        'Project Alpha',
        'A great public goods project',
        'infrastructure',
        'This project helped many people',
        40
      );

      expect(project).toBeNull();
    });
  });

  describe('submitAllocation', () => {
    it('should allow citizens to submit allocations during voting', () => {
      const round = controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      const project = controller.nominateProject(
        round.id,
        'citizen_1',
        'Project Alpha',
        'Description',
        'infrastructure',
        'Impact statement',
        5
      );

      // Move to voting period
      controller.processRound(round.id, 35);

      const allocations = new Map<string, number>();
      allocations.set(project!.id, 10000);

      const result = controller.submitAllocation(
        round.id,
        'citizen_2',
        allocations,
        40
      );

      expect(result).toBe(true);
    });

    it('should reject allocations outside voting period', () => {
      const round = controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      const project = controller.nominateProject(
        round.id,
        'citizen_1',
        'Project Alpha',
        'Description',
        'infrastructure',
        'Impact statement',
        5
      );

      // Still in nomination period
      const allocations = new Map<string, number>();
      allocations.set(project!.id, 10000);

      const result = controller.submitAllocation(
        round.id,
        'citizen_2',
        allocations,
        10
      );

      expect(result).toBe(false);
    });
  });

  describe('processRound', () => {
    it('should transition round through phases', () => {
      const round = controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      // Nominations phase
      expect(round.status).toBe('nominations');

      // Move to voting (nomination ends at step 31)
      controller.processRound(round.id, 35);
      const updated1 = controller.getRound(round.id);
      expect(updated1?.status).toBe('voting');

      // Move to distribution (voting ends at step 81)
      controller.processRound(round.id, 85);
      const updated2 = controller.getRound(round.id);
      expect(updated2?.status).toBe('distribution');
    });
  });

  describe('getRoundResults', () => {
    it('should return round results', () => {
      const round = controller.createRound(
        'Round 1',
        'First round',
        1000000,
        'OP',
        ['citizen_1', 'citizen_2'],
        1
      );

      controller.nominateProject(
        round.id,
        'citizen_1',
        'P1',
        'Project 1',
        'infrastructure',
        'Impact',
        5
      );

      const results = controller.getRoundResults(round.id);

      expect(results).toBeDefined();
      expect(results?.projects).toHaveLength(1);
    });
  });
});

describe('createOptimismRetroPGF', () => {
  it('should create controller with Optimism defaults', () => {
    const controller = createOptimismRetroPGF();

    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(RetroPGFController);
  });
});
