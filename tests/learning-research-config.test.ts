import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetSettings } from '../lib/config/settings';
import { DAOSimulation } from '../lib/engine/simulation';
import type { ExperimentConfig } from '../lib/research/experiment-config';
import { validateExperimentConfig } from '../lib/research/experiment-config-validator';
import { runLearningEpisodes } from '../lib/research/learning-episodes';

afterEach(() => {
  resetSettings();
  delete process.env.DAO_SIM_RESEARCH_MODE;
});

function experimentWithPersistence(persist: boolean): ExperimentConfig {
  return {
    name: 'Learning Isolation Test',
    baseConfig: {
      inline: {
        learning_persist_q_tables: persist,
      },
    },
    execution: {
      runsPerConfig: 1,
      stepsPerRun: 2,
      seedStrategy: 'fixed',
      fixedSeeds: [17],
    },
    metrics: [
      { name: 'Learning Agents', type: 'builtin', builtin: 'learning_agent_count' },
    ],
    output: { directory: 'unused', formats: ['json'] },
  };
}

describe('research learning configuration', () => {
  it('applies replay settings to every learning-capable agent', () => {
    process.env.DAO_SIM_RESEARCH_MODE = '1';
    const simulation = new DAOSimulation({
      seed: 4301,
      learning_enabled: true,
      learning_experience_replay: true,
      learning_experience_replay_size: 64,
      learning_experience_replay_batch_size: 4,
      learning_experience_replay_interval: 2,
      learning_shared_experience: true,
      useIndexedDB: false,
    });

    const audit = simulation.getLearningConfigurationAudit();
    expect(audit).toMatchObject({
      learningEnabled: true,
      sharedExperienceEnabled: true,
      experienceReplayEnabled: true,
      experienceReplaySize: 64,
      experienceReplayBatchSize: 4,
      experienceReplayInterval: 2,
    });
    expect(audit.learningAgentCount).toBeGreaterThan(0);
    expect(audit.configuredLearningAgentCount).toBe(audit.learningAgentCount);
  });

  it('merges shared knowledge at each within-replicate episode boundary', async () => {
    process.env.DAO_SIM_RESEARCH_MODE = '1';
    const simulation = new DAOSimulation({
      seed: 4302,
      learning_enabled: true,
      learning_shared_experience: true,
      useIndexedDB: false,
    });
    const merge = vi.spyOn(simulation, 'mergeSharedExperience');

    await runLearningEpisodes(simulation, 4, 2);

    expect(merge).toHaveBeenCalledTimes(2);
    const states = [...simulation.exportLearningStates().values()].flat();
    expect(states.length).toBeGreaterThan(0);
    expect(states.every((state) => state.episodeCount === 2)).toBe(true);
  });

  it('prohibits learning-state leakage between research replicates', () => {
    expect(() => validateExperimentConfig(experimentWithPersistence(true)))
      .toThrow(/replicates must be independent/);
    expect(() => validateExperimentConfig(experimentWithPersistence(false)))
      .not.toThrow();
  });
});
