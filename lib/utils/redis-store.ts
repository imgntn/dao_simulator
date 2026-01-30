// Redis-based persistent storage for simulations

import Redis from 'ioredis';
import { DAOSimulation } from '../engine/simulation';
import type {
  SimulationConfigSnapshot,
  DAOStateSnapshot,
  MemberSnapshot,
  SimulationSnapshot,
  SimulationListItem,
} from '../types/simulation';

export function snapshotConfig(simulation: DAOSimulation): SimulationConfigSnapshot {
  return {
    numDevelopers: simulation.numDevelopers,
    numInvestors: simulation.numInvestors,
    numTraders: simulation.numTraders,
    governanceRule: simulation.governanceRuleName,
    tokenEmissionRate: simulation.tokenEmissionRate,
    tokenBurnRate: simulation.tokenBurnRate,
    stakingInterestRate: simulation.stakingInterestRate,
    marketShockFrequency: simulation.marketShockFrequency,
    seed: simulation.seed,
  };
}

export function snapshotDAOState(simulation: DAOSimulation): DAOStateSnapshot {
  const dao = simulation.dao;
  const treasury = dao.treasury;
  const treasuryFunds = treasury?.funds ?? 0;
  const tokenPrice = typeof treasury?.getTokenPrice === 'function'
    ? treasury.getTokenPrice('DAO_TOKEN')
    : 0;

  const members: MemberSnapshot[] = (dao.members || []).map(m => ({
    uniqueId: m.uniqueId,
    tokens: m.tokens,
    reputation: m.reputation,
    stakedTokens: 'stakedTokens' in m ? (m as { stakedTokens?: number }).stakedTokens : undefined,
  }));

  return {
    name: dao.name,
    members,
    proposals: Array.isArray(dao.proposals) ? dao.proposals.length : 0,
    projects: Array.isArray(dao.projects) ? dao.projects.length : 0,
    treasuryFunds,
    tokenPrice,
  };
}

export interface SimulationStore {
  save(id: string, simulation: DAOSimulation): Promise<void>;
  load(id: string): Promise<SimulationSnapshot | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<SimulationListItem[]>;
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

    const data: SimulationSnapshot = {
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

  async load(id: string): Promise<SimulationSnapshot | null> {
    const key = this.keyPrefix + id;
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as SimulationSnapshot;
    } catch (error) {
      console.error(`Failed to parse simulation data for ${id}:`, error);
      // Remove corrupted data from Redis
      await this.client.del(key);
      await this.client.srem(this.indexKey, id);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    const key = this.keyPrefix + id;

    // Remove from index
    await this.client.srem(this.indexKey, id);

    // Delete data
    const result = await this.client.del(key);
    return result > 0;
  }

  async list(): Promise<SimulationListItem[]> {
    const ids = await this.client.smembers(this.indexKey);
    const simulations: SimulationListItem[] = [];

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
 * Extended snapshot type for in-memory store that keeps the actual simulation instance
 */
interface InMemorySnapshot extends SimulationSnapshot {
  simulation: DAOSimulation;
}

/**
 * In-memory simulation store for development
 */
export class InMemorySimulationStore implements SimulationStore {
  private store = new Map<string, InMemorySnapshot>();

  async save(id: string, simulation: DAOSimulation): Promise<void> {
    const data: InMemorySnapshot = {
      id,
      step: simulation.currentStep,
      simulation, // Store the actual instance
      daoState: snapshotDAOState(simulation),
      config: snapshotConfig(simulation),
      timestamp: Date.now(),
    };
    this.store.set(id, data);
  }

  async load(id: string): Promise<SimulationSnapshot | null> {
    return this.store.get(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async list(): Promise<SimulationListItem[]> {
    const result: SimulationListItem[] = [];

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

class ResilientSimulationStore implements SimulationStore {
  private mode: 'pending' | 'redis' | 'memory' = 'pending';
  private initPromise: Promise<void> | null = null;

  constructor(
    private primary: RedisSimulationStore,
    private fallback: InMemorySimulationStore
  ) {}

  private async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.primary.connect()
        .then(() => {
          this.mode = 'redis';
        })
        .catch((err) => {
          console.error('Failed to connect to Redis, falling back to in-memory store:', err);
          this.mode = 'memory';
        });
    }
    await this.initPromise;
  }

  private async withStore<T>(fn: (store: SimulationStore) => Promise<T>): Promise<T> {
    await this.init();
    const store = this.mode === 'redis' ? this.primary : this.fallback;

    try {
      return await fn(store);
    } catch (error) {
      if (store === this.primary) {
        console.error('Redis store error, falling back to in-memory store:', error);
        this.mode = 'memory';
        return await fn(this.fallback);
      }
      throw error;
    }
  }

  async save(id: string, simulation: DAOSimulation): Promise<void> {
    await this.withStore(store => store.save(id, simulation));
  }

  async load(id: string): Promise<SimulationSnapshot | null> {
    return await this.withStore(store => store.load(id));
  }

  async delete(id: string): Promise<boolean> {
    return await this.withStore(store => store.delete(id));
  }

  async list(): Promise<SimulationListItem[]> {
    return await this.withStore(store => store.list());
  }

  getSimulation(id: string): DAOSimulation | null {
    if (this.mode === 'memory') {
      return this.fallback.getSimulation(id);
    }
    return null;
  }
}

/**
 * Factory function to create the appropriate store based on environment
 */
export function createSimulationStore(): SimulationStore {
  const useRedis = process.env.REDIS_URL || process.env.USE_REDIS === 'true';

  if (useRedis && typeof window === 'undefined') {
    const primary = new RedisSimulationStore();
    const fallback = new InMemorySimulationStore();
    return new ResilientSimulationStore(primary, fallback);
  }

  return new InMemorySimulationStore();
}

/**
 * Rehydrate a DAOSimulation instance from a serialized snapshot saved by a SimulationStore.
 * Note: Because the snapshot only contains aggregated DAO state, the rehydrated simulation
 * uses fresh agent instances seeded with the stored config and copies basic balances/metrics.
 */
export function rehydrateSimulation(snapshot: SimulationSnapshot | null): DAOSimulation {
  if (!snapshot) {
    return new DAOSimulation({});
  }

  // If the snapshot contains the actual simulation instance (in-memory store)
  if ('simulation' in snapshot && snapshot.simulation instanceof DAOSimulation) {
    return snapshot.simulation;
  }

  const simulation = new DAOSimulation(snapshot.config || {});
  simulation.currentStep = snapshot.step || 0;

  const daoState = snapshot.daoState;
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
        const member = simulation.dao.members[i];
        if (typeof saved.tokens === 'number') member.tokens = saved.tokens;
        if (typeof saved.reputation === 'number') member.reputation = saved.reputation;
        if (typeof saved.stakedTokens === 'number' && 'stakedTokens' in member) {
          (member as { stakedTokens: number }).stakedTokens = saved.stakedTokens;
        }
      }
    }
  }

  return simulation;
}
