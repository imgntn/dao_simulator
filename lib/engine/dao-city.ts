// DAOCity - Multi-DAO Orchestrator
// Manages multiple DAOs, global marketplace, inter-DAO proposals, and member transfers
// Extended with digital twin support for real-world DAO configurations

import { DAOSimulation, DAOSimulationConfig } from './simulation';
import { DAO } from '../data-structures/dao';
import { GlobalMarketplace } from '../data-structures/global-marketplace';
import { InterDAOProposal } from '../data-structures/inter-dao-proposal';
import { TimelockController, createTimelockController } from '../data-structures/timelock';
import { BicameralGovernance, createOptimismBicameral, createArbitrumGovernance } from '../data-structures/governance-house';
import { GovernanceProcessor, createGovernanceProcessor } from '../governance';
import { EventBus } from '../utils/event-bus';
import { random, randomChoice, randomShuffle } from '../utils/random';
import type { DAOMember } from '../agents/base';
import { SybilAttacker, FlashLoanAttacker } from '../agents';
import { DelegationResolver } from '../delegation/delegation-resolver';
import { TwinAgentFactory, createAgentsFromTwin } from '../agents/twin-agent-factory';
import {
  DigitalTwinLoader,
  loadTwin,
  loadAllTwins,
  getAvailableTwins,
  transformToDAOConfig,
  type TwinDAOConfig,
  type DigitalTwinConfig,
} from '../digital-twins';
import {
  DEFAULT_CITY_CONFIG,
  type DAOConfig,
  type DAOCityConfig,
  type DAOCityState,
  type DAOState,
  type MemberTransferRequest,
  type MemberTransferResult,
  type InterDAOProposalData,
  type TokenRanking,
  type BridgeState,
  type DAOTowerData,
  type DAOMemberCityData,
  type InterDAOEdge,
  type DAOCityNetworkData,
  type CityAttackConfig,
  type InterDAODefenseConfig,
} from '../types/dao-city';

/**
 * Bridge for token transfers between DAOs
 */
interface Bridge {
  fromDaoId: string;
  toDaoId: string;
  pendingTransfers: Array<{
    token: string;
    amount: number;
    sender: string;
    recipient: string;
    initiatedStep: number;
  }>;
  totalTransferred: number;
  feeRate: number;
  delay: number;
}

/**
 * DAOCity manages multiple DAOs in a shared ecosystem.
 * Features:
 * - Multiple DAOs with competing tokens
 * - Global marketplace for cross-DAO token trading
 * - Inter-DAO proposals for collaboration
 * - Member transfers between DAOs
 * - Unified event broadcasting
 */
export class DAOCity {
  // Core components
  private simulations: Map<string, DAOSimulation> = new Map();
  private globalMarketplace: GlobalMarketplace;
  private interDaoProposals: InterDAOProposal[] = [];
  private archivedProposals: InterDAOProposal[] = [];
  private bridges: Map<string, Bridge> = new Map();
  private pendingTransfers: MemberTransferRequest[] = [];

  // Configuration
  private config: DAOCityConfig;
  private bridgeFeeRate: number;
  private bridgeDelay: number;
  private enableInterDAOProposals: boolean;
  private memberTransferEnabled: boolean;
  private bridgesEnabled: boolean;
  private interDAOProposalRate: number;
  private memberTransferRate: number;
  private tokenSwapRate: number;
  private interDAOProposalConfig?: DAOCityConfig['interDAOProposalConfig'];
  private attackConfig?: CityAttackConfig;
  private interDAODefense?: InterDAODefenseConfig;

  // State
  private currentStep: number = 0;
  private eventBus: EventBus;

  // Layout for visualization
  private towerPositions: Map<string, [number, number, number]> = new Map();

  // Digital twin support
  private digitalTwins: Map<string, TwinDAOConfig> = new Map();
  private timelockControllers: Map<string, TimelockController> = new Map();
  private bicameralSystems: Map<string, BicameralGovernance> = new Map();
  private governanceProcessors: Map<string, GovernanceProcessor> = new Map();
  private twinLoader: DigitalTwinLoader;

  constructor(config?: DAOCityConfig) {
    // Use default config if not provided
    this.config = config || { ...DEFAULT_CITY_CONFIG, daos: DEFAULT_CITY_CONFIG.daos.map(d => ({ ...d })) };

    this.bridgeFeeRate = this.config.bridgeFeeRate;
    this.bridgeDelay = this.config.bridgeDelay;
    this.enableInterDAOProposals = this.config.enableInterDAOProposals;
    this.memberTransferEnabled = this.config.memberTransferEnabled ?? true;
    this.bridgesEnabled = this.config.bridgesEnabled ?? true;
    this.interDAOProposalRate = this.config.interDAOProposalRate ?? 0.02;
    this.memberTransferRate = this.config.memberTransferRate ?? 0.01;
    this.tokenSwapRate = this.config.tokenSwapRate ?? 0.05;
    this.interDAOProposalConfig = this.config.interDAOProposalConfig;
    this.attackConfig = this.config.attackConfig;
    this.interDAODefense = this.config.interDAODefense;

    // Create city-wide event bus
    this.eventBus = new EventBus(false);

    // Initialize digital twin loader
    this.twinLoader = new DigitalTwinLoader();

    // Initialize global marketplace
    this.globalMarketplace = new GlobalMarketplace(
      this.config.globalMarketplaceConfig,
      this.eventBus
    );

    // Initialize DAOs
    this.initializeDAOs();

    // Initialize attack agents if configured
    this.initializeAttackers();

    // Calculate tower positions
    this.calculateTowerPositions();

    // Initialize bridges between all DAO pairs
    this.initializeBridges();
  }

  /**
   * Initialize all DAOs from config
   */
  private initializeDAOs(): void {
    for (const daoConfig of this.config.daos) {
      const governanceRule = this.normalizeGovernanceRule(daoConfig.governanceRule);
      const simConfig: DAOSimulationConfig = {
        governance_rule: governanceRule,
        violation_probability: daoConfig.violationProbability,
        reputation_penalty: daoConfig.reputationPenalty,
        comment_probability: daoConfig.commentProbability,
        staking_interest_rate: daoConfig.stakingInterestRate,
        slash_fraction: daoConfig.slashFraction,
        reputation_decay_rate: daoConfig.reputationDecayRate,
        // Apply agent counts
        num_developers: daoConfig.agentCounts.num_developers,
        num_investors: daoConfig.agentCounts.num_investors,
        num_traders: daoConfig.agentCounts.num_traders,
        num_adaptive_investors: daoConfig.agentCounts.num_adaptive_investors,
        num_delegators: daoConfig.agentCounts.num_delegators,
        num_liquid_delegators: daoConfig.agentCounts.num_liquid_delegators,
        num_proposal_creators: daoConfig.agentCounts.num_proposal_creators,
        num_validators: daoConfig.agentCounts.num_validators,
        num_service_providers: daoConfig.agentCounts.num_service_providers,
        num_arbitrators: daoConfig.agentCounts.num_arbitrators,
        num_regulators: daoConfig.agentCounts.num_regulators,
        num_auditors: daoConfig.agentCounts.num_auditors,
        num_bounty_hunters: daoConfig.agentCounts.num_bounty_hunters,
        num_external_partners: daoConfig.agentCounts.num_external_partners,
        num_passive_members: daoConfig.agentCounts.num_passive_members,
        num_artists: daoConfig.agentCounts.num_artists,
        num_collectors: daoConfig.agentCounts.num_collectors,
        num_speculators: daoConfig.agentCounts.num_speculators,
        num_rl_traders: daoConfig.agentCounts.num_rl_traders,
        num_governance_experts: daoConfig.agentCounts.num_governance_experts,
        num_risk_managers: daoConfig.agentCounts.num_risk_managers,
        num_market_makers: daoConfig.agentCounts.num_market_makers,
        num_whistleblowers: daoConfig.agentCounts.num_whistleblowers,
        useSharedRandom: true,
        // Apply base settings if provided
        ...this.config.baseSettings,
        // Apply per-DAO simulation params if provided
        ...daoConfig.simulationParams,
      };

      if (daoConfig.quorumPercent !== undefined) {
        const quorumPercent = daoConfig.quorumPercent > 1
          ? daoConfig.quorumPercent / 100
          : daoConfig.quorumPercent;
        simConfig.governance_config = {
          ...(simConfig.governance_config || {}),
          quorumPercentage: quorumPercent,
        };
      }

      const simulation = new DAOSimulation(simConfig);

      // Update DAO properties
      simulation.dao.daoId = daoConfig.id;
      simulation.dao.name = daoConfig.name;
      simulation.dao.tokenSymbol = daoConfig.tokenSymbol;
      simulation.dao.color = daoConfig.color;

      // Update all members with DAO ID
      for (const member of simulation.dao.members) {
        member.daoId = daoConfig.id;
      }

      // Set initial treasury funding
      const currentBalance = simulation.dao.treasury.getTokenBalance(daoConfig.tokenSymbol);
      if (currentBalance < daoConfig.initialTreasuryFunding) {
        simulation.dao.treasury.deposit(
          daoConfig.tokenSymbol,
          daoConfig.initialTreasuryFunding - currentBalance,
          0
        );
      }

      // Register token in global marketplace
      const initialPrice = daoConfig.initialTokenPrice ?? (1.0 + random() * 0.5); // Random starting price 1.0-1.5
      const totalSupply = simulation.dao.members.reduce((sum, m) => sum + m.tokens, 0) +
        simulation.dao.treasury.getTokenBalance(daoConfig.tokenSymbol);

      this.globalMarketplace.registerToken(
        daoConfig.tokenSymbol,
        daoConfig.id,
        totalSupply,
        initialPrice
      );

      // Subscribe to DAO events
      this.subscribeToDAOEvents(simulation);

      // Initialize governance processor for this DAO
      const governanceType = this.mapGovernanceRuleToType(daoConfig.governanceRule);
      const governanceProcessor = createGovernanceProcessor(
        simulation.dao,
        simulation.eventBus,
        governanceType
      );
      this.governanceProcessors.set(daoConfig.id, governanceProcessor);

      this.simulations.set(daoConfig.id, simulation);
    }
  }

  /**
   * Initialize attack agents based on scenario configuration
   */
  private initializeAttackers(): void {
    if (!this.attackConfig) {
      return;
    }

    const attackTypes = this.attackConfig.attackTypes ?? [];
    const hasSybilType = attackTypes.includes('governance_capture') || attackTypes.includes('proposal_spam');
    const hasFlashType = attackTypes.includes('whale_manipulation');

    const sybilCount = this.attackConfig.sybilAttackers ?? (hasSybilType ? 1 : 0);
    const flashCount = this.attackConfig.flashLoanAttackers ?? (hasFlashType ? 1 : 0);
    const totalAttackers = sybilCount + flashCount;

    if (totalAttackers <= 0) {
      return;
    }

    const targetDaoIds = this.resolveAttackTargets();
    if (targetDaoIds.length === 0) {
      return;
    }

    for (const daoId of targetDaoIds) {
      const sim = this.simulations.get(daoId);
      if (!sim) continue;

      const budgetPerAttacker = this.attackConfig.attackerBudget && totalAttackers > 0
        ? this.attackConfig.attackerBudget / totalAttackers
        : undefined;

      for (let i = 0; i < sybilCount; i++) {
        const attackerId = `${daoId}_sybil_attacker_${i}`;
        const attacker = new SybilAttacker(
          attackerId,
          sim,
          budgetPerAttacker ?? 1000,
          50,
          'node_0',
          this.attackConfig.sybilConfig
        );
        sim.dao.addMember(attacker);
        sim.schedule.add(attacker);
      }

      for (let i = 0; i < flashCount; i++) {
        const attackerId = `${daoId}_flashloan_attacker_${i}`;
        const attacker = new FlashLoanAttacker(
          attackerId,
          sim,
          budgetPerAttacker ?? 100,
          30,
          'node_0',
          this.attackConfig.flashLoanConfig
        );
        sim.dao.addMember(attacker);
        sim.schedule.add(attacker);
      }

      sim.agentManager.invalidateCache();
    }
  }

  /**
   * Resolve which DAOs should receive attack agents
   */
  private resolveAttackTargets(): string[] {
    const daoIds = Array.from(this.simulations.keys());
    if (daoIds.length === 0) return [];

    if (this.attackConfig?.coordinatedAttack || this.attackConfig?.targetSelection === 'all') {
      return daoIds;
    }

    const selection = this.attackConfig?.targetSelection ?? 'random';
    if (selection === 'weakest' || selection === 'strongest') {
      let chosen = daoIds[0];
      let chosenPrice = this.globalMarketplace.getTokenPrice(
        this.simulations.get(chosen)?.dao.tokenSymbol || ''
      );
      for (const id of daoIds.slice(1)) {
        const sim = this.simulations.get(id);
        if (!sim) continue;
        const price = this.globalMarketplace.getTokenPrice(sim.dao.tokenSymbol);
        const isBetter = selection === 'weakest' ? price < chosenPrice : price > chosenPrice;
        if (isBetter) {
          chosen = id;
          chosenPrice = price;
        }
      }
      return [chosen];
    }

    return [randomChoice(daoIds)];
  }

  /**
   * Map governance rule string to governance processor type
   */
  private mapGovernanceRuleToType(governanceRule: string): string {
    const ruleToTypeMap: Record<string, string> = {
      'majority': 'default',
      'supermajority': 'compound',
      'quorum': 'uniswap',
      'tokenquorum': 'aave',
      'bicameral': 'optimism',
      'dualgovernance': 'lido',
    };
    return ruleToTypeMap[governanceRule] || 'default';
  }

  private normalizeGovernanceRule(governanceRule: string): string {
    const normalized = governanceRule.toLowerCase().replace(/[-_\s]/g, '_');
    if (normalized === 'liquid_democracy') {
      return 'majority';
    }
    return normalized;
  }

  /**
   * Subscribe to events from a DAO simulation
   */
  private subscribeToDAOEvents(simulation: DAOSimulation): void {
    const daoId = simulation.dao.daoId;

    // Forward important events to city event bus
    simulation.eventBus.subscribe('proposal_created', (data) => {
      this.eventBus.publish('dao_proposal_created', { daoId, ...data });
    });

    simulation.eventBus.subscribe('tokens_staked', (data) => {
      this.eventBus.publish('dao_tokens_staked', { daoId, ...data });
    });

    simulation.eventBus.subscribe('market_shock', (data) => {
      this.eventBus.publish('dao_market_shock', { daoId, ...data });
    });

    // Listen for member transfer requests
    simulation.eventBus.subscribe('member_transfer_requested', (data) => {
      this.handleTransferRequest(data as unknown as { step: number; memberId: string; fromDaoId: string; toDaoId: string });
    });

    simulation.eventBus.subscribe('attack_detected', (data) => {
      this.handleInterDAODefenseAlert(daoId, data as Record<string, unknown>);
    });
  }

  private handleInterDAODefenseAlert(sourceDaoId: string, data: Record<string, unknown>): void {
    if (!this.interDAODefense) return;

    const alertId = typeof data.alertId === 'string' ? data.alertId : undefined;
    const attackType = typeof data.attackType === 'string' ? data.attackType : 'unknown';
    const confidence = typeof data.confidence === 'number' ? data.confidence : undefined;
    const affectedProposals = Array.isArray(data.affectedProposals)
      ? (data.affectedProposals as string[])
      : [];

    if (this.interDAODefense.crossDAOAlerts || this.interDAODefense.mutualMonitoring) {
      this.eventBus.publish('cross_dao_alert', {
        step: this.currentStep,
        sourceDaoId,
        alertId,
        attackType,
        confidence,
        affectedProposals,
      });
    }

    if (this.interDAODefense.coordinatedResponse) {
      this.eventBus.publish('coordinated_defense_action', {
        step: this.currentStep,
        sourceDaoId,
        alertId,
        attackType,
        confidence,
      });
    }

    if (this.interDAODefense.mutualVeto) {
      const vetoThreshold = this.interDAODefense.vetoThreshold ?? 0.5;
      if (confidence !== undefined && confidence < vetoThreshold) {
        return;
      }

      const sim = this.simulations.get(sourceDaoId);
      if (!sim || affectedProposals.length === 0) {
        return;
      }

      for (const proposalId of affectedProposals) {
        const proposal = sim.dao.proposals.find(p => p.uniqueId === proposalId);
        if (!proposal || proposal.status !== 'open') continue;

        proposal.status = 'rejected';
        proposal.resolvedTime = this.currentStep;

        sim.eventBus.publish('mutual_veto_triggered', {
          step: this.currentStep,
          proposalId,
          sourceDaoId,
          reason: 'Inter-DAO mutual veto',
        });
      }
    }
  }

  /**
   * Calculate tower positions in a circular layout
   */
  private calculateTowerPositions(): void {
    const numDaos = this.config.daos.length;
    const radius = 50; // Distance from center

    this.config.daos.forEach((dao, index) => {
      const angle = (index / numDaos) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.towerPositions.set(dao.id, [x, 0, z]);
    });
  }

  /**
   * Initialize bridges between all DAO pairs
   */
  private initializeBridges(): void {
    if (!this.bridgesEnabled) {
      return;
    }
    const daoIds = this.config.daos.map(d => d.id);

    for (let i = 0; i < daoIds.length; i++) {
      for (let j = i + 1; j < daoIds.length; j++) {
        const key = `${daoIds[i]}|${daoIds[j]}`;
        if (this.bridges.has(key)) continue;  // Don't overwrite existing bridges
        this.bridges.set(key, {
          fromDaoId: daoIds[i],
          toDaoId: daoIds[j],
          pendingTransfers: [],
          totalTransferred: 0,
          feeRate: this.bridgeFeeRate,
          delay: this.bridgeDelay,
        });
      }
    }
  }

  /**
   * Get bridge between two DAOs
   */
  private getBridge(daoA: string, daoB: string): Bridge | undefined {
    const key1 = `${daoA}|${daoB}`;
    const key2 = `${daoB}|${daoA}`;
    return this.bridges.get(key1) || this.bridges.get(key2);
  }

  /**
   * Handle member transfer request
   */
  private handleTransferRequest(data: {
    step: number;
    memberId: string;
    fromDaoId: string;
    toDaoId: string;
  }): void {
    if (!this.memberTransferEnabled) {
      return;
    }
    const fromSim = this.simulations.get(data.fromDaoId);
    const member = fromSim?.dao.members.find(m => m.uniqueId === data.memberId);
    const memberTokens = member?.tokens ?? 0;
    const request: MemberTransferRequest = {
      requestId: `transfer_${this.currentStep}_${data.memberId}`,
      memberId: data.memberId,
      fromDaoId: data.fromDaoId,
      toDaoId: data.toDaoId,
      requestStep: data.step,
      status: 'pending',
      transferFee: memberTokens * this.bridgeFeeRate, // Proportional fee
      cooldownSteps: 50,
    };

    this.pendingTransfers.push(request);

    this.eventBus.publish('member_transfer_queued', {
      step: this.currentStep,
      request,
    });
  }

  /**
   * Process pending member transfers
   */
  private processTransfers(): void {
    if (!this.memberTransferEnabled) {
      return;
    }
    const processed: MemberTransferRequest[] = [];

    for (const request of this.pendingTransfers) {
      if (request.status !== 'pending') continue;

      // Check if delay has passed
      if (this.currentStep < request.requestStep + this.bridgeDelay) {
        continue;
      }

      const fromSim = this.simulations.get(request.fromDaoId);
      const toSim = this.simulations.get(request.toDaoId);

      if (!fromSim || !toSim) {
        request.status = 'rejected';
        processed.push(request);
        continue;
      }

      // Find the member
      const member = fromSim.dao.members.find(m => m.uniqueId === request.memberId);
      if (!member) {
        request.status = 'rejected';
        processed.push(request);
        continue;
      }

      // Deduct transfer fee and deposit into source DAO treasury
      if (request.transferFee > 0) {
        const fee = Math.min(request.transferFee, member.tokens);
        member.tokens -= fee;
        fromSim.dao.treasury.deposit('DAO_TOKEN', fee, this.currentStep);
      }

      // Execute transfer
      member.executeTransfer(request.toDaoId, toSim);

      // Remove from source DAO and scheduler
      const memberIndex = fromSim.dao.members.indexOf(member);
      if (memberIndex > -1) {
        fromSim.dao.members.splice(memberIndex, 1);
      }
      fromSim.schedule.remove(member);

      // Add to destination scheduler if not already added by executeTransfer
      if (!toSim.schedule.has(member)) {
        toSim.schedule.add(member);
      }

      request.status = 'completed';
      processed.push(request);

      const result: MemberTransferResult = {
        success: true,
        memberId: request.memberId,
        fromDaoId: request.fromDaoId,
        toDaoId: request.toDaoId,
        fee: request.transferFee,
      };

      this.eventBus.publish('member_transfer_completed', {
        step: this.currentStep,
        result,
      });
    }

    // Remove processed transfers
    this.pendingTransfers = this.pendingTransfers.filter(
      t => !processed.includes(t)
    );
  }

  /**
   * Step all DAOs forward
   */
  async step(): Promise<void> {
    // Step each DAO simulation in randomized order to eliminate ordering bias
    const daoIds = randomShuffle(Array.from(this.simulations.keys()));
    for (const daoId of daoIds) {
      const simulation = this.simulations.get(daoId)!;
      await simulation.step();

      // Governance processing already handled by simulation.step()
      // Do not call governanceProcessor.processStep() again here

      // Process timelocks for this DAO
      const timelockController = this.timelockControllers.get(daoId);
      if (timelockController) {
        timelockController.process();
      }

      // Bicameral governance votes are checked during proposal state transitions
      // handled by the GovernanceProcessor - no per-step processing needed
    }

    // Update global marketplace prices
    this.globalMarketplace.updatePrices(this.currentStep);

    // Sync token prices from marketplace to DAOs
    for (const [daoId, simulation] of this.simulations) {
      const symbol = simulation.dao.tokenSymbol;
      const price = this.globalMarketplace.getTokenPrice(symbol);
      simulation.dao.treasury.updateTokenPrice(symbol, price);
    }

    // Process pending transfers
    this.processTransfers();

    // Cast inter-DAO votes before finalization
    this.castInterDAOVotes();

    // Process inter-DAO proposals
    this.processInterDAOProposals();

    // Process bridge transfers
    this.processBridgeTransfers();

    // Random inter-DAO activities
    this.generateRandomInterDAOActivity();

    // Increment step
    this.currentStep++;

    // Emit city step event
    this.eventBus.publish('city_step', {
      step: this.currentStep,
      state: this.getState(),
    });
  }

  /**
   * Run simulation for multiple steps
   */
  async run(steps: number): Promise<void> {
    for (let i = 0; i < steps; i++) {
      await this.step();
    }
  }

  /**
   * Process inter-DAO proposals
   */
  private processInterDAOProposals(): void {
    for (const proposal of this.interDaoProposals) {
      if (proposal.status !== 'open') continue;

      // Check if voting period ended
      if (proposal.isVotingEnded(this.currentStep)) {
        // Finalize each DAO's vote
        for (const daoId of proposal.participatingDaos) {
          const sim = this.simulations.get(daoId);
          if (sim) {
            proposal.setEligibleVoters(daoId, sim.dao.members.length);
            const quorumThreshold = this.interDAOProposalConfig?.quorumThreshold ?? 0.15;
            const approvalThreshold = this.interDAOProposalConfig?.approvalThreshold ?? 0.5;
            proposal.finalizeDAOVote(daoId, quorumThreshold, approvalThreshold);
          }
        }

        // Finalize the entire proposal
        proposal.finalize(this.currentStep);

        // Execute if approved (cast to check post-finalize status)
        if ((proposal.status as string) === 'approved') {
          proposal.execute(this.currentStep);
        }
      }
    }

    // Archive closed proposals to save memory
    const closed = this.interDaoProposals.filter(p => p.status !== 'open');
    if (closed.length > 0) {
      this.archivedProposals.push(...closed);
      this.interDaoProposals = this.interDaoProposals.filter(p => p.status === 'open');
    }
  }

  /**
   * Process bridge token transfers
   */
  private processBridgeTransfers(): void {
    if (!this.bridgesEnabled) {
      return;
    }
    for (const bridge of this.bridges.values()) {
      const completed: number[] = [];

      bridge.pendingTransfers.forEach((transfer, index) => {
        if (this.currentStep >= transfer.initiatedStep + bridge.delay) {
          // Withdraw from source treasury, then deposit into destination
          const fromSim = this.simulations.get(bridge.fromDaoId);
          const toSim = this.simulations.get(bridge.toDaoId);
          if (fromSim && toSim) {
            const available = fromSim.dao.treasury.getTokenBalance(transfer.token);
            const netAmount = transfer.amount * (1 - bridge.feeRate);
            const actualAmount = Math.min(netAmount, available);
            if (actualAmount <= 0) {
              completed.push(index);
              return; // Source can't cover transfer
            }
            fromSim.dao.treasury.withdraw(transfer.token, actualAmount, this.currentStep);
            toSim.dao.treasury.deposit(transfer.token, actualAmount, this.currentStep);
            bridge.totalTransferred += actualAmount;
          }
          completed.push(index);
        }
      });

      // Remove completed transfers
      for (let i = completed.length - 1; i >= 0; i--) {
        bridge.pendingTransfers.splice(completed[i], 1);
      }
    }
  }

  /**
   * Generate random inter-DAO activity
   */
  private generateRandomInterDAOActivity(): void {
    if (!this.enableInterDAOProposals) return;

    // Small chance of new inter-DAO proposal each step
    if (random() < this.interDAOProposalRate) {
      this.createRandomInterDAOProposal();
    }

    // Random member considers transferring
    if (this.memberTransferEnabled && random() < this.memberTransferRate) {
      this.considerRandomMemberTransfer();
    }

    // Random cross-DAO token swap
    if (random() < this.tokenSwapRate) {
      this.executeRandomTokenSwap();
    }
  }

  /**
   * Cast votes on open inter-DAO proposals
   */
  private castInterDAOVotes(): void {
    const reminderWindowFraction = 0.2;
    const reminderBoost = 0.1;

    for (const proposal of this.interDaoProposals) {
      if (proposal.status !== 'open') continue;

      const votingEnd = proposal.creationStep + proposal.votingPeriod;
      const remaining = votingEnd - this.currentStep;
      const reminderWindow = Math.max(1, Math.floor(proposal.votingPeriod * reminderWindowFraction));
      const inReminderWindow = remaining <= reminderWindow && remaining >= 0;

      for (const daoId of proposal.participatingDaos) {
        const sim = this.simulations.get(daoId);
        if (!sim) continue;

        // Ensure delegation cache is correct per DAO
        DelegationResolver.setCurrentStep(this.currentStep, daoId);

        for (const member of sim.dao.members) {
          if (proposal.hasVoted(daoId, member.uniqueId)) {
            continue;
          }

          const alreadyConsidered = proposal.hasConsidered(daoId, member.uniqueId);

          // First-pass consideration
          if (!alreadyConsidered) {
            proposal.markConsidered(daoId, member.uniqueId);

            const probability = member.getEffectiveVotingProbability();
            if (random() >= probability) {
              continue;
            }

            const weight = DelegationResolver.resolveVotingPower(member);
            if (weight <= 0) continue;

            const inFavor = member.decideVote(proposal.title) === 'yes';
            if (proposal.vote(daoId, member.uniqueId, inFavor, weight, this.currentStep)) {
              member.recordExternalVote();
            }
            continue;
          }

          // Reminder pass near end of voting window
          if (inReminderWindow && !proposal.hasReminded(daoId, member.uniqueId)) {
            proposal.markReminded(daoId, member.uniqueId);

            const probability = Math.min(1, member.getEffectiveVotingProbability() * (1 + reminderBoost));
            if (random() >= probability) {
              continue;
            }

            const weight = DelegationResolver.resolveVotingPower(member);
            if (weight <= 0) continue;

            const inFavor = member.decideVote(proposal.title) === 'yes';
            if (proposal.vote(daoId, member.uniqueId, inFavor, weight, this.currentStep)) {
              member.recordExternalVote();
            }
          }
        }
      }
    }
  }

  /**
   * Create a random inter-DAO proposal
   */
  private createRandomInterDAOProposal(): void {
    const daoIds = Array.from(this.simulations.keys());
    if (daoIds.length < 2) return;

    const creatorDaoId = randomChoice(daoIds);
    const otherDaos = daoIds.filter(id => id !== creatorDaoId);
    const partnerDaoId = randomChoice(otherDaos);

    const creatorSim = this.simulations.get(creatorDaoId);
    if (!creatorSim || creatorSim.dao.members.length === 0) return;

    const creator = randomChoice(creatorSim.dao.members);
    const proposalTypes = this.interDAOProposalConfig?.proposalTypes
      ? [...this.interDAOProposalConfig.proposalTypes]
      : (['collaboration', 'treaty', 'resource_sharing', 'joint_venture'] as const);
    const proposalType = randomChoice([...proposalTypes]);

    const votingPeriod = this.interDAOProposalConfig?.votingPeriod ?? 100;
    const proposal = new InterDAOProposal(
      `inter_dao_${this.currentStep}_${this.interDaoProposals.length}`,
      `${proposalType.charAt(0).toUpperCase() + proposalType.slice(1)} Proposal`,
      `A ${proposalType} between ${creatorDaoId} and ${partnerDaoId}`,
      proposalType,
      creatorDaoId,
      creator.uniqueId,
      [creatorDaoId, partnerDaoId],
      this.currentStep,
      votingPeriod,
      this.eventBus
    );

    // Snapshot eligible voters per DAO at creation time
    for (const daoId of [creatorDaoId, partnerDaoId]) {
      const sim = this.simulations.get(daoId);
      if (sim) {
        proposal.eligibleVotersSnapshot.set(daoId, sim.dao.members.length);
      }
    }

    if (this.interDAOProposalConfig?.requiredApprovalRatio !== undefined) {
      const ratio = this.interDAOProposalConfig.requiredApprovalRatio;
      proposal.requiredApprovalCount = Math.max(1, Math.ceil(ratio * proposal.participatingDaos.length));
    }

    if (proposalType === 'collaboration' || proposalType === 'joint_venture') {
      proposal.sharedBudget = 10000 + random() * 40000;
      proposal.contributionRatios = {
        [creatorDaoId]: 0.5,
        [partnerDaoId]: 0.5,
      };
    }

    if (proposalType === 'resource_sharing') {
      proposal.resourceType = 'tokens';
      proposal.resourceAmount = 5000 + random() * 15000;
    }

    this.interDaoProposals.push(proposal);

    this.eventBus.publish('inter_dao_proposal_created', {
      step: this.currentStep,
      proposal: proposal.getState(),
    });
  }

  /**
   * Consider a random member transfer
   */
  private considerRandomMemberTransfer(): void {
    if (!this.memberTransferEnabled) return;
    const daoIds = Array.from(this.simulations.keys());
    if (daoIds.length < 2) return;

    const fromDaoId = randomChoice(daoIds);
    const fromSim = this.simulations.get(fromDaoId);
    if (!fromSim || fromSim.dao.members.length === 0) return;

    // Find a member who can transfer
    const eligibleMembers = fromSim.dao.members.filter(m => m.canTransfer());
    if (eligibleMembers.length === 0) return;

    const member = randomChoice(eligibleMembers);
    const otherDaos = daoIds.filter(id => id !== fromDaoId);
    const toDaoId = randomChoice(otherDaos);

    // Small chance based on token price difference
    const fromPrice = this.globalMarketplace.getTokenPrice(fromSim.dao.tokenSymbol);
    const toSim = this.simulations.get(toDaoId);
    if (!toSim) return;

    const toPrice = this.globalMarketplace.getTokenPrice(toSim.dao.tokenSymbol);

    // More likely to transfer to DAO with higher token price
    const transferChance = toPrice > fromPrice ? 0.3 : 0.1;
    if (random() < transferChance) {
      member.requestTransfer(toDaoId);
    }
  }

  /**
   * Execute a random token swap in the marketplace
   */
  private executeRandomTokenSwap(): void {
    const tokens = this.globalMarketplace.getAllTokens();
    if (tokens.length < 2) return;

    const fromToken = randomChoice(tokens);
    const toToken = randomChoice(tokens.filter(t => t !== fromToken));
    const amount = 100 + random() * 900;

    this.globalMarketplace.swap(fromToken, toToken, amount, this.currentStep);
  }

  /**
   * Create an inter-DAO proposal programmatically
   */
  createInterDAOProposal(
    title: string,
    description: string,
    proposalType: 'collaboration' | 'treaty' | 'resource_sharing' | 'joint_venture',
    creatorDaoId: string,
    creatorMemberId: string,
    participatingDaos: string[]
  ): InterDAOProposal | null {
    if (!this.enableInterDAOProposals) return null;

    const proposal = new InterDAOProposal(
      `inter_dao_${this.currentStep}_${this.interDaoProposals.length}`,
      title,
      description,
      proposalType,
      creatorDaoId,
      creatorMemberId,
      participatingDaos,
      this.currentStep,
      100,
      this.eventBus
    );

    // Snapshot eligible voters per DAO at creation time
    for (const daoId of participatingDaos) {
      const sim = this.simulations.get(daoId);
      if (sim) {
        proposal.eligibleVotersSnapshot.set(daoId, sim.dao.members.length);
      }
    }

    this.interDaoProposals.push(proposal);
    return proposal;
  }

  /**
   * Get a specific DAO simulation
   */
  getSimulation(daoId: string): DAOSimulation | undefined {
    return this.simulations.get(daoId);
  }

  /**
   * Get a specific DAO
   */
  getDAO(daoId: string): DAO | undefined {
    return this.simulations.get(daoId)?.dao;
  }

  /**
   * Get all DAOs
   */
  getAllDAOs(): DAO[] {
    return Array.from(this.simulations.values()).map(s => s.dao);
  }

  /**
   * Get current city state for broadcasting
   */
  getState(): DAOCityState {
    const daoStates: DAOState[] = [];

    for (const [daoId, simulation] of this.simulations) {
      const dao = simulation.dao;
      daoStates.push({
        id: daoId,
        name: dao.name,
        tokenSymbol: dao.tokenSymbol,
        tokenPrice: this.globalMarketplace.getTokenPrice(dao.tokenSymbol),
        treasuryBalance: dao.treasury.getTokenBalance(dao.tokenSymbol),
        memberCount: dao.members.length,
        activeProposals: dao.proposals.filter(p => p.status === 'open').length,
        totalProposals: dao.proposals.length,
        projectCount: dao.projects.length,
        guildCount: dao.guilds.length,
        color: dao.color,
      });
    }

    const bridgeStates: BridgeState[] = [];
    for (const bridge of this.bridges.values()) {
      bridgeStates.push({
        fromDaoId: bridge.fromDaoId,
        toDaoId: bridge.toDaoId,
        pendingTransfers: bridge.pendingTransfers.length,
        totalTransferred: bridge.totalTransferred,
        feeRate: bridge.feeRate,
      });
    }

    return {
      currentStep: this.currentStep,
      daos: daoStates,
      globalMarketplace: this.globalMarketplace.getState(),
      interDaoProposals: [
        ...this.interDaoProposals.map(p => p.getState()),
        ...this.archivedProposals.map(p => p.getState()),
      ],
      bridges: bridgeStates,
      recentTransfers: this.pendingTransfers.slice(-10).map(t => ({...t})),
    };
  }

  /**
   * Get token rankings
   */
  getTokenRankings(): TokenRanking[] {
    const rankings = this.globalMarketplace.getTokenRankings();

    // Enrich with DAO info
    for (const ranking of rankings) {
      const sim = this.simulations.get(ranking.daoId);
      if (sim) {
        ranking.daoName = sim.dao.name;
        ranking.color = sim.dao.color;
      }
    }

    return rankings;
  }

  /**
   * Get network data for 3D visualization
   */
  getNetworkData(): DAOCityNetworkData {
    const towers: DAOTowerData[] = [];
    const membersByDao: Record<string, DAOMemberCityData[]> = {};

    for (const [daoId, simulation] of this.simulations) {
      const dao = simulation.dao;
      const position = this.towerPositions.get(daoId) || [0, 0, 0];
      const ranking = this.getTokenRankings().find(r => r.daoId === daoId);

      towers.push({
        daoId,
        name: dao.name,
        tokenSymbol: dao.tokenSymbol,
        color: dao.color,
        position,
        height: Math.max(10, dao.members.length * 2), // Height based on members
        memberCount: dao.members.length,
        treasuryBalance: dao.treasury.getTokenBalance(dao.tokenSymbol),
        tokenPrice: this.globalMarketplace.getTokenPrice(dao.tokenSymbol),
        rank: ranking?.rank || 0,
      });

      // Collect member data
      membersByDao[daoId] = dao.members.map((m, index) => ({
        id: m.uniqueId,
        daoId,
        type: m.constructor.name,
        activity: this.getMemberActivity(m),
        floor: Math.floor(index / 10), // 10 members per floor
        tokens: m.tokens,
        reputation: m.reputation,
        isTransferring: m.isTransferring,
        transferTargetDaoId: m.transferTargetDaoId || undefined,
      }));
    }

    // Build inter-DAO edges
    const interDaoEdges: InterDAOEdge[] = [];

    // Edges from bridges with activity
    for (const bridge of this.bridges.values()) {
      if (bridge.totalTransferred > 0 || bridge.pendingTransfers.length > 0) {
        interDaoEdges.push({
          fromDaoId: bridge.fromDaoId,
          toDaoId: bridge.toDaoId,
          type: 'bridge',
          weight: bridge.totalTransferred / 10000, // Normalize
          active: bridge.pendingTransfers.length > 0,
        });
      }
    }

    // Edges from active inter-DAO proposals
    for (const proposal of this.interDaoProposals) {
      if (proposal.status === 'open') {
        for (let i = 0; i < proposal.participatingDaos.length - 1; i++) {
          interDaoEdges.push({
            fromDaoId: proposal.participatingDaos[i],
            toDaoId: proposal.participatingDaos[i + 1],
            type: 'proposal',
            weight: 1,
            active: true,
          });
        }
      }
    }

    // Edges from pending transfers
    for (const transfer of this.pendingTransfers) {
      interDaoEdges.push({
        fromDaoId: transfer.fromDaoId,
        toDaoId: transfer.toDaoId,
        type: 'transfer',
        weight: 0.5,
        active: true,
      });
    }

    return {
      towers,
      interDaoEdges,
      membersByDao,
    };
  }

  /**
   * Get member activity description
   */
  private getMemberActivity(member: DAOMember): string {
    if (member.isTransferring) return 'transferring';
    if (member.stakedTokens > 0) return 'staking';
    if (member.votes.size > 0) return 'voting';
    if (member.guild) return 'guild_member';
    return 'idle';
  }

  /**
   * Get the event bus for external subscriptions
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get current step
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Get the global marketplace
   */
  getGlobalMarketplace(): GlobalMarketplace {
    return this.globalMarketplace;
  }

  // ===========================================================================
  // DIGITAL TWIN SUPPORT
  // ===========================================================================

  /**
   * Load digital twins into the city
   * @param twinIds - Array of twin IDs to load (e.g., ['uniswap', 'compound'])
   */
  async loadDigitalTwins(twinIds: string[]): Promise<{
    loaded: string[];
    failed: string[];
    errors: Record<string, string>;
  }> {
    const loaded: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string> = {};

    for (const twinId of twinIds) {
      try {
        const result = await loadTwin(twinId);

        if (result.success === true) {
          const twinConfig = transformToDAOConfig(result.data);
          await this.initializeDigitalTwin(twinConfig);
          this.digitalTwins.set(twinId, twinConfig);
          loaded.push(twinId);

          this.eventBus.publish('digital_twin_loaded', {
            step: this.currentStep,
            twinId,
            name: twinConfig.name,
            tokenSymbol: twinConfig.tokenSymbol,
          });
        } else {
          failed.push(twinId);
          errors[twinId] = result.error;
        }
      } catch (error) {
        failed.push(twinId);
        errors[twinId] = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Recalculate tower positions with new DAOs
    this.calculateTowerPositions();

    // Initialize bridges for new DAOs
    this.initializeBridges();

    return { loaded, failed, errors };
  }

  /**
   * Initialize a digital twin as a simulation
   */
  private async initializeDigitalTwin(twinConfig: TwinDAOConfig): Promise<void> {
    // Build simulation config from twin
    const simConfig: DAOSimulationConfig = {
      governance_rule: this.getGovernanceRuleForTwin(twinConfig),
      staking_interest_rate: 0.05,  // Default
      useSharedRandom: true,
      // Let twin agent factory handle member creation
      num_passive_members: 0,
      num_developers: 0,
      num_investors: 0,
      num_traders: 0,
    };

    const simulation = new DAOSimulation(simConfig);

    // Update DAO properties from twin
    simulation.dao.daoId = twinConfig.id;
    simulation.dao.name = twinConfig.name;
    simulation.dao.tokenSymbol = twinConfig.tokenSymbol;
    simulation.dao.color = this.getTwinColor(twinConfig.id);

    // Create agents from twin configuration
    const factory = new TwinAgentFactory(simulation, twinConfig.id);
    const factoryResult = factory.createAgentsForTwin(twinConfig);

    // Add agents to DAO and set their daoId
    const twinDaoId = twinConfig.id;
    for (const agent of factoryResult.agents) {
      agent.daoId = twinDaoId;
      simulation.dao.addMember(agent);
    }

    // Initialize twin-specific governance systems
    if (twinConfig.isBicameral) {
      const bicameral = this.createBicameralForTwin(twinConfig, simulation.dao);
      this.bicameralSystems.set(twinConfig.id, bicameral);
    }

    // Initialize timelock controller
    const timelockPreset = twinConfig.hasDualGovernance ? 'dual_governance' : 'standard';
    const timelockController = createTimelockController(simulation.dao, timelockPreset);
    this.timelockControllers.set(twinConfig.id, timelockController);

    // Initialize governance processor with twin-specific type
    const governanceType = this.getTwinGovernanceType(twinConfig);
    const governanceProcessor = createGovernanceProcessor(
      simulation.dao,
      simulation.eventBus,
      governanceType
    );
    this.governanceProcessors.set(twinConfig.id, governanceProcessor);

    // Register token in marketplace
    const initialPrice = this.getInitialTokenPrice(twinConfig);
    const totalSupply = factoryResult.summary.totalTokensDistributed + twinConfig.initialTreasury;

    this.globalMarketplace.registerToken(
      twinConfig.tokenSymbol,
      twinConfig.id,
      totalSupply,
      initialPrice
    );

    // Subscribe to events
    this.subscribeToDAOEvents(simulation);

    // Add to simulations
    this.simulations.set(twinConfig.id, simulation);

    // Update config.daos array with twin
    this.config.daos.push({
      id: twinConfig.id,
      name: twinConfig.name,
      tokenSymbol: twinConfig.tokenSymbol,
      initialTreasuryFunding: twinConfig.initialTreasury,
      governanceRule: this.getGovernanceRuleForTwin(twinConfig),
      agentCounts: {},
      color: this.getTwinColor(twinConfig.id),
    });
  }

  /**
   * Get governance rule for a twin
   */
  private getGovernanceRuleForTwin(twinConfig: TwinDAOConfig): string {
    if (twinConfig.isBicameral) return 'bicameral';
    if (twinConfig.hasDualGovernance) return 'dualgovernance';
    return 'tokenquorum';
  }

  /**
   * Create bicameral system for a twin
   */
  private createBicameralForTwin(twinConfig: TwinDAOConfig, dao: DAO): BicameralGovernance {
    // Use preset based on twin characteristics
    if (twinConfig.name.toLowerCase().includes('optimism')) {
      return createOptimismBicameral(dao);
    }
    if (twinConfig.name.toLowerCase().includes('arbitrum')) {
      return createArbitrumGovernance(dao);
    }

    // Generic bicameral
    const bicameral = new BicameralGovernance(dao);
    bicameral.addHouse({
      houseType: 'token_house',
      name: 'Token House',
      description: 'Token holder governance',
      quorumPercent: twinConfig.tokenHouse?.quorumPercent || 30,
      approvalThresholdPercent: twinConfig.tokenHouse?.approvalThresholdPercent || 51,
      vetoCapable: false,
      vetoPeriodSteps: 0,
      voteWeightModel: 'token',
      primaryDecisions: ['general'],
    });

    if (twinConfig.citizensHouse?.vetoEnabled) {
      bicameral.addHouse({
        houseType: 'citizens_house',
        name: 'Citizens House',
        description: 'Citizens with veto power',
        quorumPercent: 20,
        approvalThresholdPercent: 51,
        vetoCapable: true,
        vetoPeriodSteps: twinConfig.citizensHouse?.vetoPeriodSteps || 168,
        voteWeightModel: 'one_person_one_vote',
        primaryDecisions: ['vetoes'],
      });
    }

    return bicameral;
  }

  /**
   * Get governance processor type for a digital twin
   */
  private getTwinGovernanceType(twinConfig: TwinDAOConfig): string {
    // Map twin ID/name to governance processor type
    const id = twinConfig.id.toLowerCase();
    const name = twinConfig.name.toLowerCase();

    if (id.includes('uniswap') || name.includes('uniswap')) return 'uniswap';
    if (id.includes('compound') || name.includes('compound')) return 'compound';
    if (id.includes('aave') || name.includes('aave')) return 'aave';
    if (id.includes('arbitrum') || name.includes('arbitrum')) return 'arbitrum';
    if (id.includes('optimism') || name.includes('optimism')) return 'optimism';
    if (id.includes('ens') || name.includes('ens')) return 'ens';
    if (id.includes('lido') || name.includes('lido')) return 'lido';
    if (id.includes('gitcoin') || name.includes('gitcoin')) return 'gitcoin';
    if (id.includes('maker') || name.includes('maker') || name.includes('sky')) return 'maker';

    return 'default';
  }

  /**
   * Get color for a digital twin
   */
  private getTwinColor(twinId: string): string {
    const twinColors: Record<string, string> = {
      uniswap: '#FF007A',
      compound: '#00D395',
      aave: '#B6509E',
      arbitrum: '#12AAFF',
      optimism: '#FF0420',
      ens: '#5298FF',
      lido: '#00A3FF',
      gitcoin: '#0FCE7C',
      maker: '#1AAB9B',
    };
    return twinColors[twinId] || `#${Math.floor(random() * 16777215).toString(16).padStart(6, '0')}`;
  }

  /**
   * Get initial token price for a twin
   */
  private getInitialTokenPrice(twinConfig: TwinDAOConfig): number {
    // Could be enhanced to use real market data
    const basePrices: Record<string, number> = {
      UNI: 8.0,
      COMP: 50.0,
      AAVE: 100.0,
      ARB: 1.2,
      OP: 2.0,
      ENS: 15.0,
      LDO: 2.5,
      GTC: 1.5,
      MKR: 1500.0,
    };
    return basePrices[twinConfig.tokenSymbol] || 1.0 + random() * 9.0;
  }

  /**
   * Get available digital twins
   */
  async getAvailableDigitalTwins(): Promise<Array<{ id: string; name: string; category: string[] }>> {
    const twins = await getAvailableTwins();
    return twins.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
    }));
  }

  /**
   * Get loaded digital twins
   */
  getLoadedDigitalTwins(): Map<string, TwinDAOConfig> {
    return this.digitalTwins;
  }

  /**
   * Check if a DAO is a digital twin
   */
  isDigitalTwin(daoId: string): boolean {
    return this.digitalTwins.has(daoId);
  }

  /**
   * Get digital twin config for a DAO
   */
  getDigitalTwinConfig(daoId: string): TwinDAOConfig | undefined {
    return this.digitalTwins.get(daoId);
  }

  /**
   * Get timelock controller for a DAO
   */
  getTimelockController(daoId: string): TimelockController | undefined {
    return this.timelockControllers.get(daoId);
  }

  /**
   * Get bicameral system for a DAO
   */
  getBicameralSystem(daoId: string): BicameralGovernance | undefined {
    return this.bicameralSystems.get(daoId);
  }

  /**
   * Get governance processor for a DAO
   */
  getGovernanceProcessor(daoId: string): GovernanceProcessor | undefined {
    return this.governanceProcessors.get(daoId);
  }

}
