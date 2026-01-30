import type { DAOSimulationConfig } from '../engine/simulation';
import type { PopulationSpec } from './population';
import { buildAgentCounts } from './population';
import type { SimulationOverrides } from './experiment-config';

export type ResearchConfig = DAOSimulationConfig & { population?: PopulationSpec };

export function resolveSimulationConfig(
  config: ResearchConfig,
  seed: number,
  overrides?: SimulationOverrides
): DAOSimulationConfig {
  const { population, ...baseConfig } = config;
  const agentCounts = population ? buildAgentCounts(population) : {};

  const resolved: DAOSimulationConfig = {
    ...agentCounts,
    ...baseConfig,
    seed,
  };

  if (overrides?.checkpointInterval !== undefined) {
    resolved.checkpointInterval = overrides.checkpointInterval;
  }
  if (overrides?.eventLogging !== undefined) {
    resolved.eventLogging = overrides.eventLogging;
  }

  resolved.useIndexedDB = false;

  return resolved;
}
