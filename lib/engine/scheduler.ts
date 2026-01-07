// Scheduler implementation - replacement for Mesa's activation schedulers

import type { Agent, Scheduler } from '@/types/simulation';

/**
 * Base scheduler with optimized agent management using Set for O(1) lookups
 */
abstract class BaseScheduler implements Scheduler {
  protected agentSet: Set<Agent> = new Set();
  steps: number = 0;

  get agents(): Agent[] {
    return Array.from(this.agentSet);
  }

  set agents(value: Agent[]) {
    this.agentSet = new Set(value);
  }

  add(agent: Agent): void {
    this.agentSet.add(agent);
  }

  remove(agent: Agent): void {
    this.agentSet.delete(agent);
  }

  has(agent: Agent): boolean {
    return this.agentSet.has(agent);
  }

  get agentCount(): number {
    return this.agentSet.size;
  }

  abstract step(): void | Promise<void>;
}

/**
 * Random activation scheduler - activates agents in order each step
 * Replacement for Mesa's RandomActivation
 */
export class RandomActivation extends BaseScheduler {
  step(): void {
    // Create a copy to avoid issues if agents are added/removed during iteration
    const agentsCopy = Array.from(this.agentSet);
    for (const agent of agentsCopy) {
      if (agent && typeof agent.step === 'function') {
        agent.step();
      }
    }
    this.steps++;
  }
}

/**
 * Parallel activation scheduler - executes agent steps concurrently
 * Replacement for Mesa's ParallelActivation using Promise.all
 * Note: step() is async and MUST be awaited by caller
 */
export class ParallelActivation extends BaseScheduler {
  private workers: number;

  constructor(workers?: number) {
    super();
    this.workers = workers || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4;
  }

  async step(): Promise<void> {
    // Create a copy to avoid issues if agents are added/removed during iteration
    const agentsCopy = Array.from(this.agentSet);
    const chunkSize = Math.ceil(agentsCopy.length / this.workers);
    const chunks: Agent[][] = [];

    for (let i = 0; i < agentsCopy.length; i += chunkSize) {
      chunks.push(agentsCopy.slice(i, i + chunkSize));
    }

    // Execute chunks in parallel and AWAIT the result
    await Promise.all(
      chunks.map(chunk =>
        Promise.all(
          chunk.map(agent => {
            if (agent && typeof agent.step === 'function') {
              try {
                return Promise.resolve(agent.step());
              } catch (error) {
                console.error(`Agent ${agent.uniqueId} step failed:`, error);
                return Promise.resolve();
              }
            }
            return Promise.resolve();
          })
        )
      )
    );

    this.steps++;
  }
}

/**
 * Async activation scheduler - executes agent steps asynchronously
 * Replacement for Mesa's AsyncActivation
 * Note: step() is async and MUST be awaited by caller
 */
export class AsyncActivation extends BaseScheduler {
  async step(): Promise<void> {
    const agentsCopy = Array.from(this.agentSet);
    const tasks = agentsCopy.map(agent => {
      if (agent && typeof agent.step === 'function') {
        try {
          return Promise.resolve(agent.step());
        } catch (error) {
          console.error(`Agent ${agent.uniqueId} step failed:`, error);
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    });

    await Promise.all(tasks);
    this.steps++;
  }
}

/**
 * Staged activation scheduler - activates agents by type in stages
 * Useful when certain agent types should act before others
 */
export class StagedActivation extends BaseScheduler {
  private stages: Map<string, Set<Agent>> = new Map();
  private stageOrder: string[] = [];

  constructor(stageOrder: string[] = []) {
    super();
    this.stageOrder = stageOrder;
  }

  add(agent: Agent): void {
    super.add(agent);
    const agentType = agent.constructor.name;
    if (!this.stages.has(agentType)) {
      this.stages.set(agentType, new Set());
      // Add to stage order if not already there
      if (!this.stageOrder.includes(agentType)) {
        this.stageOrder.push(agentType);
      }
    }
    this.stages.get(agentType)!.add(agent);
  }

  remove(agent: Agent): void {
    super.remove(agent);
    const agentType = agent.constructor.name;
    this.stages.get(agentType)?.delete(agent);
  }

  step(): void {
    // Execute each stage in order
    for (const stage of this.stageOrder) {
      const stageAgents = this.stages.get(stage);
      if (stageAgents) {
        for (const agent of stageAgents) {
          if (agent && typeof agent.step === 'function') {
            agent.step();
          }
        }
      }
    }
    this.steps++;
  }
}
