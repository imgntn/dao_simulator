import { describe, expect, it } from 'vitest';
import { BatchRunner } from '../lib/research/batch-runner';
import type { ExperimentConfig } from '../lib/research/experiment-config';

function config(seedStrategy: 'sequential' | 'fixed' | 'random' = 'sequential'): ExperimentConfig {
  return {
    name: 'Paired Seed Test',
    baseConfig: { inline: {} },
    sweep: {
      parameter: 'simulation.voting_activity',
      values: [0.1, 0.5],
    },
    execution: {
      runsPerConfig: 3,
      stepsPerRun: 1,
      seedStrategy,
      baseSeed: 100,
      fixedSeeds: seedStrategy === 'fixed' ? [7, 11, 13] : undefined,
    },
    metrics: [
      {
        name: 'total_proposals',
        type: 'builtin',
        builtin: 'total_proposals',
      },
    ],
    output: { directory: 'unused', formats: ['json'] },
  };
}

describe('batch run planning', () => {
  it('uses common replicate seeds across conditions', () => {
    const tasks = new BatchRunner(config(), { concurrency: 1 }).generateTasks();
    expect(tasks.map((task) => task.seed)).toEqual([100, 101, 102, 100, 101, 102]);
  });

  it('requires every declared fixed replicate seed', () => {
    const value = config('fixed');
    value.execution.runsPerConfig = 4;
    expect(() => new BatchRunner(value, { concurrency: 1 }).generateTasks())
      .toThrow(/Missing fixed seed/);
  });

  it('prohibits nondeterministic random seed strategy', () => {
    expect(() => new BatchRunner(config('random'), { concurrency: 1 }).generateTasks())
      .toThrow(/prohibited/);
  });

  it('binds run IDs to the full experiment identity with SHA-256', () => {
    const firstConfig = config();
    const first = new BatchRunner(firstConfig, { concurrency: 1 }).generateTasks()[0].id;
    const repeated = new BatchRunner(firstConfig, { concurrency: 1 }).generateTasks()[0].id;
    const changedConfig = config();
    changedConfig.execution.stepsPerRun = 2;
    const changed = new BatchRunner(changedConfig, { concurrency: 1 }).generateTasks()[0].id;

    expect(first).toBe(repeated);
    expect(first).toMatch(/-run-001-id-[0-9a-f]{16}$/);
    expect(changed).not.toBe(first);
  });

  it('plans an explicit positive-integer research horizon per condition', () => {
    const value = config();
    value.sweep = {
      parameter: 'research_horizon_steps',
      values: [2, 5],
    };

    const tasks = new BatchRunner(value, { concurrency: 1 }).generateTasks();
    expect(tasks.map((task) => task.stepsPerRun)).toEqual([2, 2, 2, 5, 5, 5]);
  });

  it.each([
    [[0, 2]],
    [[2.5, 5]],
    [[Number.MAX_SAFE_INTEGER + 1]],
  ])('rejects invalid research horizon values %j', (values) => {
    const value = config();
    value.sweep = {
      parameter: 'research_horizon_steps',
      values,
    };

    expect(() => new BatchRunner(value, { concurrency: 1 }).generateTasks())
      .toThrow(/research_horizon_steps.*positive safe integer/);
  });
});
