// Checkpoint management for simulation state persistence

import type { DAOSimulation } from '../engine/simulation';

export interface SimulationCheckpoint {
  id: string;
  timestamp: number;
  step: number;
  config: any;
  daoState: {
    name: string;
    members: any[];
    proposals: any[];
    projects: any[];
    disputes: any[];
    violations: any[];
    guilds: any[];
    treasuryFunds: number;
    tokenPrices: Record<string, number>;
  };
  agentStates: any[];
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
      metadata: {
        version: '1.0.0',
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

  private serializeConfig(simulation: DAOSimulation): any {
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

  private serializeDAOState(simulation: DAOSimulation): any {
    const dao = simulation.dao;
    return {
      name: dao.name,
      members: dao.members.map(m => ({
        uniqueId: m.uniqueId,
        tokens: m.tokens,
        reputation: m.reputation,
        stakedTokens: m.stakedTokens,
        location: m.location,
      })),
      proposals: dao.proposals.map(p => ({
        uniqueId: p.uniqueId,
        title: p.title,
        status: p.status,
        votesFor: p.votesFor,
        votesAgainst: p.votesAgainst,
      })),
      projects: dao.projects.map(p => ({
        uniqueId: p.uniqueId,
        name: p.name,
        status: p.status,
      })),
      disputes: dao.disputes,
      violations: dao.violations,
      guilds: dao.guilds.map(g => ({
        name: g.name,
        members: g.members.length,
      })),
      treasuryFunds: dao.treasury.funds,
      tokenPrices: dao.treasury.tokenPrices,
    };
  }

  private serializeAgents(simulation: DAOSimulation): any[] {
    return simulation.dao.members.map(agent => ({
      uniqueId: agent.uniqueId,
      type: agent.constructor.name,
      tokens: agent.tokens,
      reputation: agent.reputation,
      stakedTokens: agent.stakedTokens,
      location: agent.location,
      optimism: agent.optimism,
    }));
  }

  // ==================== IndexedDB ====================

  private async saveToIndexedDB(checkpoint: SimulationCheckpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('dao-simulator-checkpoints', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['checkpoints'], 'readwrite');
        const store = transaction.objectStore('checkpoints');

        store.put(checkpoint);

        // Clean up old checkpoints
        const allRequest = store.getAll();
        allRequest.onsuccess = () => {
          const all = allRequest.result;
          if (all.length > this.maxCheckpoints) {
            all.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = all.slice(0, all.length - this.maxCheckpoints);
            toDelete.forEach(cp => store.delete(cp.id));
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
      request.onsuccess = (event: any) => {
        const db = event.target.result;
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
      request.onsuccess = (event: any) => {
        const db = event.target.result;
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
      request.onsuccess = (event: any) => {
        const db = event.target.result;
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

  private saveToLocalStorage(checkpoint: SimulationCheckpoint): void {
    const key = `${this.storageKey}_${checkpoint.id}`;
    localStorage.setItem(key, JSON.stringify(checkpoint));

    // Update index
    const indexKey = `${this.storageKey}_index`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
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
    return data ? JSON.parse(data) : null;
  }

  private listFromLocalStorage(): SimulationCheckpoint[] {
    const indexKey = `${this.storageKey}_index`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    return index
      .map((id: string) => this.loadFromLocalStorage(id))
      .filter((cp: SimulationCheckpoint | null) => cp !== null);
  }

  private deleteFromLocalStorage(checkpointId: string): boolean {
    const key = `${this.storageKey}_${checkpointId}`;
    localStorage.removeItem(key);

    // Update index
    const indexKey = `${this.storageKey}_index`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    const newIndex = index.filter((id: string) => id !== checkpointId);
    localStorage.setItem(indexKey, JSON.stringify(newIndex));

    return true;
  }

  // ==================== File System (Node.js) ====================

  private async saveToFileSystem(checkpoint: SimulationCheckpoint): Promise<void> {
    // Server-side implementation using fs
    console.log('Checkpoint save (file system):', checkpoint.id);
    // TODO: Implement when running in Node.js environment
  }

  private async loadFromFileSystem(checkpointId: string): Promise<SimulationCheckpoint | null> {
    console.log('Checkpoint load (file system):', checkpointId);
    return null;
  }

  private async listFromFileSystem(): Promise<SimulationCheckpoint[]> {
    return [];
  }

  private async deleteFromFileSystem(checkpointId: string): Promise<boolean> {
    console.log('Checkpoint delete (file system):', checkpointId);
    return false;
  }
}

export const checkpointManager = new CheckpointManager();
