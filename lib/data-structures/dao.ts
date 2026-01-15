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
    if (!proposal.uniqueId) {
      proposal.uniqueId = `proposal_${this.proposals.length}`;
    }
    this.proposals.push(proposal);

    if (this.eventBus) {
      this.eventBus.publish('proposal_created', {
        step: this.currentStep,
        title: proposal.title,
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

    this.treasury.deposit(token, stake, this.currentStep);

    if (this.eventBus) {
      this.eventBus.publish('tokens_staked', {
        step: this.currentStep,
        member: member.uniqueId,
        token,
        amount: stake,
        lockup: lockupPeriod,
      });
    }

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
    this.treasury.withdraw(token, toUnstake, this.currentStep);
    member.tokens += toUnstake;

    if (this.eventBus) {
      this.eventBus.publish('tokens_unstaked', {
        step: this.currentStep,
        member: member.uniqueId,
        token,
        amount: toUnstake,
      });
    }

    return toUnstake;
  }

  applyStakingInterest(): void {
    if (this.stakingInterestRate <= 0) return;

    for (const member of this.members) {
      if (member.stakedTokens > 0) {
        const interest = member.stakedTokens * this.stakingInterestRate;
        member.stakedTokens += interest;

        if (this.eventBus) {
          this.eventBus.publish('staking_interest', {
            step: this.currentStep,
            member: member.uniqueId,
            amount: interest,
          });
        }
      }
    }
  }

  applyReputationDecay(): void {
    if (this.reputationDecayRate <= 0) return;

    for (const member of this.members) {
      const decay = member.reputation * this.reputationDecayRate;
      member.reputation = Math.max(0, member.reputation - decay);
    }
  }
}
