// Main DAO class

import { EventBus } from '../utils/event-bus';
import { Treasury } from './treasury';
import { PredictionMarket } from './prediction-market';
import type { Proposal } from './proposal';
import type { Project } from './project';
import type { Dispute } from './dispute';
import type { Violation } from './violation';
import type { Guild } from './guild';
import type { DAOMember } from '../agents/base';
import type { NFTMarketplace } from './nft';
import type { MarketShock } from './market-shock';

export interface TopicConfig {
  topic: string;
  weight: number;
  fundingRange: [number, number]; // [minFraction, maxFraction] of treasury
}

export interface TreasuryPolicyConfig {
  enabled: boolean;
  targetReserve: number;
  targetReserveFraction: number;
  emaAlpha: number;
  bufferFraction: number;
  bufferFillRate: number;
  emergencyTopupRate: number;
  maxSpendFraction: number;
}

export interface ProposalPolicyConfig {
  bondFraction: number;
  bondMin: number;
  bondMax: number;
  inactivitySteps: number;
  tempCheckFraction: number;
  fastTrackMinSteps: number;
  fastTrackApproval: number;
  fastTrackQuorum: number;
}

export interface ParticipationPolicyConfig {
  targetRate: number;
  boostStrength: number;
  boostDecay: number;
  boostMax: number;
  inactivityBoost: number;
  rewardPerVote: number;
}

export interface VotingPowerPolicyConfig {
  capFraction: number;
  quadraticThreshold: number;
  velocityWindow: number;
  velocityPenalty: number;
}

export class DAO {
  name: string;
  // Multi-DAO support properties
  daoId: string;
  tokenSymbol: string;
  color: string;

  proposals: Proposal[] = [];
  projects: Project[] = [];
  disputes: Dispute[] = [];
  violations: Violation[] = [];
  members: DAOMember[] = [];
  guilds: Guild[] = [];
  eventBus: EventBus;
  treasury: Treasury;
  predictionMarket: PredictionMarket;
  marketplace: NFTMarketplace | null = null;
  commentProbability: number;
  votingActivity: number;  // 0-1 probability that agents vote when given the chance
  externalPartnerInteractProbability: number;
  violationProbability: number;
  reputationPenalty: number;
  stakingInterestRate: number;
  slashFraction: number;
  reputationDecayRate: number;
  currentStep: number = 0;
  marketShocks: MarketShock[] = [];
  currentShock: number = 0;

  private cachedVotingPower: number = 0;
  private cachedVotingPowerStep: number = -1;

  treasuryPolicy: TreasuryPolicyConfig = {
    enabled: false,
    targetReserve: 0,
    targetReserveFraction: 0,
    emaAlpha: 0.05,
    bufferFraction: 0,
    bufferFillRate: 0.5,
    emergencyTopupRate: 0,
    maxSpendFraction: 1,
  };
  proposalPolicy: ProposalPolicyConfig = {
    bondFraction: 0,
    bondMin: 0,
    bondMax: 0,
    inactivitySteps: 0,
    tempCheckFraction: 0.25,
    fastTrackMinSteps: 0,
    fastTrackApproval: 0.6,
    fastTrackQuorum: 0.2,
  };
  participationPolicy: ParticipationPolicyConfig = {
    targetRate: 0,
    boostStrength: 0,
    boostDecay: 0,
    boostMax: 0,
    inactivityBoost: 0,
    rewardPerVote: 0,
  };
  votingPowerPolicy: VotingPowerPolicyConfig = {
    capFraction: 0,
    quadraticThreshold: 0,
    velocityWindow: 0,
    velocityPenalty: 0,
  };
  participationBoost: number = 0;
  treasuryBuffer: number = 0;
  delegationLockSteps: number = 0;
  proposalTopicConfig?: TopicConfig[];

  // Pending removal queues for safe iteration
  private pendingProposalRemovals: Set<Proposal> = new Set();
  private pendingProjectRemovals: Set<Project> = new Set();
  private pendingMemberRemovals: Set<DAOMember> = new Set();
  private pendingDisputeRemovals: Set<Dispute> = new Set();
  private pendingViolationRemovals: Set<Violation> = new Set();
  private pendingGuildRemovals: Set<Guild> = new Set();

  constructor(
    name: string,
    violationProbability: number = 0.1,
    reputationPenalty: number = 5,
    commentProbability: number = 0.5,
    votingActivity: number = 0.3,
    externalPartnerInteractProbability: number = 0,
    stakingInterestRate: number = 0,
    slashFraction: number = 0,
    reputationDecayRate: number = 0,
    // Multi-DAO support (optional for backward compatibility)
    daoId?: string,
    tokenSymbol?: string,
    color?: string
  ) {
    this.name = name;
    // Generate default daoId from name if not provided
    this.daoId = daoId || `dao_${name.toLowerCase().replace(/\s+/g, '_')}`;
    // Generate default token symbol from name if not provided
    this.tokenSymbol = tokenSymbol || `${name.toUpperCase().replace(/\s+/g, '').slice(0, 4)}_TOKEN`;
    // Default color
    this.color = color || '#4ADE80';

    this.violationProbability = violationProbability;
    this.reputationPenalty = reputationPenalty;
    this.commentProbability = commentProbability;
    this.votingActivity = votingActivity;
    this.externalPartnerInteractProbability = externalPartnerInteractProbability;
    this.stakingInterestRate = stakingInterestRate;
    this.slashFraction = slashFraction;
    this.reputationDecayRate = reputationDecayRate;

    this.eventBus = new EventBus(false);
    this.treasury = new Treasury(this.eventBus);
    this.predictionMarket = new PredictionMarket(this, this.treasury, this.eventBus);
  }

  /**
   * Get the DAO's token symbol
   */
  getTokenSymbol(): string {
    return this.tokenSymbol;
  }

  /**
   * Get the primary treasury token symbol, falling back to DAO_TOKEN when needed.
   */
  getPrimaryTokenSymbol(): string {
    if (
      this.treasury.tokenPrices.has(this.tokenSymbol) ||
      this.treasury.getTokenBalance(this.tokenSymbol) > 0
    ) {
      return this.tokenSymbol;
    }
    return 'DAO_TOKEN';
  }

  /**
   * Get summary of DAO state for broadcasting
   */
  getState(): {
    id: string;
    name: string;
    tokenSymbol: string;
    color: string;
    memberCount: number;
    proposalCount: number;
    projectCount: number;
    guildCount: number;
    treasuryBalance: number;
  } {
    return {
      id: this.daoId,
      name: this.name,
      tokenSymbol: this.tokenSymbol,
      color: this.color,
      memberCount: this.members.length,
      proposalCount: this.proposals.length,
      projectCount: this.projects.length,
      guildCount: this.guilds.length,
      treasuryBalance: this.treasury.getTokenBalance(this.tokenSymbol),
    };
  }

  addProposal(proposal: Proposal): void {
    proposal.creationTime = this.currentStep;
    proposal.lastActivityStep = this.currentStep;
    if (!proposal.uniqueId) {
      proposal.uniqueId = `proposal_${this.proposals.length}`;
    }

    // Take voting power snapshot at proposal creation
    // This is critical for preventing flash loan attacks
    // All real DAOs (Compound, Aave, Uniswap) use block-height snapshots
    proposal.takeVotingPowerSnapshot();

    // Apply proposal bond (escrow in treasury) if configured
    const policy = this.proposalPolicy;
    if (policy.bondFraction > 0 || policy.bondMin > 0) {
      const fundingBase = Math.max(0, proposal.fundingGoal || 0);
      const rawBond = fundingBase * policy.bondFraction;
      const requiredBond = Math.min(policy.bondMax, Math.max(policy.bondMin, rawBond));
      const creator = this.members.find(m => m.uniqueId === proposal.creator);

      if (creator && requiredBond > 0) {
        const paidBond = Math.min(creator.tokens, requiredBond);
        if (paidBond > 0) {
          creator.tokens -= paidBond;
          this.treasury.deposit(this.getPrimaryTokenSymbol(), paidBond, this.currentStep);
          proposal.bondAmount = paidBond;
          proposal.bondRefunded = false;
          proposal.bondSlashed = false;
        }

        if (this.eventBus) {
          this.eventBus.publish('proposal_bond_posted', {
            step: this.currentStep,
            proposalId: proposal.uniqueId,
            creator: proposal.creator,
            requiredBond,
            paidBond,
          });
        }
      }
    }

    this.proposals.push(proposal);

    if (this.eventBus) {
      this.eventBus.publish('proposal_created', {
        step: this.currentStep,
        title: proposal.title,
        snapshotSize: proposal.votingPowerSnapshot.size,
      });
    }
  }

  addProject(project: Project): void {
    if (!project.uniqueId) {
      project.uniqueId = `project_${this.projects.length}`;
    }
    this.projects.push(project);
  }

  addDispute(dispute: Dispute): void {
    this.disputes.push(dispute);
  }

  addViolation(violation: Violation): void {
    this.violations.push(violation);
  }

  addMember(member: DAOMember): void {
    this.members.push(member);
  }

  /**
   * Get total voting power with per-step caching
   */
  getTotalVotingPower(): number {
    if (this.cachedVotingPowerStep !== this.currentStep) {
      this.cachedVotingPower = this.members.reduce(
        (sum, member) => sum + member.tokens + member.stakedTokens,
        0
      );
      this.cachedVotingPowerStep = this.currentStep;
    }

    return Math.max(this.cachedVotingPower, 1);
  }

  invalidateVotingPowerCache(): void {
    this.cachedVotingPowerStep = -1;
  }

  // ==========================================================================
  // Safe Iteration Methods - return copies to prevent modification during iteration
  // ==========================================================================

  /**
   * Get a safe copy of proposals for iteration
   */
  getProposalsSnapshot(): Proposal[] {
    return [...this.proposals];
  }

  /**
   * Get a safe copy of projects for iteration
   */
  getProjectsSnapshot(): Project[] {
    return [...this.projects];
  }

  /**
   * Get a safe copy of members for iteration
   */
  getMembersSnapshot(): DAOMember[] {
    return [...this.members];
  }

  // ==========================================================================
  // Mark for Removal Methods - safe for use during iteration
  // ==========================================================================

  /**
   * Mark a proposal for removal (processed at end of step)
   */
  markProposalForRemoval(proposal: Proposal): void {
    this.pendingProposalRemovals.add(proposal);
  }

  /**
   * Mark a project for removal (processed at end of step)
   */
  markProjectForRemoval(project: Project): void {
    this.pendingProjectRemovals.add(project);
  }

  /**
   * Mark a member for removal (processed at end of step)
   */
  markMemberForRemoval(member: DAOMember): void {
    this.pendingMemberRemovals.add(member);
  }

  /**
   * Mark a dispute for removal (processed at end of step)
   */
  markDisputeForRemoval(dispute: Dispute): void {
    this.pendingDisputeRemovals.add(dispute);
  }

  /**
   * Mark a violation for removal (processed at end of step)
   */
  markViolationForRemoval(violation: Violation): void {
    this.pendingViolationRemovals.add(violation);
  }

  /**
   * Mark a guild for removal (processed at end of step)
   */
  markGuildForRemoval(guild: Guild): void {
    this.pendingGuildRemovals.add(guild);
  }

  /**
   * Process all pending removals - call at end of simulation step
   */
  processPendingRemovals(): void {
    // Process proposal removals
    for (const proposal of this.pendingProposalRemovals) {
      const index = this.proposals.indexOf(proposal);
      if (index > -1) {
        this.proposals.splice(index, 1);
      }
    }
    this.pendingProposalRemovals.clear();

    // Process project removals
    for (const project of this.pendingProjectRemovals) {
      const index = this.projects.indexOf(project);
      if (index > -1) {
        this.projects.splice(index, 1);
      }
    }
    this.pendingProjectRemovals.clear();

    // Process member removals
    for (const member of this.pendingMemberRemovals) {
      const index = this.members.indexOf(member);
      if (index > -1) {
        this.members.splice(index, 1);
      }
    }
    this.pendingMemberRemovals.clear();

    // Process dispute removals
    for (const dispute of this.pendingDisputeRemovals) {
      const index = this.disputes.indexOf(dispute);
      if (index > -1) {
        this.disputes.splice(index, 1);
      }
    }
    this.pendingDisputeRemovals.clear();

    // Process violation removals
    for (const violation of this.pendingViolationRemovals) {
      const index = this.violations.indexOf(violation);
      if (index > -1) {
        this.violations.splice(index, 1);
      }
    }
    this.pendingViolationRemovals.clear();

    // Process guild removals
    for (const guild of this.pendingGuildRemovals) {
      const index = this.guilds.indexOf(guild);
      if (index > -1) {
        this.guilds.splice(index, 1);
        if (this.eventBus) {
          this.eventBus.publish('guild_removed', {
            step: this.currentStep,
            guild: guild.name,
          });
        }
      }
    }
    this.pendingGuildRemovals.clear();
  }

  // ==========================================================================
  // Immediate Removal Methods - use only when not iterating
  // ==========================================================================

  removeProposal(proposal: Proposal): void {
    const index = this.proposals.indexOf(proposal);
    if (index > -1) {
      this.proposals.splice(index, 1);
    }
  }

  removeProject(project: Project): void {
    const index = this.projects.indexOf(project);
    if (index > -1) {
      this.projects.splice(index, 1);
    }
  }

  removeDispute(dispute: Dispute): void {
    const index = this.disputes.indexOf(dispute);
    if (index > -1) {
      this.disputes.splice(index, 1);
    }
  }

  removeViolation(violation: Violation): void {
    const index = this.violations.indexOf(violation);
    if (index > -1) {
      this.violations.splice(index, 1);
    }
  }

  removeMember(member: DAOMember): void {
    const index = this.members.indexOf(member);
    if (index > -1) {
      this.members.splice(index, 1);
    }
  }

  /**
   * Create a new guild - async to support dynamic import
   * Use createGuildSync if you're sure the Guild class is already loaded
   */
  async createGuild(name: string, creator?: DAOMember): Promise<Guild> {
    // Dynamic import to avoid circular dependency at module load time
    const { Guild } = await import('./guild');
    const guild = new Guild(name, this, creator);
    this.guilds.push(guild);

    if (this.eventBus) {
      this.eventBus.publish('guild_created', {
        step: this.currentStep,
        guild: name,
        creator: creator?.uniqueId || null,
      });
    }

    return guild;
  }

  // Cache for the Guild class once loaded
  private static GuildClass: typeof import('./guild').Guild | null = null;

  /**
   * Synchronous guild creation - requires Guild class to be preloaded
   * Call DAO.preloadGuildClass() at startup if using this method
   */
  createGuildSync(name: string, creator?: DAOMember): Guild {
    if (!DAO.GuildClass) {
      // Fallback to require if class not preloaded
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Guild } = require('./guild');
      DAO.GuildClass = Guild;
    }

    // GuildClass is guaranteed to be non-null after the above check
    const GuildConstructor = DAO.GuildClass!;
    const guild = new GuildConstructor(name, this, creator);
    this.guilds.push(guild);

    if (this.eventBus) {
      this.eventBus.publish('guild_created', {
        step: this.currentStep,
        guild: name,
        creator: creator?.uniqueId || null,
      });
    }

    return guild;
  }

  /**
   * Preload the Guild class for synchronous creation
   * Call this at application startup
   */
  static async preloadGuildClass(): Promise<void> {
    if (!DAO.GuildClass) {
      const { Guild } = await import('./guild');
      DAO.GuildClass = Guild;
    }
  }

  removeGuild(guild: Guild, emitEvent: boolean = true): void {
    const index = this.guilds.indexOf(guild);
    if (index > -1) {
      this.guilds.splice(index, 1);

      if (emitEvent && this.eventBus) {
        this.eventBus.publish('guild_removed', {
          step: this.currentStep,
          guild: guild.name,
        });
      }
    }
  }

  findGuildByName(name: string): Guild | null {
    return this.guilds.find(g => g.name === name) || null;
  }

  distributeRevenue(amount: number, token: string): number {
    const totalStaked = this.members.reduce((sum, m) => sum + m.stakedTokens, 0);

    if (amount <= 0 || totalStaked <= 0) {
      return 0;
    }

    for (const member of this.members) {
      if (member.stakedTokens <= 0) continue;

      const share = amount * (member.stakedTokens / totalStaked);
      member.tokens += share;

      if (this.eventBus) {
        this.eventBus.publish('revenue_share', {
          step: this.currentStep,
          member: member.uniqueId,
          token,
          amount: share,
        });
      }
    }

    return amount;
  }

  buybackTokens(amount: number, token: string = 'DAO_TOKEN'): void {
    this.treasury.withdraw(token, amount, this.currentStep);
  }

  stakeTokens(amount: number, token: string, member: DAOMember, lockupPeriod: number = 0): number {
    if (amount <= 0) return 0;

    const stake = Math.min(amount, member.tokens);
    if (stake <= 0) return 0;

    member.tokens -= stake;
    member.stakedTokens += stake;

    const unlockStep = this.currentStep + lockupPeriod;
    member.stakeLocks.push({ amount: stake, unlockStep });

    // Staked tokens tracked on member only, not deposited into treasury
    // (they remain locked but are not treasury funds)

    if (this.eventBus) {
      this.eventBus.publish('tokens_staked', {
        step: this.currentStep,
        member: member.uniqueId,
        token,
        amount: stake,
        lockup: lockupPeriod,
      });
    }

    this.invalidateVotingPowerCache();

    return stake;
  }

  unstakeTokens(amount: number, token: string, member: DAOMember): number {
    if (amount <= 0 || member.stakedTokens <= 0) return 0;

    // Calculate available unlocked stakes
    let available = 0;
    for (const lock of member.stakeLocks) {
      if (this.currentStep >= lock.unlockStep) {
        available += lock.amount;
      }
    }

    const toUnstake = Math.min(amount, available);
    if (toUnstake <= 0) return 0;

    // Remove from locks
    let remaining = toUnstake;
    const newLocks: Array<{ amount: number; unlockStep: number }> = [];

    for (const lock of member.stakeLocks) {
      if (this.currentStep >= lock.unlockStep && remaining > 0) {
        const take = Math.min(lock.amount, remaining);
        const leftover = lock.amount - take;
        remaining -= take;

        if (leftover > 0) {
          newLocks.push({ amount: leftover, unlockStep: lock.unlockStep });
        }
      } else if (lock.amount > 0) {
        newLocks.push(lock);
      }
    }

    member.stakeLocks = newLocks;
    member.stakedTokens -= toUnstake;
    // Staked tokens tracked on member only, no treasury withdrawal needed
    member.tokens += toUnstake;

    if (this.eventBus) {
      this.eventBus.publish('tokens_unstaked', {
        step: this.currentStep,
        member: member.uniqueId,
        token,
        amount: toUnstake,
      });
    }

    this.invalidateVotingPowerCache();

    return toUnstake;
  }

  /**
   * Apply staking interest to all members.
   *
   * CRITICAL FIX: The stakingInterestRate is an ANNUAL rate (APY).
   * We convert it to a per-step rate to prevent exponential growth.
   *
   * Formula: perStepRate = (1 + APY)^(1/stepsPerYear) - 1
   *
   * With STEP_DURATION_HOURS = 1:
   *   stepsPerYear = 24 * 365 = 8760
   *   For APY of 5%: perStepRate = (1.05)^(1/8760) - 1 ≈ 0.0000056
   *
   * This ensures 5% APY compounds correctly over a year, not per step.
   */
  applyStakingInterest(): void {
    if (this.stakingInterestRate <= 0) return;

    // Import time constants (using inline calculation to avoid circular imports)
    const STEP_DURATION_HOURS = 1;
    const STEPS_PER_YEAR = (24 / STEP_DURATION_HOURS) * 365;

    // Convert annual rate to per-step rate
    // APY compounds: (1 + APY) = (1 + perStepRate)^stepsPerYear
    // Therefore: perStepRate = (1 + APY)^(1/stepsPerYear) - 1
    const perStepRate = Math.pow(1 + this.stakingInterestRate, 1 / STEPS_PER_YEAR) - 1;

    // Cap total interest payout by available treasury balance
    const token = 'DAO_TOKEN';
    const treasuryBalance = this.treasury.getTokenBalance(token);
    const stakingMembers = this.members.filter(m => m.stakedTokens > 0);
    const maxPerMember = stakingMembers.length > 0 ? treasuryBalance / stakingMembers.length : 0;

    for (const member of stakingMembers) {
      const interest = Math.min(member.stakedTokens * perStepRate, maxPerMember);
      if (interest > 0) {
        this.treasury.withdraw(token, interest, this.currentStep);
        member.stakedTokens += interest;

        if (this.eventBus) {
          this.eventBus.publish('staking_interest', {
            step: this.currentStep,
            member: member.uniqueId,
            amount: interest,
            perStepRate,
            annualRate: this.stakingInterestRate,
          });
        }
      }
    }

    this.invalidateVotingPowerCache();
  }

  applyReputationDecay(): void {
    if (this.reputationDecayRate <= 0) return;

    for (const member of this.members) {
      const decay = member.reputation * this.reputationDecayRate;
      member.reputation = Math.max(0, member.reputation - decay);
    }
  }
}
