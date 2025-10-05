// Scheduler implementation - replacement for Mesa's activation schedulers

import type { Agent, Scheduler } from '@/types/simulation';

/**
 * Random activation scheduler - activates agents in order each step
 * Replacement for Mesa's RandomActivation
 */
export class RandomActivation implements Scheduler {
  agents: Agent[] = [];
  steps: number = 0;

  add(agent: Agent): void {
    this.agents.push(agent);
  }

  remove(agent: Agent): void {
    const index = this.agents.indexOf(agent);
    if (index > -1) {
      this.agents.splice(index, 1);
    }
  }

  step(): void {
    // Create a copy to avoid issues if agents are added/removed during iteration
    const agentsCopy = [...this.agents];
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
 * Replacement for Mesa's ParallelActivation using Workers
 */
export class ParallelActivation implements Scheduler {
  agents: Agent[] = [];
  steps: number = 0;
  private workers: number;

  constructor(workers?: number) {
    this.workers = workers || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4;
  }

  add(agent: Agent): void {
    this.agents.push(agent);
  }

  remove(agent: Agent): void {
    const index = this.agents.indexOf(agent);
    if (index > -1) {
      this.agents.splice(index, 1);
    }
  }

  step(): void {
    // For parallel execution, we'll use Promise.all with chunks
    const agentsCopy = [...this.agents];
    const chunkSize = Math.ceil(agentsCopy.length / this.workers);
    const chunks: Agent[][] = [];

    for (let i = 0; i < agentsCopy.length; i += chunkSize) {
      chunks.push(agentsCopy.slice(i, i + chunkSize));
    }

    // Execute chunks in parallel
    Promise.all(
      chunks.map(chunk =>
        Promise.all(
          chunk.map(agent => {
            if (agent && typeof agent.step === 'function') {
              return Promise.resolve(agent.step());
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
 */
export class AsyncActivation implements Scheduler {
  agents: Agent[] = [];
  steps: number = 0;

  add(agent: Agent): void {
    this.agents.push(agent);
  }

  remove(agent: Agent): void {
    const index = this.agents.indexOf(agent);
    if (index > -1) {
      this.agents.splice(index, 1);
    }
  }

  async step(): Promise<void> {
    const agentsCopy = [...this.agents];
    const tasks = agentsCopy.map(agent => {
      if (agent && typeof agent.step === 'function') {
        return Promise.resolve(agent.step());
      }
      return Promise.resolve();
    });

    await Promise.all(tasks);
    this.steps++;
  }
}
