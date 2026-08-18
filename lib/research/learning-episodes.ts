import { DAOSimulation } from '../engine/simulation';

/**
 * Run one independent replicate as one or more learning episodes.
 * Q-tables remain inside the replicate, while no state leaks between replicates.
 */
export async function runLearningEpisodes(
  simulation: DAOSimulation,
  totalSteps: number,
  episodeCount = 1
): Promise<void> {
  if (!Number.isInteger(totalSteps) || totalSteps <= 0) {
    throw new Error('totalSteps must be a positive integer');
  }
  if (!Number.isInteger(episodeCount) || episodeCount <= 0 || episodeCount > totalSteps) {
    throw new Error('episodeCount must be a positive integer no greater than totalSteps');
  }

  const baseLength = Math.floor(totalSteps / episodeCount);
  const remainder = totalSteps % episodeCount;
  for (let episode = 0; episode < episodeCount; episode++) {
    const steps = baseLength + (episode < remainder ? 1 : 0);
    await simulation.run(steps);
    simulation.endLearningEpisode();
    if (simulation.isSharedExperienceEnabled()) {
      simulation.mergeSharedExperience();
    }
  }
}
