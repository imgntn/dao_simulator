// Redis-based persistent storage for simulations

import Redis from 'ioredis';
import type { DAOSimulation } from '../engine/simulation';

export function snapshotConfig(simulation: DAOSimulation): any {
  return {
    numDevelopers: simulation.numDevelopers,
    numInvestors: simulation.numInvestors,
    numTraders: simulation.numTraders,
    governanceRule: simulation.governanceRuleName,
    enableMarketing: simulation.enableMarketing,
    tokenEmissionRate: simulation.tokenEmissionRate,
    tokenBurnRate: simulation.tokenBurnRate,
    stakingInterestRate: simulation.stakingInterestRate,
    marketShockFrequency: simulation.marketShockFrequency,
    seed: simulation.seed,
  };
}

export function snapshotDAOState(simulation: DAOSimulation): any {
  const dao = simulation.dao;
  const treasury: any = (dao as any).treasury;
  const treasuryFunds = treasury?.funds ?? 0;
  const tokenPrice = typeof treasury?.getTokenPrice === 'function'
    ? treasury.getTokenPrice('DAO_TOKEN')
    : 0;
  return {
    name: dao.name,
    members: (dao.members || []).map(m => ({
      uniqueId: m.uniqueId,
      tokens: m.tokens,
      reputation: m.reputation,
      stakedTokens: (m as any).stakedTokens,
    })),
    proposals: Array.isArray(dao.proposals) ? dao.proposals.length : 0,
    projects: Array.isArray(dao.projects) ? dao.projects.length : 0,
    treasuryFunds,
    tokenPrice,
  };
}

export interface SimulationStore {
  save(id: string, simulation: DAOSimulation): Promise<void>;
  load(id: string): Promise<any | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Array<{ id: string; step: number; members: number }>>;
}

/**
 * Redis-based simulation store for production use
 */
export class RedisSimulationStore implements SimulationStore {
  private client: Redis;
  private keyPrefix = 'dao-sim:';
  private indexKey = 'dao-sim:index';

  constructor(redisUrl?: string) {
    this.client = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async save(id: string, simulation: DAOSimulation): Promise<void> {
    const key = this.keyPrefix + id;

    const data = {
      id,
      step: simulation.currentStep,
      config: snapshotConfig(simulation),
      daoState: snapshotDAOState(simulation),
      timestamp: Date.now(),
    };

    // Save simulation data
    await this.client.set(key, JSON.stringify(data), 'EX', 3600 * 24); // 24 hour TTL

    // Add to index
    await this.client.sadd(this.indexKey, id);
  }

  async load(id: string): Promise<any | null> {
    const key = this.keyPrefix + id;
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async delete(id: string): Promise<boolean> {
    const key = this.keyPrefix + id;

    // Remove from index
    await this.client.srem(this.indexKey, id);

    // Delete data
    const result = await this.client.del(key);
    return result > 0;
  }

  async list(): Promise<Array<{ id: string; step: number; members: number }>> {
    const ids = await this.client.smembers(this.indexKey);
    const simulations = [];

    for (const id of ids) {
      const data = await this.load(id);
      if (data) {
        simulations.push({
          id: data.id,
          step: data.step,
          members: data.daoState?.members?.length || 0,
        });
      }
    }

    return simulations;
  }

}

/**
 * In-memory simulation store for development
 */
export class InMemorySimulationStore implements SimulationStore {
  private store = new Map<string, any>();

  async save(id: string, simulation: DAOSimulation): Promise<void> {
    const data = {
      id,
      step: simulation.currentStep,
      simulation, // Store the actual instance
      daoState: snapshotDAOState(simulation),
      config: snapshotConfig(simulation),
      timestamp: Date.now(),
    };
    this.store.set(id, data);
  }

  async load(id: string): Promise<any | null> {
    return this.store.get(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async list(): Promise<Array<{ id: string; step: number; members: number }>> {
    const result = [];

    for (const [id, data] of this.store.entries()) {
      result.push({
        id,
        step: data.step,
        members: data.simulation?.dao?.members?.length || 0,
      });
    }

    return result;
  }

  getSimulation(id: string): DAOSimulation | null {
    const data = this.store.get(id);
    return data?.simulation || null;
  }
}

/**
 * Factory function to create the appropriate store based on environment
 */
export function createSimulationStore(): SimulationStore {
  const useRedis = process.env.REDIS_URL || process.env.USE_REDIS === 'true';

  if (useRedis && typeof window === 'undefined') {
    const store = new RedisSimulationStore();
    store.connect().catch(err => {
      console.error('Failed to connect to Redis, falling back to in-memory store:', err);
    });
    return store;
  }

  return new InMemorySimulationStore();
}

/**
 * Rehydrate a DAOSimulation instance from a serialized snapshot saved by a SimulationStore.
 * Note: Because the snapshot only contains aggregated DAO state, the rehydrated simulation
 * uses fresh agent instances seeded with the stored config and copies basic balances/metrics.
 */
export function rehydrateSimulation(snapshot: any): DAOSimulation {
  if (snapshot?.simulation) {
    return snapshot.simulation as DAOSimulation;
  }

  const simulation = new DAOSimulation(snapshot?.config || {});
  simulation.currentStep = snapshot?.step || 0;

  const daoState = snapshot?.daoState;
  if (daoState) {
    // Restore high-level treasury state
    if (typeof daoState.treasuryFunds === 'number') {
      simulation.dao.treasury.tokens = new Map([['DAO_TOKEN', daoState.treasuryFunds]]);
    }
    if (typeof daoState.tokenPrice === 'number') {
      simulation.dao.treasury.tokenPrices = new Map([['DAO_TOKEN', daoState.tokenPrice]]);
    }

    // Restore member-level balances where possible (best-effort)
    if (Array.isArray(daoState.members) && daoState.members.length) {
      for (let i = 0; i < simulation.dao.members.length && i < daoState.members.length; i++) {
        const saved = daoState.members[i];
        const member = simulation.dao.members[i] as any;
        if (typeof saved.tokens === 'number') member.tokens = saved.tokens;
        if (typeof saved.reputation === 'number') member.reputation = saved.reputation;
        if (typeof saved.stakedTokens === 'number') member.stakedTokens = saved.stakedTokens;
      }
    }
  }

  return simulation;
}
