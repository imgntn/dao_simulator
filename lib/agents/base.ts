// Base DAOMember agent class
//
// ============================================================================
// DELEGATION SYSTEM DOCUMENTATION
// ============================================================================
//
// This codebase has THREE distinct delegation mechanisms. Understanding when
// to use each is critical for correct governance modeling:
//
// 1. TOKEN DELEGATION (delegations Map + delegates Array)
//    ---------------------------------------------------------
//    Used for: Transferring voting power via token locking
//    How it works:
//      - delegations: Map<memberId, amount> - tokens I delegated OUT to others
//      - delegates: DAOMember[] - members who delegated tokens TO me
//    When someone calls delegate(amount, target):
//      - Tokens are TRANSFERRED from delegator to delegations map
//      - Delegator's token count DECREASES
//      - Target's voting power increases via DelegationResolver
//    Use case: Token-weighted voting where you want to pool voting power
//
// 2. REPRESENTATIVE DELEGATION (representative field) - Liquid Democracy
//    ---------------------------------------------------------
//    Used for: Vote proxy without token transfer (LiquidDelegator pattern)
//    How it works:
//      - representative: DAOMember | null - who casts votes on my behalf
//      - When representative votes, their vote counts for all their delegators
//    Key difference: No tokens move! Just vote authority is transferred
//    Use case: "I trust Alice to vote for me" without giving away tokens
//
// 3. PROPOSAL SUPPORT DELEGATION (Delegator class)
//    ---------------------------------------------------------
//    Used for: Funding proposals, not voting on them
//    How it works:
//      - delegationBudget: tokens reserved for funding proposals
//      - supportProposal() allocates from this budget
//    Key difference: This is about MONEY, not votes
//    Use case: Venture-style funding where delegates pool capital
//
// The DelegationResolver class handles transitive delegation resolution:
// - Walks the delegation chains to calculate effective voting power
// - Detects cycles to prevent infinite loops
// - Supports both token delegation and representative delegation patterns
//
// ============================================================================

import type { Agent } from '@/types/simulation';
import { type Proposal, isMultiStageProposal } from '../data-structures/proposal';
import type { Guild } from '../data-structures/guild';
import type { VotingStrategy } from '../utils/voting-strategies';
import { getStrategy, DefaultVotingStrategy } from '../utils/voting-strategies';
import type { DAOModel } from '../engine/model';
import { random, randomChoice } from '../utils/random';
import { DelegationResolver } from '../delegation/delegation-resolver';
import { settings } from '../config/settings';

export class DAOMember implements Agent {
  uniqueId: string;
  model: DAOModel;
  private _tokens: number;
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
  representative: DAOMember | null = null; // For liquid delegation - who votes on my behalf
  private _active: boolean = false;
  pos: [number, number] | null = null; // For visualization
  optimism: number;

  // Multi-DAO support properties
  daoId: string;
  transferCooldown: number = 0;
  previousDaos: string[] = []; // Track DAO history for analytics
  isTransferring: boolean = false;
  transferTargetDaoId: string | null = null;

  // Voter fatigue modeling
  // Real DAO participation rates: Compound ~5-15%, Uniswap ~5-10%, MakerDAO ~10-20%
  // Optimism ~10%, Arbitrum ~5-15%. Target: 20-40% for engaged simulations.
  // Fatigue increases significantly per vote and decays slowly over time.
  voterFatigue: number = 0;        // Current fatigue level (0-1)
  lastVoteStep: number = 0;        // Step when last vote was cast
  totalVotesCast: number = 0;      // Lifetime vote count
  proposalsConsidered: Set<string> = new Set(); // Track proposals we've already decided on (vote or skip)
  proposalsReminded: Set<string> = new Set();   // Track proposals given a reminder chance
  static readonly FATIGUE_PER_VOTE = 0.04;    // Moderate fatigue per vote
  static readonly FATIGUE_DECAY_RATE = 0.01;  // Faster recovery between votes (~4 steps per vote)
  static readonly MAX_FATIGUE = 0.5;          // Can reduce participation by up to 50%
  static readonly BASE_APATHY = 0.25;         // 25% base chance to skip voting (voter apathy)
  static readonly REMINDER_WINDOW_FRACTION = 0.2; // Last 20% of voting window
  static readonly REMINDER_BOOST = 0.1;           // Small boost for last-chance voting
  static readonly INACTIVITY_BOOST_THRESHOLD = 24; // Steps without voting before boost applies

  // Per-agent voting probability override (set from voter cluster calibration data)
  // When set, bypasses the generic apathy/salience/boost calculation
  calibratedVotingProbability?: number;

  // Voting power velocity tracking (time-weighted voting)
  recentTokenInflow: number = 0;
  lastTokenVelocityStep: number = 0;

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
    this._tokens = sanitizedTokens;
    this.reputation = sanitizedReputation;
    this.location = location || 'node_0';
    this.stakingRate = model.dao?.stakingInterestRate || 0;
    this.optimism = random();
    this.lastTokenVelocityStep = model.currentStep ?? 0;
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

  get tokens(): number {
    return this._tokens;
  }

  set tokens(value: number) {
    const sanitized = Number.isFinite(value) && value >= 0 ? value : 0;
    const delta = sanitized - this._tokens;
    this._tokens = sanitized;

    if (delta > 0 && this.model) {
      const step = this.model.currentStep ?? 0;
      this.recordTokenInflow(delta, step);
    }

    if (delta !== 0 && this.model?.dao?.invalidateVotingPowerCache) {
      this.model.dao.invalidateVotingPowerCache();
    }
  }

  markActive(): void {
    this._active = true;
  }

  voteOnProposal(proposal: Proposal): void {
    // Calculate effective voting power including all delegations
    let effectiveWeight = DelegationResolver.resolveVotingPower(this);
    effectiveWeight = this.applyVotingPowerPolicy(effectiveWeight);

    // Vote with effective weight
    this.votingStrategy.voteWithWeight(this, proposal, effectiveWeight);
    this.markActive();

    // Revoke delegation power from all delegators for this proposal
    // This prevents double-voting when a delegator later votes directly
    this.revokeDelegatorPowerOnVote(proposal);

    // Notify delegates (for backward compatibility)
    for (const delegate of this.delegates) {
      if (delegate.receiveRepresentativeVote) {
        const voteData = this.votes.get(proposal.uniqueId);
        if (voteData) {
          delegate.receiveRepresentativeVote(proposal, voteData.vote, voteData.weight);
        }
      }
    }
  }

  /**
   * Revoke delegated power for all delegators when this member votes.
   * This ensures delegators can still vote directly without double-counting.
   */
  private revokeDelegatorPowerOnVote(proposal: Proposal): void {
    const allDelegators = DelegationResolver.getAllDelegators(this);
    for (const delegator of allDelegators) {
      const delegatedAmount = delegator.delegations.get(this.uniqueId) || 0;
      if (delegatedAmount > 0) {
        proposal.revokeDelegationFor(delegator.uniqueId, this.uniqueId, delegatedAmount);
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

  /**
   * Update voter fatigue - decay over time
   * Should be called each step
   */
  updateVoterFatigue(): void {
    if (this.voterFatigue > 0) {
      this.voterFatigue = Math.max(0, this.voterFatigue - DAOMember.FATIGUE_DECAY_RATE);
    }
  }

  /**
   * Apply fatigue after voting
   */
  private applyVoteFatigue(): void {
    this.voterFatigue = Math.min(
      DAOMember.MAX_FATIGUE,
      this.voterFatigue + DAOMember.FATIGUE_PER_VOTE
    );
    this.lastVoteStep = this.model.currentStep;
    this.totalVotesCast++;
  }

  /**
   * Record inflows for time-weighted voting power
   */
  private recordTokenInflow(amount: number, step: number): void {
    if (amount <= 0) return;
    this.updateTokenVelocity(step);
    this.recentTokenInflow += amount;
  }

  /**
   * Decay recent inflow tracking (exponential decay)
   */
  updateTokenVelocity(currentStep: number): void {
    const policy = this.model?.dao?.votingPowerPolicy;
    const window = policy?.velocityWindow ?? 0;
    if (window <= 0) {
      this.lastTokenVelocityStep = currentStep;
      return;
    }

    const stepsSince = currentStep - this.lastTokenVelocityStep;
    if (stepsSince <= 0) return;

    const decayFactor = Math.pow(0.5, stepsSince / Math.max(1, window));
    this.recentTokenInflow *= decayFactor;
    this.lastTokenVelocityStep = currentStep;
  }

  private getVelocityPenalty(): number {
    const policy = this.model?.dao?.votingPowerPolicy;
    if (!policy || policy.velocityWindow <= 0 || policy.velocityPenalty <= 0) {
      return 0;
    }

    const balance = Math.max(this.tokens + this.stakedTokens, 1);
    const ratio = this.recentTokenInflow / balance;
    const penalty = Math.min(1, ratio * policy.velocityPenalty);
    return Math.max(0, penalty);
  }

  /**
   * Apply vote power caps and time-weighted penalties
   */
  private applyVotingPowerPolicy(weight: number): number {
    const policy = this.model?.dao?.votingPowerPolicy;
    if (!policy) return weight;

    let adjusted = weight;

    if (policy.quadraticThreshold > 0 && adjusted > policy.quadraticThreshold) {
      const excess = adjusted - policy.quadraticThreshold;
      adjusted = policy.quadraticThreshold + Math.sqrt(excess);
    }

    if (policy.capFraction > 0 && this.model?.dao) {
      const totalVotingPower = this.model.dao.getTotalVotingPower();
      const cap = totalVotingPower * policy.capFraction;
      if (cap > 0) {
        adjusted = Math.min(adjusted, cap);
      }
    }

    const penalty = this.getVelocityPenalty();
    if (penalty > 0) {
      adjusted *= 1 - penalty;
    }

    return Math.max(0, adjusted);
  }

  /**
   * Record an external vote (e.g., inter-DAO proposals) to keep fatigue consistent.
   */
  recordExternalVote(): void {
    this.applyVoteFatigue();
  }

  /**
   * Get the effective voting probability considering fatigue and apathy
   * Models realistic DAO participation where many members don't vote
   */
  getEffectiveVotingProbability(): number {
    // Per-agent calibrated probability bypasses generic apathy/salience/boost logic.
    // This is set from voter cluster data for historically calibrated simulations.
    if (this.calibratedVotingProbability !== undefined) {
      // Still apply fatigue so agents who vote heavily slow down
      return Math.min(1, Math.max(0, this.calibratedVotingProbability * (1 - this.voterFatigue)));
    }

    const baseActivity = this.model.dao?.votingActivity ?? 0.3;
    const boost = this.model.dao?.participationBoost ?? 0;
    // First apply base apathy (many members simply don't engage)
    const afterApathy = (baseActivity + boost) * (1 - DAOMember.BASE_APATHY);
    // Then apply fatigue reduction
    let probability = afterApathy * (1 - this.voterFatigue);

    const inactivityBoost = this.model.dao?.participationPolicy?.inactivityBoost ?? 0;
    if (inactivityBoost > 0) {
      const stepsSinceVote = this.model.currentStep - this.lastVoteStep;
      if (stepsSinceVote >= DAOMember.INACTIVITY_BOOST_THRESHOLD) {
        probability *= 1 + inactivityBoost;
      }
    }

    return Math.min(1, Math.max(0, probability));
  }

  private getProposalSalience(proposal: Proposal): number {
    const treasuryFunds = this.model.dao?.treasury?.funds ?? 0;
    if (proposal.fundingGoal <= 0 || treasuryFunds <= 0) {
      return 0.6;
    }

    // Scale salience based on funding ask relative to treasury (10% ask => max salience)
    const ratio = proposal.fundingGoal / Math.max(treasuryFunds, 1);
    const scaled = Math.min(1, ratio / 0.1);
    return 0.4 + 0.6 * scaled;
  }

  private getProposalVotingProbability(proposal: Proposal, isReminder: boolean): number {
    const base = this.getEffectiveVotingProbability();
    // Calibrated agents: single chance per proposal (no reminder, no salience scaling).
    // Their probability already reflects real-world voting behavior including late voting.
    if (this.calibratedVotingProbability !== undefined) {
      return isReminder ? 0 : Math.min(1, base);
    }
    const salience = this.getProposalSalience(proposal);
    const probability = base * salience;
    if (!isReminder) {
      return Math.min(1, probability);
    }
    if (probability <= 0) {
      return 0;
    }
    return Math.min(1, probability * (1 + DAOMember.REMINDER_BOOST));
  }

  // OPTIMIZATION: Track last cleanup step to avoid cleaning up every call
  private lastCleanupStep: number = -10;

  voteOnRandomProposal(): void {
    if (!this.model.dao) return;

    // Update fatigue (decay over time)
    this.updateVoterFatigue();

    // OPTIMIZATION: Early exit if voting probability is essentially zero
    const effectiveProb = this.getEffectiveVotingProbability();
    if (effectiveProb < 0.001) return;

    // OPTIMIZATION: Use cached open proposals instead of filtering every call
    const openProposals = this.model.dao.getOpenProposals();

    // OPTIMIZATION: Only do cleanup every 10 steps instead of every call
    // This saves ~27% of voting time
    if (this.model.currentStep - this.lastCleanupStep >= 10) {
      this.lastCleanupStep = this.model.currentStep;
      const activeIds = new Set(openProposals.map(p => p.uniqueId));
      if (this.proposalsConsidered.size > 0) {
        for (const id of this.proposalsConsidered) {
          // Stage-aware keys use format "proposalId_stageN" — extract base ID
          const baseId = id.includes('_stage') ? id.substring(0, id.lastIndexOf('_stage')) : id;
          if (!activeIds.has(baseId)) {
            this.proposalsConsidered.delete(id);
            this.proposalsReminded.delete(id);
          }
        }
      }
      // Clean up stale entries from votes and comments maps
      if (this.votes.size > activeIds.size * 2) {
        for (const proposalId of this.votes.keys()) {
          if (!activeIds.has(proposalId)) {
            this.votes.delete(proposalId);
            this.comments.delete(proposalId);
          }
        }
      }
    }

    // Get all open proposals we haven't considered yet
    // KEY: Only consider each proposal ONCE per stage (prevents cumulative probability inflation)
    // Without this, 45% chance per step over 5 steps = 95% eventual participation
    // For multi-stage proposals, we track consideration per stage so members can vote in each stage
    const openProps = openProposals.filter(p => {
      if (isMultiStageProposal(p)) {
        if (!p.isInVotingStage) {
          return false;
        }
      }

      const inVotingPeriod =
        this.model.currentStep <= p.creationTime + p.votingPeriod;
      // For multi-stage proposals, track consideration per stage
      // This allows members to vote in each stage (temp_check, then on_chain)
      const considerationKey = isMultiStageProposal(p)
        ? `${p.uniqueId}_stage${p.currentStageIndex}`
        : p.uniqueId;
      const notYetConsidered = !this.proposalsConsidered.has(considerationKey);
      return inVotingPeriod && notYetConsidered;
    });

    const reminderProps = openProposals.filter(p => {
      const ms = isMultiStageProposal(p);
      // Use stage-aware keys for multi-stage proposals
      const considerationKey = ms
        ? `${p.uniqueId}_stage${p.currentStageIndex}`
        : p.uniqueId;
      if (!this.proposalsConsidered.has(considerationKey)) return false;
      if (this.proposalsReminded.has(considerationKey)) return false;
      if (this.votes.has(p.uniqueId)) return false;
      if (ms) {
        if (!p.isInVotingStage || !p.currentStageState) {
          return false;
        }
      }
      const stageDuration = ms && p.currentStageState
        ? p.currentStageState.endStep - p.currentStageState.startStep
        : p.votingPeriod;
      const votingEnd = ms && p.currentStageState
        ? p.currentStageState.endStep
        : p.creationTime + p.votingPeriod;
      const remaining = votingEnd - this.model.currentStep;
      const reminderWindow = Math.max(
        1,
        Math.floor(stageDuration * DAOMember.REMINDER_WINDOW_FRACTION)
      );
      return remaining <= reminderWindow && remaining >= 0;
    });

    if (openProps.length === 0 && reminderProps.length === 0) return;

    // Vote on proposals with per-proposal probability (one chance per proposal)
    // This models real DAO behavior: members see a proposal and decide once
    let votedCount = 0;

    for (const proposal of openProps) {
      const ms = isMultiStageProposal(proposal);
      const considerationKey = ms
        ? `${proposal.uniqueId}_stage${proposal.currentStageIndex}`
        : proposal.uniqueId;
      // Mark as considered regardless of vote decision (prevents re-rolling)
      this.proposalsConsidered.add(considerationKey);

      // Each proposal gets ONE independent chance of being voted on
      if (random() < this.getProposalVotingProbability(proposal, false)) {
        this.voteOnProposal(proposal);
        votedCount++;
      }
    }

    // Reminder pass near the end of the voting window
    for (const proposal of reminderProps) {
      const ms = isMultiStageProposal(proposal);
      const reminderKey = ms
        ? `${proposal.uniqueId}_stage${proposal.currentStageIndex}`
        : proposal.uniqueId;
      this.proposalsReminded.add(reminderKey);
      if (random() < this.getProposalVotingProbability(proposal, true)) {
        this.voteOnProposal(proposal);
        votedCount++;
      }
    }

    // Apply fatigue proportional to votes cast
    if (votedCount > 0) {
      for (let i = 0; i < votedCount; i++) {
        this.applyVoteFatigue();
      }
    }
  }

  leaveCommentOnRandomProposal(): void {
    if (!this.model.dao) return;

    // OPTIMIZATION: Use cached open proposals
    const openProps = this.model.dao.getOpenProposals();
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

      // Subjective belief based on proposal characteristics
      let belief = 0.5;

      // Factor in funding progress
      if (proposal.fundingGoal > 0) {
        const fundingRatio = proposal.currentFunding / proposal.fundingGoal;
        belief += fundingRatio * 0.2;
      }

      // Factor in vote ratio (information cascade / herding effect)
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      if (totalVotes > 0) {
        const supportRatio = proposal.votesFor / totalVotes;
        belief += supportRatio * settings.voteHerdingFactor;
      }

      // Factor in forum discussion sentiment (if forum is enabled)
      if (this.model.forumSimulation) {
        belief += this.model.forumSimulation.getVotingBias(proposal.uniqueId);
      }

      // Add personal optimism bias. Calibrated agents use a stronger factor
      // to match the historical approval rate (e.g. 97% for Aave).
      // Without calibration, optimism adds only mild noise (±5%).
      const optimismFactor = this.calibratedVotingProbability !== undefined ? 1.0 : 0.1;
      belief += (this.optimism - 0.5) * optimismFactor;

      belief = clamp(belief);

      return random() < belief ? 'yes' : 'no';
    }

    // Default: random decision
    return random() < 0.5 ? 'yes' : 'no';
  }

  // Cache for member lookup to avoid O(n) searches
  // Keyed by daoId to support multi-DAO scenarios (DAOCity)
  private static memberLookupCache: Map<string, Map<string, DAOMember>> = new Map();
  private static memberLookupCacheKeys: Map<string, number> = new Map(); // daoId -> step

  /**
   * Get or build member lookup cache
   * Cache is invalidated each step to handle member changes
   * Cache is keyed by daoId to prevent cross-DAO member confusion in multi-DAO scenarios
   */
  private getMemberLookup(): Map<string, DAOMember> {
    const currentStep = this.model.currentStep;
    const cacheKey = this.daoId;
    const cachedStep = DAOMember.memberLookupCacheKeys.get(cacheKey);

    // Rebuild cache if step changed or cache doesn't exist for this DAO
    if (cachedStep !== currentStep || !DAOMember.memberLookupCache.has(cacheKey)) {
      const cache = new Map<string, DAOMember>();
      if (this.model.dao) {
        for (const member of this.model.dao.members) {
          cache.set(member.uniqueId, member);
        }
      }
      DAOMember.memberLookupCache.set(cacheKey, cache);
      DAOMember.memberLookupCacheKeys.set(cacheKey, currentStep);
    }

    return DAOMember.memberLookupCache.get(cacheKey)!;
  }

  /**
   * Clear all cached member lookups (useful for testing)
   */
  static clearMemberLookupCache(): void {
    DAOMember.memberLookupCache.clear();
    DAOMember.memberLookupCacheKeys.clear();
  }

  /**
   * Find a member by ID using cached lookup (O(1) instead of O(n))
   */
  protected findMemberById(memberId: string): DAOMember | undefined {
    return this.getMemberLookup().get(memberId);
  }

  /**
   * Check if delegating to target would create a circular delegation
   * Uses DelegationResolver for multi-level cycle detection
   */
  private wouldCreateCircularDelegation(target: DAOMember): boolean {
    return DelegationResolver.wouldCreateCycle(this, target);
  }

  /**
   * Set or clear the representative for liquid delegation
   * Handles bidirectional relationship with delegates array
   */
  setRepresentative(rep: DAOMember | null): void {
    // Remove from previous representative's delegates list
    if (this.representative) {
      const idx = this.representative.delegates.indexOf(this);
      if (idx > -1) {
        this.representative.delegates.splice(idx, 1);
      }
      // Invalidate cache for previous representative
      DelegationResolver.invalidateMember(this.representative.uniqueId);
    }

    this.representative = rep;

    // Add to new representative's delegates list
    if (rep && !rep.delegates.includes(this)) {
      rep.delegates.push(this);
      // Invalidate cache for new representative
      DelegationResolver.invalidateMember(rep.uniqueId);
    }

    // Invalidate cache for self
    DelegationResolver.invalidateMember(this.uniqueId);
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

    // Invalidate voting power cache for both parties
    DelegationResolver.invalidateMember(this.uniqueId);
    DelegationResolver.invalidateMember(delegate.uniqueId);

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

    // Invalidate voting power cache for both parties
    DelegationResolver.invalidateMember(this.uniqueId);
    DelegationResolver.invalidateMember(delegate.uniqueId);

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
   * Default step method - override in subclasses.
   *
   * Subclasses should call super.step() if they need base behaviors:
   * - transferCooldown decrement (for multi-DAO transfers)
   *
   * Note: Most agents don't need to call super.step() unless using multi-DAO
   * transfer features. However, calling it is good practice for future compatibility.
   */
  step(): void {
    // Decrement transfer cooldown if active (for multi-DAO transfers)
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

    // Return tokens to members who delegated to us
    for (const delegator of this.delegates) {
      const amount = delegator.delegations.get(this.uniqueId) || 0;
      if (amount > 0) {
        delegator.tokens += amount;
      }
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
