// Checkpoint management for simulation state persistence
// IMPORTANT: Checkpoints must capture ALL state needed to reproduce a simulation
// from the checkpoint point forward. This includes:
// - Simulation step counter
// - DAO state (members, proposals, projects, treasury)
// - Agent states (tokens, reputation, delegations, votes)
// - Random number generator state (for deterministic replay)

import type { DAOSimulation } from '../engine/simulation';
import type { Dispute } from '../data-structures/dispute';
import type { Violation } from '../data-structures/violation';
import { getRandomState, setRandomState } from './random';

// Serialized member state for checkpoints
export interface CheckpointMemberState {
  uniqueId: string;
  tokens: number;
  reputation: number;
  stakedTokens: number;
  location: string;
}

// Serialized proposal state for checkpoints
export interface CheckpointProposalState {
  uniqueId: string;
  title: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
}

// Serialized project state for checkpoints
export interface CheckpointProjectState {
  uniqueId: string;
  title: string;
  status: string;
}

// Serialized guild state for checkpoints
export interface CheckpointGuildState {
  name: string;
  members: number;
}

// Serialized agent state for checkpoints
export interface CheckpointAgentState {
  uniqueId: string;
  type: string;
  tokens: number;
  reputation: number;
  stakedTokens: number;
  location: string;
  optimism: number;
  // Extended state for complete restore
  stakeLocks: Array<{ amount: number; unlockStep: number }>;
  delegations: Record<string, number>;  // memberId -> amount
  votes: Record<string, { vote: boolean; weight: number }>;  // proposalId -> vote data
  daoId: string;
  transferCooldown: number;
}

// Random number generator state for deterministic replay
export interface CheckpointRNGState {
  seed: number;
  state: number;
}

// Simulation config for checkpoints
export interface CheckpointConfig {
  numDevelopers: number;
  numInvestors: number;
  numTraders: number;
  governanceRule: string;
  tokenEmissionRate: number;
  tokenBurnRate: number;
  stakingInterestRate: number;
  marketShockFrequency: number;
  seed: number | null | undefined;
}

export interface SimulationCheckpoint {
  id: string;
  timestamp: number;
  step: number;
  config: CheckpointConfig;
  daoState: {
    name: string;
    daoId: string;
    currentStep: number;
    members: CheckpointMemberState[];
    proposals: CheckpointProposalState[];
    projects: CheckpointProjectState[];
    disputes: Dispute[];
    violations: Violation[];
    guilds: CheckpointGuildState[];
    treasuryFunds: number;
    tokenPrices: Record<string, number>;
    tokenBalances: Record<string, number>;
  };
  agentStates: CheckpointAgentState[];
  // CRITICAL: RNG state for deterministic replay
  rngState: CheckpointRNGState | null;
  metadata: {
    version: string;
    checkpointInterval: number;
  };
}

export class CheckpointManager {
  private storageKey = 'dao-simulation-checkpoints';
  private maxCheckpoints = 10;

  /**
   * Save simulation checkpoint to localStorage/IndexedDB
   */
  async saveCheckpoint(simulation: DAOSimulation, id?: string): Promise<string> {
    const checkpointId = id || `checkpoint_${Date.now()}_${simulation.currentStep}`;

    const checkpoint: SimulationCheckpoint = {
      id: checkpointId,
      timestamp: Date.now(),
      step: simulation.currentStep,
      config: this.serializeConfig(simulation),
      daoState: this.serializeDAOState(simulation),
      agentStates: this.serializeAgents(simulation),
      // CRITICAL: Capture RNG state for deterministic replay
      rngState: getRandomState(),
      metadata: {
        version: '2.0.0',  // Version bump for enhanced checkpoint format
        checkpointInterval: simulation.checkpointInterval,
      },
    };

    // Use IndexedDB if available, otherwise localStorage
    if (typeof window !== 'undefined' && window.indexedDB) {
      await this.saveToIndexedDB(checkpoint);
    } else if (typeof localStorage !== 'undefined') {
      this.saveToLocalStorage(checkpoint);
    } else {
      // Server-side: save to file system (optional)
      await this.saveToFileSystem(checkpoint);
    }

    return checkpointId;
  }

  /**
   * Load checkpoint and restore simulation state
   */
  async loadCheckpoint(checkpointId: string): Promise<SimulationCheckpoint | null> {
    if (typeof window !== 'undefined' && window.indexedDB) {
      return await this.loadFromIndexedDB(checkpointId);
    } else if (typeof localStorage !== 'undefined') {
      return this.loadFromLocalStorage(checkpointId);
    } else {
      return await this.loadFromFileSystem(checkpointId);
    }
  }

  /**
   * List all available checkpoints
   */
  async listCheckpoints(): Promise<SimulationCheckpoint[]> {
    if (typeof window !== 'undefined' && window.indexedDB) {
      return await this.listFromIndexedDB();
    } else if (typeof localStorage !== 'undefined') {
      return this.listFromLocalStorage();
    } else {
      return await this.listFromFileSystem();
    }
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.indexedDB) {
      return await this.deleteFromIndexedDB(checkpointId);
    } else if (typeof localStorage !== 'undefined') {
      return this.deleteFromLocalStorage(checkpointId);
    } else {
      return await this.deleteFromFileSystem(checkpointId);
    }
  }

  // ==================== Serialization ====================

  private serializeConfig(simulation: DAOSimulation): CheckpointConfig {
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

  private serializeDAOState(simulation: DAOSimulation): SimulationCheckpoint['daoState'] {
    const dao = simulation.dao;
    return {
      name: dao.name,
      daoId: dao.daoId,
      currentStep: dao.currentStep,
      members: dao.members.map(m => ({
        uniqueId: m.uniqueId,
        tokens: m.tokens,
        reputation: m.reputation,
        stakedTokens: m.stakedTokens,
        location: m.location,
      })),
      // Serialize full proposal state using toDict for complete data
      proposals: dao.proposals.map(p => ({
        uniqueId: p.uniqueId,
        title: p.title,
        status: p.status,
        votesFor: p.votesFor,
        votesAgainst: p.votesAgainst,
        // Include voting power snapshot
        ...p.toDict(),
      })),
      projects: dao.projects.map(p => ({
        uniqueId: p.uniqueId,
        title: p.title,
        status: p.status,
      })),
      disputes: dao.disputes,
      violations: dao.violations,
      guilds: dao.guilds.map(g => ({
        name: g.name,
        members: g.members.length,
      })),
      treasuryFunds: dao.treasury.funds,
      tokenPrices: Object.fromEntries(dao.treasury.tokenPrices),
      tokenBalances: Object.fromEntries(dao.treasury.tokens),
    };
  }

  private serializeAgents(simulation: DAOSimulation): CheckpointAgentState[] {
    return simulation.dao.members.map(agent => ({
      uniqueId: agent.uniqueId,
      type: agent.constructor.name,
      tokens: agent.tokens,
      reputation: agent.reputation,
      stakedTokens: agent.stakedTokens,
      location: agent.location,
      optimism: agent.optimism,
      // Extended state for complete restore
      stakeLocks: [...agent.stakeLocks],
      delegations: Object.fromEntries(agent.delegations),
      votes: Object.fromEntries(agent.votes),
      daoId: agent.daoId,
      transferCooldown: agent.transferCooldown,
    }));
  }

  // ==================== IndexedDB ====================

  private async saveToIndexedDB(checkpoint: SimulationCheckpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('dao-simulator-checkpoints', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['checkpoints'], 'readwrite');
        const store = transaction.objectStore('checkpoints');

        store.put(checkpoint);

        // Clean up old checkpoints
        const allRequest = store.getAll();
        allRequest.onsuccess = () => {
          const all = allRequest.result;
          if (all.length > this.maxCheckpoints) {
            all.sort((a: SimulationCheckpoint, b: SimulationCheckpoint) => a.timestamp - b.timestamp);
            const toDelete = all.slice(0, all.length - this.maxCheckpoints);
            toDelete.forEach((cp: SimulationCheckpoint) => store.delete(cp.id));
          }
        };

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  private async loadFromIndexedDB(checkpointId: string): Promise<SimulationCheckpoint | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('dao-simulator-checkpoints', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['checkpoints'], 'readonly');
        const store = transaction.objectStore('checkpoints');
        const getRequest = store.get(checkpointId);

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  private async listFromIndexedDB(): Promise<SimulationCheckpoint[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('dao-simulator-checkpoints', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['checkpoints'], 'readonly');
        const store = transaction.objectStore('checkpoints');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          db.close();
          resolve(getAllRequest.result || []);
        };
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
    });
  }

  private async deleteFromIndexedDB(checkpointId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('dao-simulator-checkpoints', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['checkpoints'], 'readwrite');
        const store = transaction.objectStore('checkpoints');
        const deleteRequest = store.delete(checkpointId);

        deleteRequest.onsuccess = () => {
          db.close();
          resolve(true);
        };
        deleteRequest.onerror = () => {
          db.close();
          resolve(false);
        };
      };
    });
  }

  // ==================== LocalStorage ====================

  /**
   * Safely parse JSON with error handling for corrupted localStorage data
   */
  private safeJsonParse<T>(data: string | null, fallback: T): T {
    if (!data) return fallback;
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.warn('Failed to parse localStorage data, using fallback:', error);
      return fallback;
    }
  }

  private saveToLocalStorage(checkpoint: SimulationCheckpoint): void {
    const key = `${this.storageKey}_${checkpoint.id}`;
    localStorage.setItem(key, JSON.stringify(checkpoint));

    // Update index
    const indexKey = `${this.storageKey}_index`;
    const index = this.safeJsonParse<string[]>(localStorage.getItem(indexKey), []);
    if (!index.includes(checkpoint.id)) {
      index.push(checkpoint.id);
      // Keep only latest N checkpoints
      if (index.length > this.maxCheckpoints) {
        const toRemove = index.shift();
        localStorage.removeItem(`${this.storageKey}_${toRemove}`);
      }
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
  }

  private loadFromLocalStorage(checkpointId: string): SimulationCheckpoint | null {
    const key = `${this.storageKey}_${checkpointId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as SimulationCheckpoint;
    } catch (error) {
      console.warn(`Failed to parse checkpoint ${checkpointId}:`, error);
      // Remove corrupted entry from storage
      localStorage.removeItem(key);
      return null;
    }
  }

  private listFromLocalStorage(): SimulationCheckpoint[] {
    const indexKey = `${this.storageKey}_index`;
    const index = this.safeJsonParse<string[]>(localStorage.getItem(indexKey), []);
    return index
      .map((id: string) => this.loadFromLocalStorage(id))
      .filter((cp: SimulationCheckpoint | null) => cp !== null);
  }

  private deleteFromLocalStorage(checkpointId: string): boolean {
    const key = `${this.storageKey}_${checkpointId}`;
    localStorage.removeItem(key);

    // Update index
    const indexKey = `${this.storageKey}_index`;
    const index = this.safeJsonParse<string[]>(localStorage.getItem(indexKey), []);
    const newIndex = index.filter((id: string) => id !== checkpointId);
    localStorage.setItem(indexKey, JSON.stringify(newIndex));

    return true;
  }

  // ==================== File System (Node.js) ====================

  private async saveToFileSystem(checkpoint: SimulationCheckpoint): Promise<void> {
    // Server-side implementation using fs
    const { fs, path } = await this.getFsModules();
    const dir = await this.ensureCheckpointDir(fs, path);
    const filePath = path.join(dir, `${checkpoint.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2), 'utf8');
    await this.trimFileSystemCheckpoints(fs, path, dir);
  }

  private async loadFromFileSystem(checkpointId: string): Promise<SimulationCheckpoint | null> {
    const { fs, path } = await this.getFsModules();
    const dir = await this.ensureCheckpointDir(fs, path);
    const filePath = path.join(dir, `${checkpointId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as SimulationCheckpoint;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async listFromFileSystem(): Promise<SimulationCheckpoint[]> {
    const { fs, path } = await this.getFsModules();
    const dir = await this.ensureCheckpointDir(fs, path);
    const entries = await fs.readdir(dir);
    const checkpoints: SimulationCheckpoint[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const filePath = path.join(dir, entry);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        checkpoints.push(JSON.parse(data) as SimulationCheckpoint);
      } catch {
        // Skip unreadable or malformed checkpoint files
      }
    }

    return checkpoints;
  }

  private async deleteFromFileSystem(checkpointId: string): Promise<boolean> {
    const { fs, path } = await this.getFsModules();
    const dir = await this.ensureCheckpointDir(fs, path);
    const filePath = path.join(dir, `${checkpointId}.json`);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private async ensureCheckpointDir(
    fs: typeof import('fs/promises'),
    path: typeof import('path')
  ): Promise<string> {
    const dir = path.join(process.cwd(), 'checkpoints');
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private async trimFileSystemCheckpoints(
    fs: typeof import('fs/promises'),
    path: typeof import('path'),
    dir: string
  ): Promise<void> {
    const entries = await fs.readdir(dir);
    const checkpoints: Array<{ file: string; timestamp: number }> = [];

    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const filePath = path.join(dir, entry);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data) as SimulationCheckpoint;
        checkpoints.push({
          file: entry,
          timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0,
        });
      } catch {
        // Ignore unreadable checkpoints during cleanup
      }
    }

    if (checkpoints.length <= this.maxCheckpoints) return;

    checkpoints.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = checkpoints.slice(0, checkpoints.length - this.maxCheckpoints);
    await Promise.all(
      toDelete.map(cp => fs.unlink(path.join(dir, cp.file)).catch(() => undefined))
    );
  }

  private async getFsModules(): Promise<{
    fs: typeof import('fs/promises');
    path: typeof import('path');
  }> {
    const [fsModule, pathModule] = await Promise.all([
      import('fs/promises'),
      import('path'),
    ]);
    const path = (pathModule as { default?: typeof import('path') }).default ?? pathModule;
    return { fs: fsModule, path };
  }
}

export const checkpointManager = new CheckpointManager();
