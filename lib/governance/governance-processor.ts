/**
 * Governance Processor
 *
 * Integrates all governance systems into the simulation step loop.
 * Processes timelocks, multi-stage proposals, bicameral voting,
 * and all twin-specific governance mechanisms.
 */

import type { DAO } from '../data-structures/dao';
import type { EventBus } from '../utils/event-bus';
import type { MultiStageProposal } from '../data-structures/multi-stage-proposal';
import { ProposalStateMachine, type StateMachineConfig } from './proposal-state-machine';
import { TimelockController } from '../data-structures/timelock';
import { BicameralGovernance } from '../data-structures/governance-house';
import { EasyTrackController } from './easy-track';
import { RetroPGFController } from './retropgf';
import { TokenLockingController } from './token-locking';
import { ApprovalVotingController } from './approval-voting';
import { RageQuitController } from './rage-quit';
import { BridgeTimelockController } from './bridge-timelock';
import { GovernanceCycleController } from './governance-cycle';
import { ProposalGatesController } from './proposal-gates';
import { CitizenshipController } from './citizenship';
import { StETHSupplyTracker } from './steth-supply';

// =============================================================================
// TYPES
// =============================================================================

export interface GovernanceSystemsConfig {
  // Core systems
  timelockEnabled?: boolean;
  bicameralEnabled?: boolean;
  multiStageEnabled?: boolean;

  // Voting thresholds
  quorumPercent?: number;
  approvalThresholdPercent?: number;

  // Twin-specific systems
  easyTrackEnabled?: boolean;      // Lido
  retroPGFEnabled?: boolean;       // Optimism
  tokenLockingEnabled?: boolean;   // MakerDAO
  approvalVotingEnabled?: boolean; // MakerDAO
  rageQuitEnabled?: boolean;       // Lido
  bridgeTimelockEnabled?: boolean; // Arbitrum
  governanceCyclesEnabled?: boolean; // Optimism
  proposalGatesEnabled?: boolean;  // All
  citizenshipEnabled?: boolean;    // Optimism
  stethTrackingEnabled?: boolean;  // Lido
}

export interface GovernanceSystems {
  timelock?: TimelockController;
  bicameral?: BicameralGovernance;
  stateMachines: Map<string, ProposalStateMachine>;

  // Twin-specific
  easyTrack?: EasyTrackController;
  retroPGF?: RetroPGFController;
  tokenLocking?: TokenLockingController;
  approvalVoting?: ApprovalVotingController;
  rageQuit?: RageQuitController;
  bridgeTimelock?: BridgeTimelockController;
  governanceCycles?: GovernanceCycleController;
  proposalGates?: ProposalGatesController;
  citizenship?: CitizenshipController;
  stethTracker?: StETHSupplyTracker;
}

// =============================================================================
// GOVERNANCE PROCESSOR
// =============================================================================

export class GovernanceProcessor {
  private dao: DAO;
  private eventBus: EventBus;
  private systems: GovernanceSystems;
  private config: GovernanceSystemsConfig;

  constructor(
    dao: DAO,
    eventBus: EventBus,
    config: GovernanceSystemsConfig = {}
  ) {
    this.dao = dao;
    this.eventBus = eventBus;
    this.config = config;

    this.systems = {
      stateMachines: new Map(),
    };

    // Initialize enabled systems
    this.initializeSystems();
  }

  /**
   * Initialize governance systems based on config
   */
  private initializeSystems(): void {
    if (this.config.timelockEnabled) {
      this.systems.timelock = new TimelockController(this.dao);
    }

    if (this.config.bicameralEnabled) {
      this.systems.bicameral = new BicameralGovernance(this.dao);
    }

    if (this.config.easyTrackEnabled) {
      this.systems.easyTrack = new EasyTrackController();
      this.systems.easyTrack.setEventBus(this.eventBus);
    }

    if (this.config.retroPGFEnabled) {
      this.systems.retroPGF = new RetroPGFController();
      this.systems.retroPGF.setEventBus(this.eventBus);
    }

    if (this.config.tokenLockingEnabled) {
      this.systems.tokenLocking = new TokenLockingController();
      this.systems.tokenLocking.setEventBus(this.eventBus);
    }

    if (this.config.approvalVotingEnabled) {
      this.systems.approvalVoting = new ApprovalVotingController();
      this.systems.approvalVoting.setEventBus(this.eventBus);
    }

    if (this.config.rageQuitEnabled) {
      this.systems.rageQuit = new RageQuitController();
      this.systems.rageQuit.setEventBus(this.eventBus);
    }

    if (this.config.bridgeTimelockEnabled) {
      this.systems.bridgeTimelock = new BridgeTimelockController();
      this.systems.bridgeTimelock.setEventBus(this.eventBus);
    }

    if (this.config.governanceCyclesEnabled) {
      this.systems.governanceCycles = new GovernanceCycleController();
      this.systems.governanceCycles.setEventBus(this.eventBus);
    }

    if (this.config.proposalGatesEnabled) {
      this.systems.proposalGates = new ProposalGatesController();
      this.systems.proposalGates.setEventBus(this.eventBus);
    }

    if (this.config.citizenshipEnabled) {
      this.systems.citizenship = new CitizenshipController();
      this.systems.citizenship.setEventBus(this.eventBus);
    }

    if (this.config.stethTrackingEnabled) {
      this.systems.stethTracker = new StETHSupplyTracker();
      this.systems.stethTracker.setEventBus(this.eventBus);
    }
  }

  /**
   * Process all governance systems for a single step
   */
  processStep(currentStep: number): void {
    // Update supply trackers
    this.updateSupplyTrackers(currentStep);

    // Check rage quit state (may block all governance)
    if (this.systems.rageQuit?.isGovernanceBlocked()) {
      this.eventBus.publish('governance_blocked', {
        step: currentStep,
        reason: 'rage_quit_active',
      });
      // Still process escrow withdrawals
      this.systems.rageQuit.checkStateTransitions(currentStep);
      return;
    }

    // Process governance cycles
    if (this.systems.governanceCycles) {
      this.systems.governanceCycles.processCycle(currentStep);
    }

    // Process multi-stage proposals
    this.processMultiStageProposals(currentStep);

    // Process timelocks
    this.processTimelocks(currentStep);

    // Process Easy Track motions
    this.processEasyTrack(currentStep);

    // Process approval voting spells
    this.processApprovalVoting(currentStep);

    // Process bridge timelocks
    this.processBridgeTimelocks(currentStep);

    // Process RetroPGF rounds
    this.processRetroPGF(currentStep);

    // Process citizenship expirations
    this.processCitizenship(currentStep);

    // Process rage quit state
    if (this.systems.rageQuit) {
      this.systems.rageQuit.checkStateTransitions(currentStep);
    }
  }

  /**
   * Update supply trackers
   */
  private updateSupplyTrackers(currentStep: number): void {
    const totalTokens = this.dao.members.reduce((sum, m) => sum + m.tokens, 0);

    if (this.systems.easyTrack) {
      this.systems.easyTrack.updateTotalVotingPower(totalTokens);
    }

    if (this.systems.approvalVoting) {
      this.systems.approvalVoting.updateTotalVotingPower(
        this.systems.tokenLocking?.totalLocked || totalTokens
      );
    }

    if (this.systems.proposalGates) {
      this.systems.proposalGates.updateTotalVotableSupply(totalTokens);
    }

    if (this.systems.rageQuit) {
      const stakedSupply = this.systems.stethTracker?.getTotalCombined() ||
                          this.dao.members.reduce((sum, m) => sum + m.stakedTokens, 0);
      this.systems.rageQuit.updateTotalStakedSupply(stakedSupply);
    }

    if (this.systems.stethTracker) {
      this.systems.stethTracker.processStep(currentStep);
    }
  }

  /**
   * Process multi-stage proposals
   */
  private processMultiStageProposals(currentStep: number): void {
    if (!this.config.multiStageEnabled) return;

    for (const proposal of this.dao.proposals) {
      const multiStage = proposal as unknown as MultiStageProposal;

      // Skip if not a multi-stage proposal
      if (!multiStage.stageConfigs || multiStage.isComplete) continue;

      // Get or create state machine
      let stateMachine = this.systems.stateMachines.get(proposal.uniqueId);
      if (!stateMachine) {
        stateMachine = this.createStateMachine(multiStage);
        this.systems.stateMachines.set(proposal.uniqueId, stateMachine);
      }

      // Process state machine
      const advanced = stateMachine.process();

      // Handle stage completion
      if (advanced) {
        this.handleStageAdvancement(multiStage, currentStep);
      }
    }
  }

  /**
   * Create state machine for a proposal
   */
  private createStateMachine(proposal: MultiStageProposal): ProposalStateMachine {
    const config: StateMachineConfig = {
      quorumPercent: this.config.quorumPercent ?? 5,
      approvalThresholdPercent: this.config.approvalThresholdPercent ?? 51,
      isBicameral: this.config.bicameralEnabled,
      hasDualGovernance: this.config.rageQuitEnabled,
    };

    return new ProposalStateMachine(proposal, this.dao, config);
  }

  /**
   * Handle stage advancement
   */
  private handleStageAdvancement(proposal: MultiStageProposal, currentStep: number): void {
    const newStage = proposal.currentStage;

    // If entering timelock, schedule it
    if (newStage === 'timelock' && this.systems.timelock) {
      const delaySteps = this.systems.rageQuit?.getDynamicTimelockSteps() ||
                        proposal.currentStageConfig?.durationSteps ||
                        48;
      this.systems.timelock.schedule(proposal, delaySteps);
    }

    // If entering execution stage, mark as ready
    if (newStage === 'execution') {
      this.eventBus.publish('proposal_ready_for_execution', {
        step: currentStep,
        proposalId: proposal.uniqueId,
        title: proposal.title,
      });
    }
  }

  /**
   * Process timelocks
   */
  private processTimelocks(currentStep: number): void {
    if (!this.systems.timelock) return;

    const readyEntries = this.systems.timelock.getReady(currentStep);

    for (const entry of readyEntries) {
      // Check for veto by looking up the proposal
      if (this.systems.rageQuit) {
        const proposal = this.dao.proposals.find(p => p.uniqueId === entry.proposalId);
        if (proposal && 'isVetoThresholdReached' in proposal) {
          const multiStage = proposal as MultiStageProposal;
          const totalStakeSupply = this.systems.stethTracker?.getTotalCombined() ||
                                  this.dao.members.reduce((sum, m) => sum + m.stakedTokens, 0);

          if (multiStage.isVetoThresholdReached?.(totalStakeSupply)) {
            this.systems.timelock.veto(entry.proposalId, 'Veto threshold reached');
            continue;
          }
        }
      }

      // Execute
      this.systems.timelock.markExecuted(entry.proposalId);
      this.executeProposal(entry.proposalId, currentStep);
    }
  }

  /**
   * Process Easy Track motions
   */
  private processEasyTrack(currentStep: number): void {
    if (!this.systems.easyTrack) return;

    const readyMotions = this.systems.easyTrack.processMotions(currentStep);

    for (const motion of readyMotions) {
      this.systems.easyTrack.executeMotion(motion, this.dao);
    }
  }

  /**
   * Process approval voting spells
   */
  private processApprovalVoting(currentStep: number): void {
    if (!this.systems.approvalVoting) return;

    this.systems.approvalVoting.processSpells(currentStep);

    // Check if we should execute the current hat
    const hat = this.systems.approvalVoting.getCurrentHat();
    if (hat) {
      const executed = this.systems.approvalVoting.executeHat(currentStep);
      if (executed) {
        this.eventBus.publish('executive_spell_enacted', {
          step: currentStep,
          spellId: executed.id,
          title: executed.title,
        });
      }
    }
  }

  /**
   * Process bridge timelocks
   */
  private processBridgeTimelocks(currentStep: number): void {
    if (!this.systems.bridgeTimelock) return;

    const ready = this.systems.bridgeTimelock.processTimelocks(currentStep);

    for (const entry of ready) {
      this.systems.bridgeTimelock.execute(entry.id, currentStep);
      this.executeProposal(entry.proposalId, currentStep);
    }
  }

  /**
   * Process RetroPGF rounds
   */
  private processRetroPGF(currentStep: number): void {
    if (!this.systems.retroPGF) return;

    const activeRound = this.systems.retroPGF.getActiveRound();
    if (activeRound) {
      this.systems.retroPGF.processRound(activeRound.id, currentStep);
    }
  }

  /**
   * Process citizenship
   */
  private processCitizenship(currentStep: number): void {
    if (!this.systems.citizenship) return;

    this.systems.citizenship.processExpirations(currentStep);
  }

  /**
   * Execute a proposal
   */
  private executeProposal(proposalId: string, currentStep: number): void {
    const proposal = this.dao.proposals.find(p => p.uniqueId === proposalId);
    if (!proposal) return;

    proposal.status = 'completed';

    // Execute funding if applicable
    if (proposal.fundingGoal > 0) {
      this.dao.treasury.withdraw(
        this.dao.tokenSymbol,
        proposal.fundingGoal,
        currentStep
      );
    }

    this.eventBus.publish('proposal_executed', {
      step: currentStep,
      proposalId,
      title: proposal.title,
      fundingGoal: proposal.fundingGoal,
    });
  }

  /**
   * Get governance systems
   */
  getSystems(): GovernanceSystems {
    return this.systems;
  }

  /**
   * Set a specific system
   */
  setSystem<K extends keyof GovernanceSystems>(
    key: K,
    system: GovernanceSystems[K]
  ): void {
    this.systems[key] = system;
  }

  /**
   * Check if a proposer can create a proposal at a given stage
   */
  canCreateProposal(
    proposerId: string,
    stage: 'temperature_check' | 'on_chain' | 'execution',
    proposerData: {
      delegatedTokens?: number;
      tokensHeld?: number;
      reputation?: number;
    }
  ): { allowed: boolean; reason?: string } {
    // Check governance cycles
    if (this.systems.governanceCycles && !this.systems.governanceCycles.canSubmitProposal()) {
      return {
        allowed: false,
        reason: 'Not in proposal submission phase of governance cycle',
      };
    }

    // Check proposal gates
    if (this.systems.proposalGates) {
      const result = this.systems.proposalGates.checkGates(
        proposerId,
        stage,
        proposerData
      );

      if (!result.passed) {
        const failedGate = result.results.find(r => !r.passed);
        return {
          allowed: false,
          reason: failedGate?.message || 'Gate check failed',
        };
      }
    }

    // Check token locking (MakerDAO)
    if (this.systems.tokenLocking && !this.systems.tokenLocking.canVote(proposerId)) {
      return {
        allowed: false,
        reason: 'Must lock tokens to participate in governance',
      };
    }

    return { allowed: true };
  }

  /**
   * Get statistics for all systems
   */
  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};

    if (this.systems.timelock) {
      stats.timelock = this.systems.timelock.getStats();
    }

    if (this.systems.easyTrack) {
      stats.easyTrack = this.systems.easyTrack.getStats();
    }

    if (this.systems.retroPGF) {
      const round = this.systems.retroPGF.getActiveRound();
      stats.retroPGF = round ? this.systems.retroPGF.getRoundResults(round.id) : null;
    }

    if (this.systems.tokenLocking) {
      stats.tokenLocking = this.systems.tokenLocking.getStats();
    }

    if (this.systems.approvalVoting) {
      stats.approvalVoting = this.systems.approvalVoting.getStats();
    }

    if (this.systems.rageQuit) {
      stats.rageQuit = this.systems.rageQuit.getStats();
    }

    if (this.systems.bridgeTimelock) {
      stats.bridgeTimelock = this.systems.bridgeTimelock.getStats();
    }

    if (this.systems.governanceCycles) {
      stats.governanceCycles = this.systems.governanceCycles.getStats();
    }

    if (this.systems.citizenship) {
      stats.citizenship = this.systems.citizenship.getStats();
    }

    if (this.systems.stethTracker) {
      stats.stethTracker = this.systems.stethTracker.getStats();
    }

    stats.stateMachines = this.systems.stateMachines.size;

    return stats;
  }

  /**
   * Get current state of all governance systems
   */
  getState(): {
    daoId: string;
    systemsActive: {
      timelock: boolean;
      bicameral: boolean;
      easyTrack: boolean;
      retroPGF: boolean;
      tokenLocking: boolean;
      approvalVoting: boolean;
      rageQuit: boolean;
      bridgeTimelock: boolean;
      governanceCycles: boolean;
      proposalGates: boolean;
      citizenship: boolean;
      stethTracker: boolean;
    };
    governanceBlocked: boolean;
    rageQuitState?: string;
    stats: Record<string, unknown>;
  } {
    const governanceBlocked = this.systems.rageQuit?.isGovernanceBlocked() ?? false;
    const rageQuitState = this.systems.rageQuit?.getStats().state;

    return {
      daoId: this.dao.daoId,
      systemsActive: {
        timelock: this.systems.timelock !== undefined,
        bicameral: this.systems.bicameral !== undefined,
        easyTrack: this.systems.easyTrack !== undefined,
        retroPGF: this.systems.retroPGF !== undefined,
        tokenLocking: this.systems.tokenLocking !== undefined,
        approvalVoting: this.systems.approvalVoting !== undefined,
        rageQuit: this.systems.rageQuit !== undefined,
        bridgeTimelock: this.systems.bridgeTimelock !== undefined,
        governanceCycles: this.systems.governanceCycles !== undefined,
        proposalGates: this.systems.proposalGates !== undefined,
        citizenship: this.systems.citizenship !== undefined,
        stethTracker: this.systems.stethTracker !== undefined,
      },
      governanceBlocked,
      rageQuitState,
      stats: this.getStats(),
    };
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      config: this.config,
      systems: {
        timelock: this.systems.timelock?.toDict(),
        easyTrack: this.systems.easyTrack?.toDict(),
        retroPGF: this.systems.retroPGF?.toDict(),
        tokenLocking: this.systems.tokenLocking?.toDict(),
        approvalVoting: this.systems.approvalVoting?.toDict(),
        rageQuit: this.systems.rageQuit?.toDict(),
        bridgeTimelock: this.systems.bridgeTimelock?.toDict(),
        governanceCycles: this.systems.governanceCycles?.toDict(),
        citizenship: this.systems.citizenship?.toDict(),
        stethTracker: this.systems.stethTracker?.toDict(),
      },
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create governance processor for a specific DAO type
 */
export function createGovernanceProcessor(
  dao: DAO,
  eventBus: EventBus,
  daoType: string
): GovernanceProcessor {
  const configs: Record<string, GovernanceSystemsConfig> = {
    // Uniswap - multi-stage with proposal gates
    uniswap: {
      multiStageEnabled: true,
      timelockEnabled: true,
      proposalGatesEnabled: true,
    },

    // Compound - similar to Uniswap
    compound: {
      multiStageEnabled: true,
      timelockEnabled: true,
      proposalGatesEnabled: true,
    },

    // Aave - multi-stage with proposal gates
    aave: {
      multiStageEnabled: true,
      timelockEnabled: true,
      proposalGatesEnabled: true,
    },

    // Arbitrum - multi-stage with bridge timelocks
    arbitrum: {
      multiStageEnabled: true,
      timelockEnabled: true,
      bridgeTimelockEnabled: true,
      proposalGatesEnabled: true,
    },

    // Optimism - bicameral with cycles and RetroPGF
    optimism: {
      multiStageEnabled: true,
      timelockEnabled: true,
      bicameralEnabled: true,
      governanceCyclesEnabled: true,
      retroPGFEnabled: true,
      citizenshipEnabled: true,
      proposalGatesEnabled: true,
    },

    // ENS - steward-focused
    ens: {
      multiStageEnabled: true,
      timelockEnabled: true,
      proposalGatesEnabled: true,
    },

    // Lido - dual governance with Easy Track
    lido: {
      multiStageEnabled: true,
      timelockEnabled: true,
      easyTrackEnabled: true,
      rageQuitEnabled: true,
      stethTrackingEnabled: true,
    },

    // Gitcoin - steward-focused
    gitcoin: {
      multiStageEnabled: true,
      timelockEnabled: true,
      proposalGatesEnabled: true,
    },

    // MakerDAO - approval voting with token locking
    maker: {
      tokenLockingEnabled: true,
      approvalVotingEnabled: true,
      timelockEnabled: true,
    },
    maker_sky: {
      tokenLockingEnabled: true,
      approvalVotingEnabled: true,
      timelockEnabled: true,
    },

    // Default
    default: {
      multiStageEnabled: true,
      timelockEnabled: true,
    },
  };

  const normalizedType = daoType.toLowerCase().replace(/[\s-]/g, '_');
  const config = configs[normalizedType] || configs.default;

  return new GovernanceProcessor(dao, eventBus, config);
}
