// Main DAO class

import { EventBus } from '../utils/event-bus';
import { Treasury } from './treasury';
import type { Proposal } from './proposal';
import type { Project } from './project';
import type { Dispute } from './dispute';
import type { Violation } from './violation';
import type { Guild } from './guild';
import type { DAOMember } from '../agents/base';
import type { NFTMarketplace } from './nft';

export class PredictionMarket {
  dao: DAO;
  treasury: Treasury;
  eventBus: EventBus | null;
  markets: Map<string, any> = new Map();

  constructor(dao: DAO, treasury: Treasury, eventBus: EventBus | null = null) {
    this.dao = dao;
    this.treasury = treasury;
    this.eventBus = eventBus;
  }

  createMarket(proposalId: string, outcomeOptions: string[]): void {
    this.markets.set(proposalId, {
      outcomes: outcomeOptions,
      bets: new Map(),
      totalPool: 0,
    });
  }

  placeBet(proposalId: string, memberId: string, outcome: string, amount: number): boolean {
    const market = this.markets.get(proposalId);
    if (!market) return false;

    if (!market.bets.has(memberId)) {
      market.bets.set(memberId, {});
    }

    const memberBets = market.bets.get(memberId);
    memberBets[outcome] = (memberBets[outcome] || 0) + amount;
    market.totalPool += amount;

    return true;
  }

  resolveMarket(proposalId: string, winningOutcome: string): void {
    const market = this.markets.get(proposalId);
    if (!market) return;

    // Distribute winnings proportionally
    const totalWinningBets = Array.from(market.bets.values()).reduce(
      (sum, bets) => sum + (bets[winningOutcome] || 0),
      0
    );

    if (totalWinningBets > 0) {
      for (const [memberId, bets] of market.bets.entries()) {
        const winningBet = bets[winningOutcome] || 0;
        if (winningBet > 0) {
          const payout = (winningBet / totalWinningBets) * market.totalPool;
          // Payout would be distributed to the member
          if (this.eventBus) {
            this.eventBus.publish('prediction_payout', {
              step: this.dao.currentStep,
              member: memberId,
              amount: payout,
            });
          }
        }
      }
    }
  }
}

export class DAO {
  name: string;
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
  externalPartnerInteractProbability: number;
  violationProbability: number;
  reputationPenalty: number;
  stakingInterestRate: number;
  slashFraction: number;
  reputationDecayRate: number;
  currentStep: number = 0;
  marketShocks: any[] = [];
  currentShock: number = 0;

  constructor(
    name: string,
    violationProbability: number = 0.1,
    reputationPenalty: number = 5,
    commentProbability: number = 0.5,
    externalPartnerInteractProbability: number = 0,
    stakingInterestRate: number = 0,
    slashFraction: number = 0,
    reputationDecayRate: number = 0
  ) {
    this.name = name;
    this.violationProbability = violationProbability;
    this.reputationPenalty = reputationPenalty;
    this.commentProbability = commentProbability;
    this.externalPartnerInteractProbability = externalPartnerInteractProbability;
    this.stakingInterestRate = stakingInterestRate;
    this.slashFraction = slashFraction;
    this.reputationDecayRate = reputationDecayRate;

    this.eventBus = new EventBus(false);
    this.treasury = new Treasury(this.eventBus);
    this.predictionMarket = new PredictionMarket(this, this.treasury, this.eventBus);
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

  createGuild(name: string, creator?: DAOMember): Guild {
    // Import here to avoid circular dependency
    const { Guild } = require('./guild');
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

  removeGuild(guild: Guild): void {
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
