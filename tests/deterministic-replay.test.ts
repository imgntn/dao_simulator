import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  DAOSimulation,
  type DAOSimulationConfig,
} from '../lib/engine/simulation';
import { canonicalJson } from '../lib/research/campaign-manifest';
import {
  checkpointManager,
  checkpointReplayFingerprint,
} from '../lib/utils/checkpoint';

function hash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function reverseProperties<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).reverse()) as T;
}

async function replay(config: DAOSimulationConfig): Promise<{
  stateHash: string;
  eventHash: string;
}> {
  const simulation = new DAOSimulation(config);
  const events: unknown[] = [];
  simulation.eventBus.subscribe('*', event => events.push(event));
  await simulation.run(40);

  const state = {
    step: simulation.currentStep,
    treasury: simulation.dao.treasury.toDict(),
    members: simulation.dao.members
      .map(member => ({
        id: member.uniqueId,
        tokens: member.tokens,
        stakedTokens: member.stakedTokens,
        reputation: member.reputation,
        optimism: member.optimism,
        delegations: Object.fromEntries(member.delegations),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    proposals: simulation.dao.proposals
      .map(proposal => proposal.toDict())
      .sort((a, b) => String(a.uniqueId).localeCompare(String(b.uniqueId))),
    projects: simulation.dao.projects
      .map(project => project.toDict())
      .sort((a, b) => String(a.uniqueId).localeCompare(String(b.uniqueId))),
    history: simulation.dataCollector.history,
    randomStreams: simulation.randomStreams.getState(),
  };

  return {
    stateHash: hash(state),
    eventHash: hash(events),
  };
}

describe('nontrivial deterministic replay', () => {
  it(
    'matches uninterrupted execution after a persisted mid-run checkpoint',
    async () => {
      const config: DAOSimulationConfig = {
        seed: 90210,
        useIndexedDB: false,
        collectionInterval: 1,
        checkpointInterval: 0,
        validateEconomicInvariants: true,
        num_developers: 2,
        num_investors: 2,
        num_traders: 2,
        num_delegators: 2,
        num_proposal_creators: 2,
        num_rl_traders: 1,
        num_market_makers: 1,
        voting_activity: 0.7,
        proposal_creation_probability: 0.05,
        token_emission_rate: 1,
        token_burn_rate: 0.5,
      };

      const uninterrupted = new DAOSimulation(config);
      await uninterrupted.run(20);
      const checkpointId = await uninterrupted.saveCheckpoint();

      try {
        await uninterrupted.run(20);
        const uninterruptedHash = checkpointReplayFingerprint(uninterrupted);

        const resumed = new DAOSimulation(config);
        expect(await resumed.loadCheckpoint(checkpointId)).toBe(true);
        expect(resumed.currentStep).toBe(20);
        await resumed.run(20);

        expect(checkpointReplayFingerprint(resumed)).toBe(uninterruptedHash);
      } finally {
        await checkpointManager.deleteCheckpoint(checkpointId);
      }
    },
    30_000
  );

  it(
    'preserves final-state and event-trace hashes across replay and config key order',
    async () => {
      const config: DAOSimulationConfig = {
        seed: 481516,
        useIndexedDB: false,
        collectionInterval: 1,
        num_developers: 4,
        num_investors: 4,
        num_traders: 4,
        num_delegators: 3,
        num_proposal_creators: 3,
        voting_activity: 0.8,
        proposal_creation_probability: 0.08,
        market_shock_frequency: 8,
        token_emission_rate: 2,
        token_burn_rate: 1,
        forum_enabled: true,
      };

      const first = await replay(config);
      const second = await replay({ ...config });
      const reordered = await replay(reverseProperties(config));

      expect(second).toEqual(first);
      expect(reordered).toEqual(first);
    },
    30_000
  );
});
