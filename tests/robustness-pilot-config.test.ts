import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'yaml';
import { describe, expect, it } from 'vitest';
import { BatchRunner } from '../lib/research/batch-runner';
import type { ExperimentConfig } from '../lib/research/experiment-config';
import { validateExperimentConfig } from '../lib/research/experiment-config-validator';

const directory = resolve(process.cwd(), 'experiments', 'robustness-pilot');

function loadConfigs(): ExperimentConfig[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.yaml'))
    .sort()
    .map((file) => yaml.parse(readFileSync(resolve(directory, file), 'utf8')) as ExperimentConfig);
}

describe('publication robustness pilot configurations', () => {
  it('contains five valid, explicitly exploratory, paired-seed designs', () => {
    const configs = loadConfigs();
    expect(configs).toHaveLength(5);

    for (const config of configs) {
      expect(() => validateExperimentConfig(config)).not.toThrow();
      expect(config.research?.classification).toBe('exploratory');
      expect(config.research?.analysisModel).toBe('paired_contrast');
      expect(config.execution.seedStrategy).toBe('fixed');
      expect(config.execution.fixedSeeds).toHaveLength(8);
      expect(new Set(config.execution.fixedSeeds).size).toBe(8);
      expect(config.output.includeTimeline).toBe(true);
      expect(config.output.timelineStride).toBe(24);
    }
  });

  it('plans 104 runs with matched seed blocks and the declared horizons', () => {
    const configs = loadConfigs();
    const tasks = configs.flatMap((config) =>
      new BatchRunner(config, { concurrency: 1 }).generateTasks()
    );

    expect(tasks).toHaveLength(104);
    const horizonConfig = configs.find((config) => config.id === 'robustness-horizon-pilot');
    expect(horizonConfig).toBeDefined();
    const horizonTasks = new BatchRunner(
      horizonConfig!,
      { concurrency: 1 }
    ).generateTasks();
    expect(horizonTasks.map((task) => task.stepsPerRun)).toEqual([
      ...Array(8).fill(500),
      ...Array(8).fill(1000),
      ...Array(8).fill(2000),
    ]);
  });
});
