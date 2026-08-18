import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import { BatchRunner } from '../lib/research/batch-runner';
import type { ExperimentConfig } from '../lib/research/experiment-config';

describe('DAO city configuration order invariance', () => {
  it('produces identical ID-keyed metrics after reversing the DAO array', async () => {
    const source = yaml.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'experiments', 'paper', '07-inter-dao-cooperation.yaml'),
        'utf8',
      ),
    ) as ExperimentConfig;
    const base = structuredClone(source);
    base.name = 'City Order Invariance';
    base.scenarios = [structuredClone(source.scenarios![0])];
    base.baseCityConfig = {
      ...base.baseCityConfig,
      enableInterDAOProposals: false,
      interDAOProposalRate: 0,
      memberTransferEnabled: false,
      bridgesEnabled: false,
      tokenSwapRate: 0,
    };
    base.execution = {
      runsPerConfig: 1,
      stepsPerRun: 5,
      seedStrategy: 'fixed',
      fixedSeeds: [740_001],
      workers: 1,
    };
    base.output = {
      directory: 'results/test/city-order',
      formats: ['json'],
      includeRawRuns: true,
      includeManifest: false,
    };

    const reversed = structuredClone(base);
    reversed.scenarios![0].daos.reverse();

    const first = await new BatchRunner(base, { concurrency: 1 }).run();
    const second = await new BatchRunner(reversed, { concurrency: 1 }).run();
    expect(first.failedRunIds).toEqual([]);
    expect(second.failedRunIds).toEqual([]);
    expect(second.results[0].metrics).toEqual(first.results[0].metrics);
  }, 30_000);
});
