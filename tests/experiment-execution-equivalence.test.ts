import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExperimentConfig, MetricsSummary } from '../lib/research/experiment-config';
import { ExperimentRunner } from '../lib/research/experiment-runner';
import { BatchRunner, type BatchCheckpoint } from '../lib/research/batch-runner';
import { canonicalJson, sha256 } from '../lib/research/campaign-manifest';

function makeConfig(workers: number): ExperimentConfig {
  return {
    name: 'Execution Equivalence',
    baseConfig: {
      template: 'compound',
      population: {
        totalMembers: 12,
        distribution: [
          { archetype: 'passive_holder', percentage: 50 },
          { archetype: 'active_voter', percentage: 50 },
        ],
      },
    },
    sweep: {
      parameter: 'simulation.voting_activity',
      values: [0.1, 0.4],
    },
    execution: {
      runsPerConfig: 2,
      stepsPerRun: 5,
      seedStrategy: 'sequential',
      baseSeed: 9137,
      workers,
    },
    metrics: [
      { name: 'Final Treasury', type: 'builtin', builtin: 'final_treasury' },
      { name: 'Final Gini', type: 'builtin', builtin: 'final_gini' },
      { name: 'Total Proposals', type: 'builtin', builtin: 'total_proposals' },
      {
        name: 'Token Conservation Error',
        type: 'builtin',
        builtin: 'token_conservation_error',
      },
    ],
    output: {
      directory: 'unused',
      formats: ['json'],
      includeTimeline: false,
    },
  };
}

function observedValues(summaries: MetricsSummary[]): unknown {
  return summaries.map(summary => ({
    sweepValue: summary.sweepValue,
    runCount: summary.runCount,
    metrics: summary.metrics.map(metric => ({
      name: metric.name,
      values: metric.values,
    })),
  }));
}

describe('experiment execution equivalence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes each horizon-sensitivity condition for its declared number of steps', async () => {
    const config = makeConfig(1);
    config.sweep = {
      parameter: 'research_horizon_steps',
      values: [2, 5],
    };
    config.execution.runsPerConfig = 1;

    const planned = new BatchRunner(config, { concurrency: 1 }).generateTasks();
    const results = await Promise.all(
      planned.map((task) =>
        new ExperimentRunner(config).runSingle(
          task.daoConfig,
          task.seed,
          task.sweepValue,
          task.runIndex,
          task.stepsPerRun
        )
      )
    );

    expect(results.map((result) => result.stepsCompleted)).toEqual([2, 5]);
    expect(results.map((result) => result.sweepValue)).toEqual([2, 5]);
  });

  it('uses seed sweep values as condition-specific seed bases', () => {
    const config = makeConfig(1);
    config.sweep = { parameter: 'seed', values: [42, 123, 456] };
    config.execution.runsPerConfig = 2;

    const tasks = new BatchRunner(config, { concurrency: 1 }).generateTasks();
    expect(tasks.map(task => task.seed)).toEqual([42, 43, 123, 124, 456, 457]);
    expect(tasks.map(task => (task.daoConfig as { seed?: number }).seed)).toEqual([
      42, 42, 123, 123, 456, 456,
    ]);
  });

  it(
    'produces identical per-run observations sequentially and with worker processes',
    async () => {
      const sequential = await new ExperimentRunner(makeConfig(1)).run();
      for (const workerCount of [2, 3]) {
        const parallel = await new ExperimentRunner(makeConfig(workerCount)).run();
        expect(parallel.failedRuns).toBe(0);
        expect(parallel.totalRuns).toBe(sequential.totalRuns);
        expect(observedValues(parallel.metricsSummary)).toEqual(
          observedValues(sequential.metricsSummary)
        );
      }
    },
    30_000
  );

  it(
    'resumes a non-prefix checkpoint without rerunning completed tasks',
    async () => {
      const config = makeConfig(1);
      const checkpointDir = await fs.mkdtemp(join(tmpdir(), 'dao-sim-resume-'));

      try {
        const planningRunner = new BatchRunner(config, { concurrency: 1 });
        const tasks = planningRunner.generateTasks();
        const completedTask = tasks[2];
        const completedResult = await new ExperimentRunner(config).runSingle(
          completedTask.daoConfig,
          completedTask.seed,
          completedTask.sweepValue,
          completedTask.runIndex
        );
        const checkpoint: BatchCheckpoint = {
          experimentName: config.name,
          configHash: `sha256:${sha256(canonicalJson(config))}`,
          totalRuns: tasks.length,
          completedRunIds: [completedTask.id],
          completedResults: [completedResult],
          failedRunIds: [],
          timestamp: new Date(0).toISOString(),
        };
        await fs.writeFile(
          join(checkpointDir, 'Execution-Equivalence.checkpoint.json'),
          JSON.stringify(checkpoint)
        );

        const resumed = await new BatchRunner(config, {
          concurrency: 1,
          checkpointDir,
          checkpointInterval: 1,
        }).run();

        expect(resumed.failedRunIds).toEqual([]);
        expect(resumed.results).toHaveLength(tasks.length);
        expect(new Set(resumed.results.map(result => result.runId)).size).toBe(tasks.length);
        expect(resumed.results.map(result => result.runId)).toEqual(
          tasks.map(task => task.id)
        );
      } finally {
        await fs.rm(checkpointDir, { recursive: true, force: true });
      }
    },
    30_000
  );

  it(
    'retries a transient Windows checkpoint replace without failing a scientific run',
    async () => {
      const config = makeConfig(2);
      config.sweep = {
        parameter: 'simulation.voting_activity',
        values: [0.1],
      };
      config.execution.runsPerConfig = 2;
      const checkpointDir = await fs.mkdtemp(join(tmpdir(), 'dao-sim-checkpoint-retry-'));
      const transientError = Object.assign(
        new Error('operation not permitted during replace'),
        { code: 'EPERM' }
      );
      const rename = vi.spyOn(fs, 'rename');
      rename.mockRejectedValueOnce(transientError);

      try {
        const result = await new BatchRunner(config, {
          concurrency: 2,
          checkpointDir,
          checkpointInterval: 1,
        }).run();

        expect(result.failedRunIds).toEqual([]);
        expect(result.results).toHaveLength(2);
        expect(rename).toHaveBeenCalledTimes(3);
      } finally {
        await fs.rm(checkpointDir, { recursive: true, force: true });
      }
    },
    30_000
  );

  it(
    'treats an unrecoverable checkpoint replace as a fatal infrastructure error',
    async () => {
      const config = makeConfig(2);
      config.sweep = {
        parameter: 'simulation.voting_activity',
        values: [0.1],
      };
      config.execution.runsPerConfig = 1;
      const checkpointDir = await fs.mkdtemp(join(tmpdir(), 'dao-sim-checkpoint-fatal-'));
      const persistentError = Object.assign(
        new Error('operation not permitted during replace'),
        { code: 'EPERM' }
      );
      vi.spyOn(fs, 'rename').mockRejectedValue(persistentError);

      try {
        await expect(
          new BatchRunner(config, {
            concurrency: 2,
            checkpointDir,
            checkpointInterval: 1,
          }).run()
        ).rejects.toThrow('Checkpoint persistence failed after 8 replace attempts');
      } finally {
        await fs.rm(checkpointDir, { recursive: true, force: true });
      }
    },
    30_000
  );

  it(
    'retries transient Windows checkpoint cleanup after all runs succeed',
    async () => {
      const config = makeConfig(2);
      config.sweep = {
        parameter: 'simulation.voting_activity',
        values: [0.1],
      };
      config.execution.runsPerConfig = 1;
      const checkpointDir = await fs.mkdtemp(join(tmpdir(), 'dao-sim-cleanup-retry-'));
      const originalUnlink = fs.unlink.bind(fs);
      const transientError = Object.assign(
        new Error('resource busy during cleanup'),
        { code: 'EBUSY' }
      );
      let injected = false;
      const unlink = vi.spyOn(fs, 'unlink').mockImplementation(async path => {
        if (!injected && String(path).endsWith('.checkpoint.json')) {
          injected = true;
          throw transientError;
        }
        return originalUnlink(path);
      });

      try {
        const result = await new BatchRunner(config, {
          concurrency: 2,
          checkpointDir,
          checkpointInterval: 1,
        }).run();

        expect(result.failedRunIds).toEqual([]);
        expect(result.results).toHaveLength(1);
        expect(injected).toBe(true);
        expect(unlink).toHaveBeenCalled();
        await expect(
          fs.stat(join(checkpointDir, 'Execution-Equivalence.checkpoint.json'))
        ).rejects.toMatchObject({ code: 'ENOENT' });
      } finally {
        await fs.rm(checkpointDir, { recursive: true, force: true });
      }
    },
    30_000
  );

  it(
    'escalates a persistently locked checkpoint cleanup as infrastructure failure',
    async () => {
      const config = makeConfig(2);
      config.sweep = {
        parameter: 'simulation.voting_activity',
        values: [0.1],
      };
      config.execution.runsPerConfig = 1;
      const checkpointDir = await fs.mkdtemp(join(tmpdir(), 'dao-sim-cleanup-fatal-'));
      const originalUnlink = fs.unlink.bind(fs);
      const persistentError = Object.assign(
        new Error('resource busy during cleanup'),
        { code: 'EBUSY' }
      );
      vi.spyOn(fs, 'unlink').mockImplementation(async path => {
        if (String(path).endsWith('.checkpoint.json')) throw persistentError;
        return originalUnlink(path);
      });

      try {
        await expect(
          new BatchRunner(config, {
            concurrency: 2,
            checkpointDir,
            checkpointInterval: 1,
          }).run()
        ).rejects.toThrow('Checkpoint cleanup failed after 8 remove attempts');
      } finally {
        await fs.rm(checkpointDir, { recursive: true, force: true });
      }
    },
    30_000
  );
});
