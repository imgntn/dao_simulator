/**
 * Player Controller
 *
 * Provides a user-friendly interface for controlling a DAO in the simulation.
 * Wraps the PlayerAgent and provides high-level methods for governance actions.
 */

import type { DAO } from '../data-structures/dao';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal, HouseType } from '../data-structures/multi-stage-proposal';
import type { GovernanceHouse, BicameralGovernance } from '../data-structures/governance-house';
import type { TimelockController } from '../data-structures/timelock';
import { PlayerAgent } from './player-agent';
import { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type PlayerActionType =
  | 'vote'
  | 'create_proposal'
  | 'delegate'
  | 'undelegate'
  | 'stake'
  | 'unstake'
  | 'veto_signal'
  | 'withdraw_veto'
  | 'swap_tokens'
  | 'join_guild'
  | 'leave_guild'
  | 'comment';

export interface PlayerAction {
  type: PlayerActionType;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface VoteAction {
  proposalId: string;
  support: boolean;
  house?: HouseType;  // For bicameral voting
  reason?: string;
}

export interface ProposalCreationParams {
  title: string;
  description: string;
  fundingGoal: number;
  duration: number;
  topic?: string;
  category?: 'constitutional' | 'non_constitutional' | 'standard';
}

export interface DelegationParams {
  targetMemberId: string;
  amount: number;
}

export interface VetoSignalParams {
  proposalId: string;
  amount: number;
  reason?: string;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amount: number;
}

export interface ControllerState {
  isControlling: boolean;
  controlledDaoId: string | null;
  playerAgentId: string | null;
  tokens: number;
  stakedTokens: number;
  votingPower: number;
  pendingActions: number;
  actionHistory: PlayerAction[];
}

// =============================================================================
// PLAYER CONTROLLER
// =============================================================================

export class PlayerController {
  private controlledDaoId: string | null = null;
  private playerAgent: PlayerAgent | null = null;
  private model: DAOModel | null = null;
  private dao: DAO | null = null;
  private eventBus: EventBus;

  // Governance systems for controlled DAO
  private bicameralSystem: BicameralGovernance | null = null;
  private timelockController: TimelockController | null = null;

  // Action tracking
  private actionHistory: PlayerAction[] = [];
  private pendingActions: PlayerAction[] = [];

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus(false);
  }

  // ---------------------------------------------------------------------------
  // CONTROL MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Take control of a DAO
   */
  takeControl(
    daoId: string,
    model: DAOModel,
    bicameralSystem?: BicameralGovernance,
    timelockController?: TimelockController
  ): boolean {
    if (!model.dao) return false;

    this.controlledDaoId = daoId;
    this.model = model;
    this.dao = model.dao;
    this.bicameralSystem = bicameralSystem || null;
    this.timelockController = timelockController || null;

    // Create or find player agent
    const existingPlayer = this.dao.members.find(m => m instanceof PlayerAgent);
    if (existingPlayer) {
      this.playerAgent = existingPlayer as PlayerAgent;
    } else {
      // Create new player agent with significant resources
      this.playerAgent = new PlayerAgent(
        `player_${daoId}`,
        model,
        100000,  // Significant token allocation
        500,     // High reputation
        'node_0'
      );
      this.playerAgent.daoId = daoId;
      this.dao.addMember(this.playerAgent);
    }

    this.eventBus.publish('player_took_control', {
      daoId,
      playerId: this.playerAgent.uniqueId,
      tokens: this.playerAgent.tokens,
    });

    return true;
  }

  /**
   * Release control of the current DAO
   */
  releaseControl(): void {
    const daoId = this.controlledDaoId;

    this.controlledDaoId = null;
    this.playerAgent = null;
    this.model = null;
    this.dao = null;
    this.bicameralSystem = null;
    this.timelockController = null;

    if (daoId) {
      this.eventBus.publish('player_released_control', { daoId });
    }
  }

  /**
   * Check if currently controlling a DAO
   */
  isControlling(): boolean {
    return this.controlledDaoId !== null && this.playerAgent !== null;
  }

  /**
   * Get the controlled DAO ID
   */
  getControlledDaoId(): string | null {
    return this.controlledDaoId;
  }

  // ---------------------------------------------------------------------------
  // VOTING ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Vote on a proposal
   */
  vote(params: VoteAction): { success: boolean; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    const proposal = this.dao.proposals.find(p => p.uniqueId === params.proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found' };
    }

    if (proposal.status !== 'open') {
      return { success: false, message: 'Proposal is not open for voting' };
    }

    // Check if already voted
    if (this.playerAgent!.votes.has(params.proposalId)) {
      return { success: false, message: 'Already voted on this proposal' };
    }

    // Vote in specific house if bicameral
    if (params.house && this.bicameralSystem) {
      const house = this.bicameralSystem.getHouse(params.house);
      if (house) {
        house.vote(this.playerAgent!.uniqueId, params.proposalId, params.support, params.reason);
      }
    }

    // Standard vote
    this.playerAgent!.voteOnProposal(proposal);

    this.recordAction({
      type: 'vote',
      params: { proposalId: params.proposalId, support: params.support, house: params.house },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Voted ${params.support ? 'for' : 'against'} proposal` };
  }

  /**
   * Get available proposals to vote on
   */
  getVotableProposals(): Proposal[] {
    if (!this.dao) return [];

    return this.dao.proposals.filter(p =>
      p.status === 'open' && !this.playerAgent?.votes.has(p.uniqueId)
    );
  }

  // ---------------------------------------------------------------------------
  // PROPOSAL CREATION
  // ---------------------------------------------------------------------------

  /**
   * Create a new proposal
   */
  createProposal(params: ProposalCreationParams): { success: boolean; proposal?: Proposal; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    try {
      // Import Proposal class inline to avoid circular dependencies
      const { Proposal } = require('../data-structures/proposal');

      const proposal = new Proposal(
        this.dao,
        this.playerAgent!.uniqueId,
        params.title,
        params.description,
        params.fundingGoal,
        params.duration,
        params.topic || 'Default Topic'
      );

      // Add proposal to DAO
      this.dao.addProposal(proposal);

      // Set category for multi-stage proposals
      const multiStage = proposal as unknown as MultiStageProposal;
      if (params.category && multiStage.proposalCategory !== undefined) {
        multiStage.proposalCategory = params.category;
      }

      this.recordAction({
        type: 'create_proposal',
        params: { proposalId: proposal.uniqueId, title: params.title },
        timestamp: this.model!.currentStep,
      });

      return { success: true, proposal, message: 'Proposal created successfully' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create proposal' };
    }
  }

  // ---------------------------------------------------------------------------
  // DELEGATION
  // ---------------------------------------------------------------------------

  /**
   * Delegate tokens to another member
   */
  delegate(params: DelegationParams): { success: boolean; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    const target = this.dao.members.find(m => m.uniqueId === params.targetMemberId);
    if (!target) {
      return { success: false, message: 'Target member not found' };
    }

    if (params.amount > this.playerAgent!.tokens) {
      return { success: false, message: 'Insufficient tokens' };
    }

    const success = this.playerAgent!.delegate(params.amount, target);
    if (!success) {
      return { success: false, message: 'Delegation failed (circular or invalid)' };
    }

    this.recordAction({
      type: 'delegate',
      params: { targetId: params.targetMemberId, amount: params.amount },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Delegated ${params.amount} tokens` };
  }

  /**
   * Remove delegation from a member
   */
  undelegate(params: DelegationParams): { success: boolean; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    const target = this.dao.members.find(m => m.uniqueId === params.targetMemberId);
    if (!target) {
      return { success: false, message: 'Target member not found' };
    }

    const undelegated = this.playerAgent!.undelegate(params.amount, target);
    if (undelegated === 0) {
      return { success: false, message: 'No delegation to remove' };
    }

    this.recordAction({
      type: 'undelegate',
      params: { targetId: params.targetMemberId, amount: undelegated },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Undelegated ${undelegated} tokens` };
  }

  // ---------------------------------------------------------------------------
  // STAKING
  // ---------------------------------------------------------------------------

  /**
   * Stake tokens
   */
  stake(amount: number, lockupPeriod: number = 0): { success: boolean; message: string } {
    if (!this.isControlling() || !this.playerAgent) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    if (amount > this.playerAgent.tokens) {
      return { success: false, message: 'Insufficient tokens' };
    }

    this.playerAgent.stakeTokens(amount, this.dao!.tokenSymbol, lockupPeriod);

    this.recordAction({
      type: 'stake',
      params: { amount, lockupPeriod },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Staked ${amount} tokens` };
  }

  /**
   * Unstake tokens
   */
  unstake(amount: number): { success: boolean; actualAmount: number; message: string } {
    if (!this.isControlling() || !this.playerAgent) {
      return { success: false, actualAmount: 0, message: 'Not controlling any DAO' };
    }

    const actualAmount = this.playerAgent.unstakeTokens(amount, this.dao!.tokenSymbol);

    if (actualAmount === 0) {
      return { success: false, actualAmount: 0, message: 'No tokens to unstake or still locked' };
    }

    this.recordAction({
      type: 'unstake',
      params: { requestedAmount: amount, actualAmount },
      timestamp: this.model!.currentStep,
    });

    return { success: true, actualAmount, message: `Unstaked ${actualAmount} tokens` };
  }

  // ---------------------------------------------------------------------------
  // VETO SIGNALING (DUAL GOVERNANCE)
  // ---------------------------------------------------------------------------

  /**
   * Signal veto on a proposal (for dual governance DAOs)
   */
  signalVeto(params: VetoSignalParams): { success: boolean; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    const proposal = this.dao.proposals.find(p => p.uniqueId === params.proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found' };
    }

    const multiStage = proposal as unknown as MultiStageProposal;
    if (!multiStage.signalVeto) {
      return { success: false, message: 'Proposal does not support veto signaling' };
    }

    if (params.amount > this.playerAgent!.stakedTokens) {
      return { success: false, message: 'Insufficient staked tokens for veto signal' };
    }

    multiStage.signalVeto(this.playerAgent!.uniqueId, params.amount);

    this.recordAction({
      type: 'veto_signal',
      params: { proposalId: params.proposalId, amount: params.amount },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Signaled veto with ${params.amount} tokens` };
  }

  // ---------------------------------------------------------------------------
  // COMMENTS
  // ---------------------------------------------------------------------------

  /**
   * Leave a comment on a proposal
   */
  comment(proposalId: string, sentiment: string): { success: boolean; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    const proposal = this.dao.proposals.find(p => p.uniqueId === proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found' };
    }

    this.playerAgent!.leaveComment(proposal, sentiment);

    this.recordAction({
      type: 'comment',
      params: { proposalId, sentiment },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: 'Comment added' };
  }

  // ---------------------------------------------------------------------------
  // GUILD MEMBERSHIP
  // ---------------------------------------------------------------------------

  /**
   * Join a guild by name
   */
  joinGuild(guildName: string): { success: boolean; message: string } {
    if (!this.isControlling() || !this.dao) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    const guild = this.dao.guilds.find(g => g.name === guildName);
    if (!guild) {
      return { success: false, message: 'Guild not found' };
    }

    this.playerAgent!.joinGuild(guild);

    this.recordAction({
      type: 'join_guild',
      params: { guildName },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Joined guild: ${guild.name}` };
  }

  /**
   * Leave current guild
   */
  leaveGuild(): { success: boolean; message: string } {
    if (!this.isControlling()) {
      return { success: false, message: 'Not controlling any DAO' };
    }

    if (!this.playerAgent!.guild) {
      return { success: false, message: 'Not in a guild' };
    }

    const guildName = this.playerAgent!.guild.name;
    this.playerAgent!.leaveGuild();

    this.recordAction({
      type: 'leave_guild',
      params: { guildName },
      timestamp: this.model!.currentStep,
    });

    return { success: true, message: `Left guild: ${guildName}` };
  }

  // ---------------------------------------------------------------------------
  // STATE & UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Get current controller state
   */
  getState(): ControllerState {
    return {
      isControlling: this.isControlling(),
      controlledDaoId: this.controlledDaoId,
      playerAgentId: this.playerAgent?.uniqueId || null,
      tokens: this.playerAgent?.tokens || 0,
      stakedTokens: this.playerAgent?.stakedTokens || 0,
      votingPower: this.getVotingPower(),
      pendingActions: this.pendingActions.length,
      actionHistory: this.actionHistory.slice(-20),  // Last 20 actions
    };
  }

  /**
   * Get total voting power
   */
  getVotingPower(): number {
    if (!this.playerAgent) return 0;

    let power = this.playerAgent.tokens + this.playerAgent.stakedTokens;

    // Add delegated tokens
    for (const amount of this.playerAgent.delegations.values()) {
      power += amount;
    }

    return power;
  }

  /**
   * Record an action in history
   */
  private recordAction(action: PlayerAction): void {
    this.actionHistory.push(action);

    // Keep history bounded
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100);
    }

    this.eventBus.publish('player_action', {
      daoId: this.controlledDaoId,
      action,
    });
  }

  /**
   * Get action history
   */
  getActionHistory(): PlayerAction[] {
    return [...this.actionHistory];
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a player controller
 */
export function createPlayerController(eventBus?: EventBus): PlayerController {
  return new PlayerController(eventBus);
}
