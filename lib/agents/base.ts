// Base DAOMember agent class

import type { Agent } from '@/types/simulation';
import type { Proposal } from '../data-structures/proposal';
import type { Guild } from '../data-structures/guild';
import type { VotingStrategy } from '../utils/voting-strategies';
import { getStrategy, DefaultVotingStrategy } from '../utils/voting-strategies';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';

export class DAOMember implements Agent {
  uniqueId: string;
  model: DAOModel;
  tokens: number;
  reputation: number;
  location: string;
  stakedTokens: number = 0;
  stakeLocks: Array<{ amount: number; unlockStep: number }> = [];
  stakingRate: number;
  compoundStake: boolean = false;
  guild: Guild | null = null;
  votingStrategy: VotingStrategy;
  comments: Map<string, string> = new Map(); // proposalId -> sentiment
  votes: Map<string, { vote: boolean; weight: number }> = new Map(); // proposalId -> vote data
  delegations: Map<string, number> = new Map(); // memberId -> amount
  delegates: DAOMember[] = [];
  private _active: boolean = false;
  pos: [number, number] | null = null; // For visualization
  optimism: number;

  // Multi-DAO support properties
  daoId: string;
  transferCooldown: number = 0;
  previousDaos: string[] = []; // Track DAO history for analytics
  isTransferring: boolean = false;
  transferTargetDaoId: string | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    votingStrategy?: string | VotingStrategy,
    daoId?: string // Optional for backward compatibility
  ) {
    // Validate required parameters
    if (!uniqueId || typeof uniqueId !== 'string') {
      throw new Error('Agent uniqueId must be a non-empty string');
    }
    if (!model) {
      throw new Error('Agent model is required');
    }

    // Validate and sanitize numeric parameters
    const sanitizedTokens = Number.isFinite(tokens) && tokens >= 0 ? tokens : 0;
    const sanitizedReputation = Number.isFinite(reputation) && reputation >= 0 ? reputation : 0;

    this.uniqueId = uniqueId;
    this.model = model;
    this.tokens = sanitizedTokens;
    this.reputation = sanitizedReputation;
    this.location = location || 'node_0';
    this.stakingRate = model.dao?.stakingInterestRate || 0;
    this.optimism = random();
    // Set daoId from parameter, model's DAO, or default
    this.daoId = daoId || model.dao?.daoId || 'default';

    // Set voting strategy
    if (typeof votingStrategy === 'string') {
      const strategy = getStrategy(votingStrategy);
      this.votingStrategy = strategy || new DefaultVotingStrategy();
    } else {
      this.votingStrategy = votingStrategy || new DefaultVotingStrategy();
    }
  }

  markActive(): void {
    this._active = true;
  }

  voteOnProposal(proposal: Proposal): void {
    this.votingStrategy.vote(this, proposal);
    this.markActive();

    // Notify delegates
    for (const delegate of this.delegates) {
      if (delegate.receiveRepresentativeVote) {
        const voteData = this.votes.get(proposal.uniqueId);
        if (voteData) {
          delegate.receiveRepresentativeVote(proposal, voteData.vote, voteData.weight);
        }
      }
    }
  }

  leaveComment(proposal: Proposal, sentiment: string): void {
    this.comments.set(proposal.uniqueId, sentiment);
    proposal.addComment(this.uniqueId, sentiment);
    this.markActive();
  }

  stakeTokens(amount: number, token: string = 'DAO_TOKEN', lockupPeriod: number = 0): void {
    if (this.model.dao) {
      this.model.dao.stakeTokens(amount, token, this, lockupPeriod);
    }
  }

  unstakeTokens(amount: number, token: string = 'DAO_TOKEN'): number {
    if (this.model.dao) {
      return this.model.dao.unstakeTokens(amount, token, this);
    }
    return 0;
  }

  voteOnRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => {
      const isOpen = p.status === 'open';
      const inVotingPeriod =
        this.model.currentStep <= p.creationTime + p.votingPeriod;
      return isOpen && inVotingPeriod;
    });

    if (openProps.length > 0) {
      const proposal = randomChoice(openProps);
      this.voteOnProposal(proposal);
    }
  }

  leaveCommentOnRandomProposal(): void {
    if (!this.model.dao) return;

    const openProps = this.model.dao.proposals.filter(p => p.status === 'open');
    if (openProps.length > 0) {
      const proposal = randomChoice(openProps);
      const sentiment = randomChoice(['positive', 'negative', 'neutral']);
      this.leaveComment(proposal, sentiment);
    }
  }

  receiveRevenueShare(amount: number): void {
    this.tokens += amount;
  }

  // Guild interactions
  joinGuild(guild: Guild): void {
    if (this.guild === guild) return;

    if (this.guild) {
      this.guild.removeMember(this);
    }

    guild.addMember(this);
  }

  leaveGuild(): void {
    if (this.guild) {
      this.guild.removeMember(this);
    }
  }

  createGuild(name: string): Guild | null {
    if (!this.model.dao) return null;

    const guild = this.model.dao.createGuildSync(name, this);
    this.joinGuild(guild);
    return guild;
  }

  /**
   * Decide whether to vote yes or no on a proposal
   */
  decideVote(topic: Proposal | string): 'yes' | 'no' {
    const clamp = (x: number) => Math.max(0, Math.min(1, x));

    // Check if this is a Proposal object
    const isProposal =
      typeof topic === 'object' &&
      topic !== null &&
      ('fundingGoal' in topic || 'creator' in topic || 'currentFunding' in topic);

    if (isProposal) {
      const proposal = topic as Proposal;
      const pTopic = proposal.topic || '';

      // String-based heuristics for certain topics
      if (pTopic && typeof pTopic === 'string') {
        if (pTopic.toLowerCase().includes('topic b')) {
          return random() < 0.7 ? 'yes' : 'no';
        }
        if (pTopic.toLowerCase().includes('topic a')) {
          return random() < 0.3 ? 'yes' : 'no';
        }
      }

      // Subjective belief based on proposal characteristics
      let belief = 0.5;

      // Factor in funding progress
      if (proposal.fundingGoal > 0) {
        const fundingRatio = proposal.currentFunding / proposal.fundingGoal;
        belief += fundingRatio * 0.2;
      }

      // Factor in vote ratio
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      if (totalVotes > 0) {
        const supportRatio = proposal.votesFor / totalVotes;
        belief += supportRatio * 0.2;
      }

      // Add personal optimism noise
      belief += (this.optimism - 0.5) * 0.1;

      belief = clamp(belief);

      return random() < belief ? 'yes' : 'no';
    }

    // String-based topic
    const topicStr = typeof topic === 'string' ? topic : '';
    if (topicStr.toLowerCase().includes('topic b')) {
      return random() < 0.7 ? 'yes' : 'no';
    }
    if (topicStr.toLowerCase().includes('topic a')) {
      return random() < 0.3 ? 'yes' : 'no';
    }

    // Default: random decision
    return random() < 0.5 ? 'yes' : 'no';
  }

  // Cache for member lookup to avoid O(n) searches
  private static memberLookupCache: Map<string, DAOMember> | null = null;
  private static memberLookupCacheStep: number = -1;

  /**
   * Get or build member lookup cache
   * Cache is invalidated each step to handle member changes
   */
  private getMemberLookup(): Map<string, DAOMember> {
    const currentStep = this.model.currentStep;

    // Rebuild cache if step changed or cache is null
    if (DAOMember.memberLookupCache === null || DAOMember.memberLookupCacheStep !== currentStep) {
      DAOMember.memberLookupCache = new Map();
      if (this.model.dao) {
        for (const member of this.model.dao.members) {
          DAOMember.memberLookupCache.set(member.uniqueId, member);
        }
      }
      DAOMember.memberLookupCacheStep = currentStep;
    }

    return DAOMember.memberLookupCache;
  }

  /**
   * Find a member by ID using cached lookup (O(1) instead of O(n))
   */
  protected findMemberById(memberId: string): DAOMember | undefined {
    return this.getMemberLookup().get(memberId);
  }

  /**
   * Check if delegating to target would create a circular delegation
   * Optimized with O(1) member lookup via cache
   */
  private wouldCreateCircularDelegation(target: DAOMember, visited: Set<string> = new Set()): boolean {
    // If we've seen this member before, we found a cycle
    if (visited.has(target.uniqueId)) {
      return true;
    }

    // If target is delegating back to us (directly or indirectly), it's circular
    if (target.delegations.has(this.uniqueId)) {
      return true;
    }

    // Check transitively with O(1) lookup
    visited.add(target.uniqueId);
    for (const delegateId of target.delegations.keys()) {
      const delegateMember = this.findMemberById(delegateId);
      if (delegateMember && this.wouldCreateCircularDelegation(delegateMember, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Delegate tokens to another member
   * Prevents circular delegations where A -> B -> A would create infinite loops
   */
  delegate(amount: number, delegate: DAOMember): boolean {
    if (amount <= 0 || amount > this.tokens) return false;

    // Prevent self-delegation
    if (delegate.uniqueId === this.uniqueId) return false;

    // Prevent circular delegation
    if (this.wouldCreateCircularDelegation(delegate)) {
      return false;
    }

    this.tokens -= amount;
    const current = this.delegations.get(delegate.uniqueId) || 0;
    this.delegations.set(delegate.uniqueId, current + amount);

    if (!delegate.delegates.includes(this)) {
      delegate.delegates.push(this);
    }

    return true;
  }

  /**
   * Undelegate tokens from another member
   * Returns the amount actually undelegated (may be less if not enough delegated)
   */
  undelegate(amount: number, delegate: DAOMember): number {
    const currentDelegation = this.delegations.get(delegate.uniqueId) || 0;

    if (currentDelegation <= 0) {
      return 0;
    }

    // Can only undelegate up to what was delegated
    const actualAmount = Math.min(amount, currentDelegation);

    if (actualAmount <= 0) {
      return 0;
    }

    // Return tokens to delegator
    this.tokens += actualAmount;

    // Update delegation amount
    const newDelegation = currentDelegation - actualAmount;
    if (newDelegation <= 0) {
      this.delegations.delete(delegate.uniqueId);
      // Remove from delegate's delegates list
      const idx = delegate.delegates.indexOf(this);
      if (idx > -1) {
        delegate.delegates.splice(idx, 1);
      }
    } else {
      this.delegations.set(delegate.uniqueId, newDelegation);
    }

    return actualAmount;
  }

  /**
   * Undelegate all tokens from a specific delegate
   */
  undelegateAll(delegate: DAOMember): number {
    const currentDelegation = this.delegations.get(delegate.uniqueId) || 0;
    if (currentDelegation <= 0) {
      return 0;
    }
    return this.undelegate(currentDelegation, delegate);
  }

  /**
   * Revoke all delegations (emergency method)
   * Returns total amount undelegated
   */
  revokeAllDelegations(): number {
    let totalUndelegated = 0;

    // Create a copy of delegation entries to iterate safely
    const delegationEntries = Array.from(this.delegations.entries());

    for (const [delegateId, amount] of delegationEntries) {
      const delegateMember = this.findMemberById(delegateId);
      if (delegateMember) {
        totalUndelegated += this.undelegate(amount, delegateMember);
      } else {
        // Delegate no longer exists - recover tokens directly
        this.tokens += amount;
        this.delegations.delete(delegateId);
        totalUndelegated += amount;
      }
    }

    return totalUndelegated;
  }

  /**
   * Get total amount delegated to others
   */
  getTotalDelegated(): number {
    let total = 0;
    for (const amount of this.delegations.values()) {
      total += amount;
    }
    return total;
  }

  /**
   * Receive vote from a representative (for liquid delegation)
   */
  receiveRepresentativeVote(_proposal: Proposal, _vote: boolean, _weight: number): void {
    // Override in subclasses if needed
    // Unused parameters prefixed with underscore to indicate intentional non-use
  }

  /**
   * Default step method - override in subclasses
   */
  step(): void {
    // Base implementation does nothing
    // Subclasses should override this

    // Decrement transfer cooldown if active
    if (this.transferCooldown > 0) {
      this.transferCooldown--;
    }
  }

  // ==========================================================================
  // Multi-DAO Transfer Methods
  // ==========================================================================

  /**
   * Check if this member can transfer to another DAO
   */
  canTransfer(): boolean {
    return this.transferCooldown <= 0 && !this.isTransferring;
  }

  /**
   * Request to transfer to another DAO
   * Returns true if the request was initiated, false if blocked
   */
  requestTransfer(targetDaoId: string): boolean {
    if (!this.canTransfer()) {
      return false;
    }

    if (this.daoId === targetDaoId) {
      return false; // Already in target DAO
    }

    this.isTransferring = true;
    this.transferTargetDaoId = targetDaoId;

    // Publish transfer request event
    if (this.model.eventBus) {
      this.model.eventBus.publish('member_transfer_requested', {
        step: this.model.currentStep,
        memberId: this.uniqueId,
        fromDaoId: this.daoId,
        toDaoId: targetDaoId,
      });
    }

    return true;
  }

  /**
   * Cancel a pending transfer request
   */
  cancelTransfer(): void {
    this.isTransferring = false;
    this.transferTargetDaoId = null;
  }

  /**
   * Execute the transfer to a new DAO
   * Called by DAOCity when transfer is approved and processed
   */
  executeTransfer(newDaoId: string, newModel?: DAOModel): void {
    // Store previous DAO in history
    this.previousDaos.push(this.daoId);

    // Remove from current DAO
    if (this.model.dao) {
      this.model.dao.removeMember(this);
    }

    // Clear DAO-specific state
    this.clearDaoSpecificState();

    // Update to new DAO
    const oldDaoId = this.daoId;
    this.daoId = newDaoId;

    if (newModel) {
      this.model = newModel;
      if (newModel.dao) {
        newModel.dao.addMember(this);
      }
    }

    // Set cooldown (50 steps before next transfer allowed)
    this.transferCooldown = 50;
    this.isTransferring = false;
    this.transferTargetDaoId = null;

    // Publish transfer completed event
    if (this.model.eventBus) {
      this.model.eventBus.publish('member_transfer_completed', {
        step: this.model.currentStep,
        memberId: this.uniqueId,
        fromDaoId: oldDaoId,
        toDaoId: newDaoId,
      });
    }
  }

  /**
   * Clear state that's specific to the current DAO when transferring
   */
  private clearDaoSpecificState(): void {
    // Leave current guild
    if (this.guild) {
      this.guild.removeMember(this);
      this.guild = null;
    }

    // Clear votes on proposals (they're DAO-specific)
    this.votes.clear();
    this.comments.clear();

    // Clear delegations (both given and received)
    // Return delegated tokens
    for (const [_delegateId, amount] of this.delegations) {
      this.tokens += amount;
    }
    this.delegations.clear();

    // Remove self from delegates' delegate lists
    for (const delegator of this.delegates) {
      delegator.delegations.delete(this.uniqueId);
    }
    this.delegates = [];
  }

  /**
   * Get transfer state for visualization
   */
  getTransferState(): {
    canTransfer: boolean;
    isTransferring: boolean;
    targetDaoId: string | null;
    cooldown: number;
    previousDaos: string[];
  } {
    return {
      canTransfer: this.canTransfer(),
      isTransferring: this.isTransferring,
      targetDaoId: this.transferTargetDaoId,
      cooldown: this.transferCooldown,
      previousDaos: [...this.previousDaos],
    };
  }
}
