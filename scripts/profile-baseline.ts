/**
 * Profile a single simulation run to identify performance bottlenecks.
 * Compares academic vs realistic baseline.
 */
import { DAOSimulation } from '../lib/engine/simulation';
import { updateSettings, resetSettings } from '../lib/config/settings';
import { buildAgentCounts } from '../lib/research/population';
import type { PopulationSpec } from '../lib/research/population';

function profileRun(label: string, population: PopulationSpec, overrides: Record<string, any>, steps: number = 1000) {
  resetSettings();

  const agentCounts = buildAgentCounts(population);
  updateSettings({ ...overrides, ...agentCounts });

  const start = Date.now();
  const sim = new DAOSimulation({ seed: 42 });

  const initTime = Date.now() - start;
  console.log(`\n=== ${label} ===`);
  console.log(`Init: ${initTime}ms | Members: ${sim.dao.members.length}`);

  // Profile in chunks of 100 steps
  for (let chunk = 0; chunk < steps / 100; chunk++) {
    const chunkStart = Date.now();
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    const chunkMs = Date.now() - chunkStart;
    const stepNum = (chunk + 1) * 100;
    console.log(`Steps ${String(stepNum - 99).padStart(4)}-${String(stepNum).padStart(4)}: ${String(chunkMs).padStart(5)}ms (${(chunkMs / 100).toFixed(1)}ms/step) | proposals=${sim.dao.proposals.length}`);
  }

  const totalMs = Date.now() - start;
  console.log(`Total: ${totalMs}ms | Projected 2000 steps: ${(totalMs * (2000 / steps) / 1000).toFixed(1)}s`);
}

// Academic baseline
profileRun('Academic Baseline', {
  totalMembers: 200,
  distribution: [
    { archetype: 'passive_holder', percentage: 40 },
    { archetype: 'active_voter', percentage: 25 },
    { archetype: 'delegate', percentage: 20 },
    { archetype: 'staker', percentage: 5 },
    { archetype: 'whale', percentage: 5 },
    { archetype: 'governance_expert', percentage: 5 },
  ]
}, {
  governance_rule: 'majority',
  governance_config: { quorumPercentage: 0.05 },
  voting_activity: 0.25,
  proposal_creation_probability: 0.004,
});

// Realistic baseline
profileRun('Realistic Baseline', {
  totalMembers: 200,
  distribution: [
    { archetype: 'passive_holder', percentage: 35 },
    { archetype: 'active_voter', percentage: 20 },
    { archetype: 'delegate', percentage: 15 },
    { archetype: 'governance_whale', percentage: 15 },
    { archetype: 'staker', percentage: 10 },
    { archetype: 'governance_expert', percentage: 5 },
  ]
}, {
  governance_rule: 'majority',
  governance_config: { quorumPercentage: 0.02 },
  voting_activity: 0.30,
  proposal_creation_probability: 0.004,
  vote_power_cap_fraction: 0.15,
  vote_power_quadratic_threshold: 250,
  vote_power_velocity_window: 72,
  vote_power_velocity_penalty: 0.5,
});
