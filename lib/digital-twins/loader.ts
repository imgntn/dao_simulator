/**
 * Digital Twin Loader
 *
 * Loads digital twin JSON configurations and transforms them
 * into simulation-ready DAOConfig objects
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateTwinConfig,
  validateIndex,
  type ZodDigitalTwinConfig,
  type ZodDigitalTwinIndex,
} from './schemas';
import type {
  DigitalTwinConfig,
  DigitalTwinIndex,
  DigitalTwinIndexEntry,
  TwinDAOConfig,
  SimProposalStageConfig,
  MemberArchetypeConfig,
  ProposalStageType,
} from './types';
import { STEPS_PER_DAY, CATEGORY_COLORS, MEMBER_TYPE_TO_AGENTS } from './types';

// Type helpers to convert Zod inferred types to our interface types
function zodToDigitalTwinIndex(zod: ZodDigitalTwinIndex): DigitalTwinIndex {
  return zod as DigitalTwinIndex;
}

function zodToDigitalTwinConfig(zod: ZodDigitalTwinConfig): DigitalTwinConfig {
  return zod as DigitalTwinConfig;
}

/**
 * Default path to digital twins directory
 */
const DIGITAL_TWINS_DIR = path.join(process.cwd(), 'digital_twins');

/**
 * Result type for loading operations
 */
export type LoadResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * DigitalTwinLoader - loads and transforms digital twin configurations
 */
export class DigitalTwinLoader {
  private twinsDir: string;
  private cache: Map<string, DigitalTwinConfig> = new Map();
  private indexCache: DigitalTwinIndex | null = null;

  constructor(twinsDir: string = DIGITAL_TWINS_DIR) {
    this.twinsDir = twinsDir;
  }

  /**
   * Load the index file listing all available twins
   */
  async loadIndex(): Promise<LoadResult<DigitalTwinIndex>> {
    if (this.indexCache) {
      return { success: true, data: this.indexCache };
    }

    const indexPath = path.join(this.twinsDir, 'index.json');

    try {
      const content = await fs.promises.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      const validation = validateIndex(data);

      if (validation.success === true) {
        const indexData = zodToDigitalTwinIndex(validation.data);
        this.indexCache = indexData;
        return { success: true, data: indexData };
      }
      // validation.success === false
      return {
        success: false,
        error: `Invalid index.json: ${validation.error}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to load index.json: ${message}` };
    }
  }

  /**
   * Load the index file synchronously
   */
  loadIndexSync(): LoadResult<DigitalTwinIndex> {
    if (this.indexCache) {
      return { success: true, data: this.indexCache };
    }

    const indexPath = path.join(this.twinsDir, 'index.json');

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      const data = JSON.parse(content);
      const validation = validateIndex(data);

      if (validation.success === true) {
        const indexData = zodToDigitalTwinIndex(validation.data);
        this.indexCache = indexData;
        return { success: true, data: indexData };
      }
      // validation.success === false
      return {
        success: false,
        error: `Invalid index.json: ${validation.error}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to load index.json: ${message}` };
    }
  }

  /**
   * Get list of available twin IDs
   */
  async getAvailableTwinIds(): Promise<string[]> {
    const result = await this.loadIndex();
    if (!result.success) return [];
    return result.data.daos.map((d) => d.id);
  }

  /**
   * Get list of available twins with metadata
   */
  async getAvailableTwins(): Promise<DigitalTwinIndexEntry[]> {
    const result = await this.loadIndex();
    if (!result.success) return [];
    return result.data.daos;
  }

  /**
   * Load a specific digital twin by ID
   */
  async loadTwin(id: string): Promise<LoadResult<DigitalTwinConfig>> {
    // Check cache first
    if (this.cache.has(id)) {
      return { success: true, data: this.cache.get(id)! };
    }

    // Get file name from index
    const indexResult = await this.loadIndex();
    if (indexResult.success !== true) {
      return { success: false, error: indexResult.error };
    }

    const entry = indexResult.data.daos.find((d) => d.id === id);
    if (!entry) {
      return { success: false, error: `Twin not found: ${id}` };
    }

    const filePath = path.join(this.twinsDir, entry.file);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const validation = validateTwinConfig(data);

      if (validation.success === true) {
        const twinConfig = zodToDigitalTwinConfig(validation.data);
        this.cache.set(id, twinConfig);
        return { success: true, data: twinConfig };
      }
      // validation.success === false
      return {
        success: false,
        error: `Invalid ${entry.file}: ${validation.error}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to load ${entry.file}: ${message}` };
    }
  }

  /**
   * Load a specific digital twin synchronously
   */
  loadTwinSync(id: string): LoadResult<DigitalTwinConfig> {
    if (this.cache.has(id)) {
      return { success: true, data: this.cache.get(id)! };
    }

    const indexResult = this.loadIndexSync();
    if (indexResult.success !== true) {
      return { success: false, error: indexResult.error };
    }

    const entry = indexResult.data.daos.find((d) => d.id === id);
    if (!entry) {
      return { success: false, error: `Twin not found: ${id}` };
    }

    const filePath = path.join(this.twinsDir, entry.file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const validation = validateTwinConfig(data);

      if (validation.success === true) {
        const twinConfig = zodToDigitalTwinConfig(validation.data);
        this.cache.set(id, twinConfig);
        return { success: true, data: twinConfig };
      }
      // validation.success === false
      return {
        success: false,
        error: `Invalid ${entry.file}: ${validation.error}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to load ${entry.file}: ${message}` };
    }
  }

  /**
   * Load all digital twins
   */
  async loadAllTwins(): Promise<Map<string, DigitalTwinConfig>> {
    const ids = await this.getAvailableTwinIds();
    const results = new Map<string, DigitalTwinConfig>();

    for (const id of ids) {
      const result = await this.loadTwin(id);
      if (result.success) {
        results.set(id, result.data);
      }
    }

    return results;
  }

  /**
   * Transform a digital twin config into simulation-ready DAOConfig
   */
  transformToDAOConfig(twin: DigitalTwinConfig): TwinDAOConfig {
    const dao = twin.dao;
    const simParams = dao.simulation_parameters;
    const govParams = simParams.governance;

    // Determine color from category
    const color = this.getCategoryColor(dao.category);

    // Calculate voting period in steps
    const votingPeriodSteps = this.getVotingPeriodSteps(govParams);

    // Calculate timelock delay in steps
    const timelockDelaySteps = this.getTimelockDelaySteps(dao);

    // Get quorum percent
    const quorumPercent = this.getQuorumPercent(govParams);

    // Get proposal threshold (normalize to percentage for simulation)
    const proposalThreshold = this.getProposalThreshold(govParams);

    // Build proposal stages
    const proposalStages = this.buildProposalStages(dao);

    // Detect special governance features
    const isBicameral = !!dao.governance_stack.houses;
    const hasDualGovernance = !!dao.governance_stack.safeguard_layer;
    const hasSecurityCouncil = dao.membership.member_types.some(
      (m) => m.type === 'security_council'
    );

    // Build member archetypes
    const memberArchetypes = this.buildMemberArchetypes(dao.membership.member_types);

    // Base config
    const config: TwinDAOConfig = {
      id: dao.id,
      name: dao.name,
      tokenSymbol: dao.governance_token.symbol,
      color,
      category: dao.category,
      proposalThreshold,
      quorumPercent,
      votingPeriodSteps,
      timelockDelaySteps,
      initialTreasury: 100000,  // Default initial treasury
      proposalStages,
      isBicameral,
      hasDualGovernance,
      hasSecurityCouncil,
      memberArchetypes,
      activityLevel: dao.proposal_activity.activity_level,
    };

    // Add bicameral config if applicable (Optimism)
    if (isBicameral && govParams.token_house) {
      config.tokenHouse = {
        quorumPercent: govParams.token_house.quorum_pct_votable_supply,
        approvalThresholdPercent: govParams.token_house.approval_threshold_pct,
      };
      if (govParams.citizens_house) {
        config.citizensHouse = {
          vetoEnabled: true,
          vetoPeriodSteps: govParams.citizens_house.upgrade_veto_window_days * STEPS_PER_DAY,
        };
      }
    }

    // Add dual governance config if applicable (Lido)
    if (hasDualGovernance && simParams.dual_governance) {
      const dg = simParams.dual_governance;
      config.dualGovernance = {
        vetoThresholdPercent: dg.veto_threshold_pct,
        rageQuitThresholdPercent: dg.rage_quit_threshold_pct,
        minTimelockSteps: dg.dynamic_timelock_days_range[0] * STEPS_PER_DAY,
        maxTimelockSteps: dg.dynamic_timelock_days_range[1] * STEPS_PER_DAY,
      };
    }

    return config;
  }

  /**
   * Get color based on DAO category
   */
  private getCategoryColor(categories: string[]): string {
    for (const cat of categories) {
      if (cat in CATEGORY_COLORS) {
        return CATEGORY_COLORS[cat];
      }
    }
    return '#9CA3AF'; // gray default
  }

  /**
   * Get voting period in simulation steps
   */
  private getVotingPeriodSteps(
    govParams: DigitalTwinConfig['dao']['simulation_parameters']['governance']
  ): number {
    if (govParams.voting_period_days) {
      return govParams.voting_period_days * STEPS_PER_DAY;
    }
    if (govParams.voting_period_days_range) {
      // Use average of range
      const [min, max] = govParams.voting_period_days_range;
      return Math.round(((min + max) / 2) * STEPS_PER_DAY);
    }
    if (govParams.token_house?.typical_voting_window_days) {
      return govParams.token_house.typical_voting_window_days * STEPS_PER_DAY;
    }
    if (govParams.onchain_vote_days) {
      return govParams.onchain_vote_days * STEPS_PER_DAY;
    }
    // Default: 7 days
    return 7 * STEPS_PER_DAY;
  }

  /**
   * Get timelock delay in simulation steps
   */
  private getTimelockDelaySteps(dao: DigitalTwinConfig['dao']): number {
    const simParams = dao.simulation_parameters;
    const govParams = simParams.governance;

    if (govParams.timelock_delay_days) {
      return govParams.timelock_delay_days * STEPS_PER_DAY;
    }

    // Check execution params for L2 chains
    if (simParams.execution) {
      const exec = simParams.execution;
      let total = 0;
      if (exec.l2_timelock_days) total += exec.l2_timelock_days;
      if (exec.l2_to_l1_delay_days) total += exec.l2_to_l1_delay_days;
      if (exec.l1_timelock_days) total += exec.l1_timelock_days;
      if (total > 0) return total * STEPS_PER_DAY;
    }

    // Check security controls
    if (dao.security_controls.timelock_delay_days) {
      return dao.security_controls.timelock_delay_days * STEPS_PER_DAY;
    }

    // Default: 2 days
    return 2 * STEPS_PER_DAY;
  }

  /**
   * Get quorum percentage
   */
  private getQuorumPercent(
    govParams: DigitalTwinConfig['dao']['simulation_parameters']['governance']
  ): number {
    if (typeof govParams.quorum_pct_votable === 'number') {
      return govParams.quorum_pct_votable;
    }
    if (
      typeof govParams.quorum_pct_votable === 'object' &&
      govParams.quorum_pct_votable !== null
    ) {
      // Use non-constitutional as default
      return govParams.quorum_pct_votable.non_constitutional || 3;
    }
    if (govParams.token_house?.quorum_pct_votable_supply) {
      return govParams.token_house.quorum_pct_votable_supply;
    }
    // Default: 5%
    return 5;
  }

  /**
   * Get proposal threshold (normalized to simulation scale)
   */
  private getProposalThreshold(
    govParams: DigitalTwinConfig['dao']['simulation_parameters']['governance']
  ): number {
    if (govParams.proposal_threshold?.value) {
      // Normalize large token amounts to simulation scale
      // Real DAOs have thresholds in millions, sim uses hundreds
      const rawValue = govParams.proposal_threshold.value;
      if (rawValue >= 1000000) {
        return Math.round(rawValue / 10000); // 1M -> 100
      }
      if (rawValue >= 10000) {
        return Math.round(rawValue / 100); // 100K -> 1000
      }
      return rawValue;
    }
    // Default threshold
    return 100;
  }

  /**
   * Build proposal stages from DAO spec
   */
  private buildProposalStages(dao: DigitalTwinConfig['dao']): SimProposalStageConfig[] {
    const stages: SimProposalStageConfig[] = [];
    const simParams = dao.simulation_parameters;

    for (const stage of dao.proposal_process.stages) {
      const simStage = this.mapStageToSimType(stage.stage);
      if (!simStage) continue;

      let durationSteps = STEPS_PER_DAY; // default 1 day

      if (stage.duration_days) {
        durationSteps = stage.duration_days * STEPS_PER_DAY;
      } else if (stage.min_duration_days) {
        durationSteps = stage.min_duration_days * STEPS_PER_DAY;
      } else if (stage.typical_duration_days) {
        durationSteps = stage.typical_duration_days * STEPS_PER_DAY;
      } else if (stage.typical_voting_window_days) {
        durationSteps = stage.typical_voting_window_days * STEPS_PER_DAY;
      } else if (stage.voting_period_days) {
        durationSteps = stage.voting_period_days * STEPS_PER_DAY;
      } else if (stage.duration_days_range) {
        const [min, max] = stage.duration_days_range;
        durationSteps = Math.round(((min + max) / 2) * STEPS_PER_DAY);
      }

      // Handle timelock stage specially
      if (simStage === 'timelock' && stage.timelock_days) {
        durationSteps = stage.timelock_days * STEPS_PER_DAY;
      }

      // Handle veto window
      if (
        simStage === 'veto_window' &&
        simParams.dual_governance?.review_pending_days
      ) {
        durationSteps =
          (simParams.dual_governance.review_pending_days +
            simParams.dual_governance.buffer_days) *
          STEPS_PER_DAY;
      }

      stages.push({
        stage: simStage,
        durationSteps,
        platform: stage.platform,
        passCondition: stage.pass_condition,
      });
    }

    // Ensure we have at least a basic flow
    if (stages.length === 0) {
      stages.push(
        { stage: 'rfc', durationSteps: 7 * STEPS_PER_DAY },
        { stage: 'on_chain', durationSteps: 7 * STEPS_PER_DAY },
        { stage: 'timelock', durationSteps: 2 * STEPS_PER_DAY },
        { stage: 'execution', durationSteps: 1 }
      );
    }

    return stages;
  }

  /**
   * Map stage name from JSON to simulation stage type
   */
  private mapStageToSimType(stageName: string): ProposalStageType | null {
    const lower = stageName.toLowerCase();

    if (lower.includes('rfc') || lower.includes('forum') || lower.includes('research')) {
      return 'rfc';
    }
    if (lower.includes('temp') || lower.includes('snapshot') || lower.includes('off-chain')) {
      return 'temp_check';
    }
    if (lower.includes('on-chain') || lower.includes('voting') || lower.includes('on_chain')) {
      return 'on_chain';
    }
    if (lower.includes('timelock')) {
      return 'timelock';
    }
    if (lower.includes('veto') || lower.includes('dual governance')) {
      return 'veto_window';
    }
    if (lower.includes('execution') || lower.includes('enact')) {
      return 'execution';
    }
    if (lower.includes('cycle') || lower.includes('planning')) {
      return 'rfc'; // Map planning to RFC
    }

    return null;
  }

  /**
   * Build member archetypes from membership config
   */
  private buildMemberArchetypes(
    memberTypes: DigitalTwinConfig['dao']['membership']['member_types']
  ): MemberArchetypeConfig[] {
    const archetypes: MemberArchetypeConfig[] = [];
    let totalWeight = 0;

    for (const mt of memberTypes) {
      const suggestedAgents = MEMBER_TYPE_TO_AGENTS[mt.type] || ['PassiveMember'];

      // Assign weights based on type
      let weight = 1;
      if (mt.type === 'token_holder' || mt.type === 'op_holder' || mt.type === 'governance_token_holder') {
        weight = 5; // Most common
      } else if (mt.type === 'delegate') {
        weight = 3;
      } else if (mt.type === 'security_council' || mt.type === 'citizen' || mt.type === 'steward') {
        weight = 1; // Rare/special
      } else if (mt.type === 'staker' || mt.type === 'node_operator') {
        weight = 2;
      }

      totalWeight += weight;
      archetypes.push({
        type: mt.type,
        rights: mt.rights,
        suggestedAgentTypes: suggestedAgents,
        distributionWeight: weight,
      });
    }

    // Normalize weights to sum to 1
    for (const a of archetypes) {
      a.distributionWeight = a.distributionWeight / totalWeight;
    }

    return archetypes;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.indexCache = null;
  }
}

/**
 * Default loader instance
 */
export const defaultLoader = new DigitalTwinLoader();

/**
 * Convenience functions using default loader
 */
export async function loadTwin(id: string): Promise<LoadResult<DigitalTwinConfig>> {
  return defaultLoader.loadTwin(id);
}

export async function loadAllTwins(): Promise<Map<string, DigitalTwinConfig>> {
  return defaultLoader.loadAllTwins();
}

export async function getAvailableTwins(): Promise<DigitalTwinIndexEntry[]> {
  return defaultLoader.getAvailableTwins();
}

export function transformToDAOConfig(twin: DigitalTwinConfig): TwinDAOConfig {
  return defaultLoader.transformToDAOConfig(twin);
}
