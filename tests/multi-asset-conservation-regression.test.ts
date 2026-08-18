import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import type { ExperimentConfig } from '../lib/research/experiment-config';
import { ExperimentRunner } from '../lib/research/experiment-runner';

describe('multi-asset conservation regression', () => {
  it('does not burn a market maker partial stablecoin debit at seed 44', async () => {
    const config = yaml.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'experiments', 'validation', '10-multi-asset-conservation.yaml'),
        'utf8',
      ),
    ) as ExperimentConfig;
    config.execution = {
      ...config.execution,
      runsPerConfig: 1,
      stepsPerRun: 20,
      seedStrategy: 'fixed',
      fixedSeeds: [44],
    };
    const runner = new ExperimentRunner(config);
    const condition = runner.generateConfigs()[0];
    const result = await runner.runSingle(condition.daoConfig, 44, condition.sweepValue, 0);
    expect(result.metrics['Token Conservation Error']).toBeLessThanOrEqual(1e-8);
  });
});
