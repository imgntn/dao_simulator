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
import { VoteEscrowController } from './vote-escrow';
import { SoulboundTokenRegistry } from '../data-structures/soulbound-token';
import { PaymentStreamController } from '../data-structures/payment-stream';
import { VestingController } from '../data-structures/vesting-schedule';
import { SubDAOController } from '../data-structures/sub-dao';
import { AttackDetector } from '../utils/attack-detector';
import { random } from '../utils/random';

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

  // New high-priority features
  veTokenEnabled?: boolean;        // Curve/Balancer-style vote escrow
  sbtEnabled?: boolean;            // Soulbound tokens
  paymentStreamsEnabled?: boolean; // Sablier/Superfluid-style streams
  vestingEnabled?: boolean;        // Token vesting
  subDaoEnabled?: boolean;         // Sub-DAO/Nested DAO support
  attackDetectionEnabled?: boolean; // Governance attack detection
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

  // New high-priority features
  veToken?: VoteEscrowController;
  sbtRegistry?: SoulboundTokenRegistry;
  streamController?: PaymentStreamController;
  vestingController?: VestingController;
  subDaoController?: SubDAOController;
  attackDetector?: AttackDetector;
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

    // New high-priority features
    if (this.config.veTokenEnabled) {
      this.systems.veToken = new VoteEscrowController();
      this.systems.veToken.setEventBus(this.eventBus);
    }

    if (this.config.sbtEnabled) {
      this.systems.sbtRegistry = new SoulboundTokenRegistry();
      this.systems.sbtRegistry.setEventBus(this.eventBus);
    }

    if (this.config.paymentStreamsEnabled) {
      this.systems.streamController = new PaymentStreamController();
      this.systems.streamController.setEventBus(this.eventBus);
    }

    if (this.config.vestingEnabled) {
      this.systems.vestingController = new VestingController();
      this.systems.vestingController.setEventBus(this.eventBus);
    }

    if (this.config.subDaoEnabled) {
      this.systems.subDaoController = new SubDAOController();
      this.systems.subDaoController.setEventBus(this.eventBus);
    }

    if (this.config.attackDetectionEnabled) {
      this.systems.attackDetector = new AttackDetector();
      this.systems.attackDetector.setEventBus(this.eventBus);
      this.setupAttackDetection();
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

    // Process new high-priority features
    this.processNewSystems(currentStep);
  }

  /**
   * Process new high-priority governance systems
   */
  private processNewSystems(currentStep: number): void {
    // Update veToken decay
    if (this.systems.veToken) {
      this.systems.veToken.processStep(currentStep);
    }

    // Process SBT expirations
    if (this.systems.sbtRegistry) {
      this.systems.sbtRegistry.processExpirations(currentStep);
    }

    // Process payment streams
    if (this.systems.streamController) {
      this.systems.streamController.processStreams(currentStep);
    }

    // Process vesting schedules
    if (this.systems.vestingController) {
      this.systems.vestingController.processSchedules(currentStep);
    }

    // Process sub-DAOs
    if (this.systems.subDaoController) {
      this.systems.subDaoController.processSubDAOs(currentStep);
    }

    // Process attack detection
    if (this.systems.attackDetector) {
      const votingPowers = this.dao.members.map(m => m.tokens + m.stakedTokens);
      this.systems.attackDetector.process(currentStep, votingPowers);
    }
  }

  private setupAttackDetection(): void {
    const detector = this.systems.attackDetector;
    if (!detector) return;

    // Record standard votes
    this.eventBus.subscribe('proposal_voted', (data) => {
      if (!data?.proposalId || !data?.agentId) return;
      detector.recordVote({
        voterId: String(data.agentId),
        proposalId: String(data.proposalId),
        vote: String(data.vote || '').toLowerCase() === 'yes',
        weight: Number(data.weight ?? 1),
        step: Number(data.step ?? 0),
      });
    });

    // Record sybil puppet votes
    this.eventBus.subscribe('sybil_vote_coordinated', (data) => {
      if (!data?.proposalId || !data?.puppetId) return;
      detector.recordVote({
        voterId: String(data.puppetId),
        proposalId: String(data.proposalId),
        vote: Boolean(data.vote),
        weight: Number(data.weight ?? 1),
        step: Number(data.step ?? 0),
      });
    });

    // Record flashloan votes
    this.eventBus.subscribe('flashloan_vote_cast', (data) => {
      if (!data?.proposalId || !data?.borrower) return;
      detector.recordVote({
        voterId: String(data.borrower),
        proposalId: String(data.proposalId),
        vote: Boolean(data.vote),
        weight: Number(data.voteWeight ?? 1),
        step: Number(data.step ?? 0),
      });
    });

    // Track flashloan token flows (borrow + repay)
    this.eventBus.subscribe('flashloan_borrowed', (data) => {
      if (!data?.borrower || !data?.amount) return;
      detector.recordTransfer({
        from: 'treasury',
        to: String(data.borrower),
        amount: Number(data.amount),
        step: Number(data.step ?? 0),
      });
    });

    this.eventBus.subscribe('flashloan_repaid', (data) => {
      if (!data?.borrower || !data?.amount) return;
      detector.recordTransfer({
        from: String(data.borrower),
        to: 'treasury',
        amount: Number(data.amount),
        step: Number(data.step ?? 0),
      });
    });

    // Simple defense response on detection
    this.eventBus.subscribe('attack_detected', (data) => {
      const alert = data;
      const severity = String(alert?.severity || 'low').toLowerCase();
      const step = Number(alert?.step ?? this.dao.currentStep);
      const probability = this.getMitigationProbability(severity);

      if (random() < probability) {
        this.systems.attackDetector?.resolveAlert?.(alert?.alertId, step);
        this.eventBus.publish('attack_mitigated', {
          step,
          alertId: alert?.alertId,
          attackType: alert?.attackType,
          severity: alert?.severity,
          confidence: alert?.confidence,
        });
      }
    });
  }

  private getMitigationProbability(severity: string): number {
    switch (severity) {
      case 'critical':
        return 0.7;
      case 'high':
        return 0.5;
      case 'medium':
        return 0.3;
      default:
        return 0.15;
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

      // Settle proposal bond once proposal resolves
      if (multiStage.status !== 'open') {
        this.settleProposalBond(multiStage, multiStage.status);
      }
    }
  }

  private settleProposalBond(proposal: MultiStageProposal, status: string): void {
    if (proposal.bondAmount <= 0 || proposal.bondRefunded || proposal.bondSlashed) {
      return;
    }

    const refundEligible =
      proposal.quorumMet !== false &&
      (status === 'approved' || status === 'completed' || status === 'rejected');

    const creator = this.dao.members.find(m => m.uniqueId === proposal.creator);
    if (refundEligible && creator) {
      const token = this.dao.getPrimaryTokenSymbol();
      const refundable = Math.min(
        proposal.bondAmount,
        this.dao.treasury.getTokenBalance(token)
      );
      if (refundable > 0) {
        this.dao.treasury.withdraw(token, refundable, this.dao.currentStep);
        creator.tokens += refundable;
      }
      proposal.bondRefunded = true;
      this.eventBus.publish('proposal_bond_refunded', {
        step: this.dao.currentStep,
        proposalId: proposal.uniqueId,
        creator: proposal.creator,
        amount: refundable,
        reason: status,
      });
      return;
    }

    proposal.bondSlashed = true;
    this.eventBus.publish('proposal_bond_slashed', {
      step: this.dao.currentStep,
      proposalId: proposal.uniqueId,
      creator: proposal.creator,
      amount: proposal.bondAmount,
      reason: status,
    });
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
      fastTrackMinSteps: this.dao.proposalPolicy.fastTrackMinSteps,
      fastTrackApprovalPercent: (this.dao.proposalPolicy.fastTrackApproval || 0) * 100,
      fastTrackQuorumPercent: (this.dao.proposalPolicy.fastTrackQuorum || 0) * 100,
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

    // New high-priority features
    if (this.systems.veToken) {
      stats.veToken = this.systems.veToken.getStats();
    }

    if (this.systems.sbtRegistry) {
      stats.sbtRegistry = this.systems.sbtRegistry.getStats();
    }

    if (this.systems.streamController) {
      stats.streamController = this.systems.streamController.getStats();
    }

    if (this.systems.vestingController) {
      stats.vestingController = this.systems.vestingController.getStats();
    }

    if (this.systems.subDaoController) {
      stats.subDaoController = this.systems.subDaoController.getStats();
    }

    if (this.systems.attackDetector) {
      stats.attackDetector = this.systems.attackDetector.getStats();
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
      veToken: boolean;
      sbtRegistry: boolean;
      streamController: boolean;
      vestingController: boolean;
      subDaoController: boolean;
      attackDetector: boolean;
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
        veToken: this.systems.veToken !== undefined,
        sbtRegistry: this.systems.sbtRegistry !== undefined,
        streamController: this.systems.streamController !== undefined,
        vestingController: this.systems.vestingController !== undefined,
        subDaoController: this.systems.subDaoController !== undefined,
        attackDetector: this.systems.attackDetector !== undefined,
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
        veToken: this.systems.veToken?.toDict(),
        sbtRegistry: this.systems.sbtRegistry?.toDict(),
        streamController: this.systems.streamController?.toDict(),
        vestingController: this.systems.vestingController?.toDict(),
        subDaoController: this.systems.subDaoController?.toDict(),
        attackDetector: this.systems.attackDetector?.toDict(),
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
  const config = {
    ...(configs[normalizedType] || configs.default),
    attackDetectionEnabled: true,
  };

  return new GovernanceProcessor(dao, eventBus, config);
}
