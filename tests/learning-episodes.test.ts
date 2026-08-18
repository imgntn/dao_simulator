import { describe, expect, it, vi } from 'vitest';
import { runLearningEpisodes } from '../lib/research/learning-episodes';
import type { DAOSimulation } from '../lib/engine/simulation';

describe('runLearningEpisodes', () => {
  it('allocates every step and closes each episode', async () => {
    const observedSteps: number[] = [];
    const run = vi.fn(async (steps: number) => {
      observedSteps.push(steps);
    });
    const endLearningEpisode = vi.fn();
    const isSharedExperienceEnabled = vi.fn(() => false);
    const mergeSharedExperience = vi.fn();
    const simulation = {
      run,
      endLearningEpisode,
      isSharedExperienceEnabled,
      mergeSharedExperience,
    } as unknown as DAOSimulation;

    await runLearningEpisodes(simulation, 10, 4);

    expect(observedSteps).toEqual([3, 3, 2, 2]);
    expect(endLearningEpisode).toHaveBeenCalledTimes(4);
    expect(isSharedExperienceEnabled).toHaveBeenCalledTimes(4);
    expect(mergeSharedExperience).not.toHaveBeenCalled();
  });

  it('rejects zero-length episode schedules', async () => {
    const simulation = {} as DAOSimulation;
    await expect(runLearningEpisodes(simulation, 2, 3)).rejects.toThrow(
      'episodeCount must be a positive integer no greater than totalSteps'
    );
  });
});
