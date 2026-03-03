// Base Model class - replacement for Mesa's Model

import type { Model as IModel, Scheduler } from '@/types/simulation';
import type { DAO } from '../data-structures/dao';
import { RandomActivation } from './scheduler';

/**
 * Base Model class for agent-based simulations
 * Replacement for Mesa's Model class
 */
export abstract class Model implements IModel {
  currentStep: number = 0;
  schedule: Scheduler;

  constructor(scheduler?: Scheduler) {
    this.schedule = scheduler || new RandomActivation();
  }

  /**
   * Execute one step of the simulation
   */
  abstract step(): void;

  /**
   * Run the simulation for a specified number of steps
   */
  run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }
}

/**
 * Model interface with DAO property - used by agents
 */
export interface DAOModel extends IModel {
  dao: DAO;
  eventBus: import('../utils/event-bus').EventBus;
  forumSimulation?: { getVotingBias(proposalId: string): number } | null;
  governanceRuleName?: string;
  /** Aggregate belief shift from active black swan events (default 0) */
  currentBeliefShift?: number;
  /** Temporary participation drop from active black swan events (default 0) */
  currentParticipationDrop?: number;
}
