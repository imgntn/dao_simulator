import { describe, expect, it } from 'vitest';
import { validateExperimentConfig } from '../lib/research/experiment-config-validator';
import { buildRobustnessConfigs } from '../scripts/generate-robustness-configs';

describe('publication robustness configurations', () => {
  it('keeps the pilot small and classified as development evidence', () => {
    const configs = buildRobustnessConfigs('pilot').map(entry => entry.config);

    expect(configs).toHaveLength(5);
    for (const config of configs) {
      expect(() => validateExperimentConfig(config)).not.toThrow();
      expect(config.id).toMatch(/-pilot$/);
      expect(config.execution.runsPerConfig).toBe(8);
      expect(config.execution.fixedSeeds).toHaveLength(8);
      expect(config.research?.publicationRole).toBe('pilot-development');
    }
  });

  it('freezes 100 unique paired seeds for every final robustness study', () => {
    const configs = buildRobustnessConfigs('final').map(entry => entry.config);
    const expectedSeeds = configs[0].execution.fixedSeeds;

    expect(configs).toHaveLength(5);
    expect(new Set(expectedSeeds).size).toBe(100);
    for (const config of configs) {
      expect(() => validateExperimentConfig(config)).not.toThrow();
      expect(config.id).toMatch(/-final$/);
      expect(config.execution.runsPerConfig).toBe(100);
      expect(config.execution.fixedSeeds).toEqual(expectedSeeds);
      expect(config.research?.classification).toBe('exploratory');
      expect(config.research?.publicationRole).toBe('supporting-exploratory');
      expect(config.baseConfig.overrides?.simulationStepsPerYear).toBe(8760);
    }
  });

  it('uses the vote-history capture endpoint for delegation depth', () => {
    const delegation = buildRobustnessConfigs('final')
      .map(entry => entry.config)
      .find(config => config.id === 'robustness-delegation-depth-final');

    expect(delegation?.research?.primaryOutcome).toBe('whale_influence');
    expect(delegation?.baseConfig.population).toEqual({
      totalMembers: 200,
      distribution: [{ archetype: 'delegate', percentage: 100 }],
    });
  });
});
