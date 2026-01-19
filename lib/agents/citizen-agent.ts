/**
 * Citizen Agent
 *
 * Represents badge-holding citizens in DAOs like Optimism.
 * Participates in Citizens House voting, RetroPGF allocations, and veto decisions.
 * Uses one-person-one-vote rather than token-weighted voting.
 */

import { DAOMember } from './base';
import type { Proposal } from '../data-structures/proposal';
import type { MultiStageProposal, HouseType } from '../data-structures/multi-stage-proposal';
import type { GovernanceHouse } from '../data-structures/governance-house';
import type { DAOModel } from '../engine/model';
import { random, randomChoice, randomInt } from '../utils/random';

export interface RetroPGFAllocation {
  projectId: string;
  amount: number;
  reason: string;
}

export class CitizenAgent extends DAOMember {
  // Citizens House specific properties
  citizenshipBadge: string;  // Badge type/ID
  badgeGrantedStep: number;
  publicGoodsInterest: number;  // 0-1, interest in public goods funding
  vetoWillingness: number;  // 0-1, willingness to use veto power
  retroPGFParticipation: number;  // 0-1, activity in RetroPGF

  // Voting preferences
  preferredCategories: string[] = [];  // Types of projects they support
  communityAlignment: number;  // How aligned with community consensus

  // Tracking
  vetoVotesCast: number = 0;
  retroPGFAllocations: RetroPGFAllocation[] = [];
  citizenProposalsVoted: number = 0;

  // House reference
  private citizensHouse: GovernanceHouse | null = null;

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number,
    reputation: number,
    location: string,
    citizenshipBadge: string = 'citizen',
    daoId?: string
  ) {
    super(uniqueId, model, tokens, reputation, location, 'majority', daoId);

    this.citizenshipBadge = citizenshipBadge;
    this.badgeGrantedStep = model.currentStep;

    // Citizens have varying interests and behaviors
    this.publicGoodsInterest = 0.5 + random() * 0.5;  // 0.5-1.0
    this.vetoWillingness = 0.2 + random() * 0.5;  // 0.2-0.7 (generally reluctant)
    this.retroPGFParticipation = 0.4 + random() * 0.6;  // 0.4-1.0
    this.communityAlignment = 0.5 + random() * 0.3;  // 0.5-0.8

    // Set preferred project categories
    const allCategories = [
      'infrastructure', 'education', 'tooling', 'community',
      'research', 'security', 'documentation', 'outreach'
    ];
    const numPreferences = randomInt(2, 4);
    for (let i = 0; i < numPreferences; i++) {
      const category = randomChoice(allCategories);
      if (!this.preferredCategories.includes(category)) {
        this.preferredCategories.push(category);
      }
    }
  }

  /**
   * Set the Citizens House reference
   */
  setCitizensHouse(house: GovernanceHouse): void {
    this.citizensHouse = house;
  }

  step(): void {
    super.step();

    if (!this.model.dao) return;

    // Citizens participate in governance at moderate rate
    if (random() < 0.15) {
      this.participateInGovernance();
    }

    // Check for proposals in veto window
    if (random() < this.vetoWillingness * 0.2) {
      this.checkVetoOpportunities();
    }
  }

  /**
   * Participate in Citizens House governance
   */
  private participateInGovernance(): void {
    if (!this.model.dao) return;

    // Respect votingActivity parameter
    const votingActivity = this.model.dao.votingActivity ?? 0.3;
    if (random() >= votingActivity) {
      return;  // Citizen decides not to participate this step
    }

    const openProposals = this.model.dao.proposals.filter(
      p => p.status === 'open' && !this.votes.has(p.uniqueId)
    );

    if (openProposals.length === 0) return;

    const proposal = randomChoice(openProposals);
    this.voteAsCitizen(proposal);
  }

  /**
   * Vote as a citizen (1 person = 1 vote)
   */
  voteAsCitizen(proposal: Proposal): void {
    const support = this.evaluateProposalAsCitizen(proposal);

    // Citizens vote with weight of 1 (not token-weighted)
    proposal.addVote(this.uniqueId, support, 1);
    this.votes.set(proposal.uniqueId, { vote: support, weight: 1 });

    // Also vote in Citizens House if available
    if (this.citizensHouse) {
      this.citizensHouse.vote(this.uniqueId, proposal.uniqueId, support);
    }

    this.citizenProposalsVoted++;
    this.markActive();
  }

  /**
   * Evaluate a proposal from a citizen's perspective
   */
  private evaluateProposalAsCitizen(proposal: Proposal): boolean {
    let supportScore = 0.5;

    // Public goods proposals get bonus
    const titleLower = proposal.title.toLowerCase();
    const publicGoodsKeywords = ['public', 'commons', 'community', 'open source', 'retroactive'];
    for (const keyword of publicGoodsKeywords) {
      if (titleLower.includes(keyword)) {
        supportScore += this.publicGoodsInterest * 0.15;
      }
    }

    // Check if matches preferred categories
    for (const category of this.preferredCategories) {
      if (titleLower.includes(category)) {
        supportScore += 0.1;
      }
    }

    // Factor in community sentiment (follow the crowd somewhat)
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes > 5) {
      const communitySupport = proposal.votesFor / totalVotes;
      supportScore += (communitySupport - 0.5) * this.communityAlignment * 0.3;
    }

    // Add personal randomness
    supportScore += (random() - 0.5) * 0.2;

    return supportScore > 0.5;
  }

  /**
   * Check for proposals in veto window and consider vetoing
   */
  private checkVetoOpportunities(): void {
    if (!this.model.dao) return;

    for (const proposal of this.model.dao.proposals) {
      const multiStage = proposal as unknown as MultiStageProposal;

      // Only consider proposals in veto window
      if (multiStage.currentStage !== 'veto_window') continue;
      if (this.votes.has(proposal.uniqueId)) continue;

      const shouldVeto = this.evaluateForVeto(proposal);
      if (shouldVeto) {
        this.castVetoVote(proposal);
      }
    }
  }

  /**
   * Evaluate whether to veto a proposal
   */
  private evaluateForVeto(proposal: Proposal): boolean {
    // Citizens are generally reluctant to veto
    if (random() > this.vetoWillingness) {
      return false;
    }

    let vetoScore = 0;

    // Check for concerning patterns
    const titleLower = proposal.title.toLowerCase();

    // Treasury draining proposals
    if (proposal.fundingGoal > 0 && this.model.dao) {
      const treasuryBalance = this.model.dao.treasury.getTokenBalance(this.model.dao.tokenSymbol);
      const treasuryRatio = proposal.fundingGoal / Math.max(treasuryBalance, 1);
      if (treasuryRatio > 0.2) {
        vetoScore += 0.3;
      }
    }

    // Controversial topics
    const controversialKeywords = ['centralize', 'remove', 'restrict', 'exclusive'];
    for (const keyword of controversialKeywords) {
      if (titleLower.includes(keyword)) {
        vetoScore += 0.15;
      }
    }

    // Constitutional changes
    const multiStage = proposal as unknown as MultiStageProposal;
    if (multiStage.proposalCategory === 'constitutional') {
      vetoScore += 0.2;
    }

    return vetoScore > 0.4;
  }

  /**
   * Cast a veto vote
   */
  private castVetoVote(proposal: Proposal): void {
    // Veto = vote against in veto window
    proposal.addVote(this.uniqueId, false, 1);
    this.votes.set(proposal.uniqueId, { vote: false, weight: 1 });

    if (this.citizensHouse) {
      this.citizensHouse.vote(this.uniqueId, proposal.uniqueId, false);
    }

    this.vetoVotesCast++;
    this.markActive();

    if (this.model.eventBus) {
      this.model.eventBus.publish('citizen_veto_vote', {
        step: this.model.currentStep,
        citizenId: this.uniqueId,
        proposalId: proposal.uniqueId,
      });
    }
  }

  /**
   * Allocate funds in RetroPGF round
   */
  allocateRetroPGF(projects: Array<{ id: string; name: string }>, totalBudget: number): RetroPGFAllocation[] {
    const allocations: RetroPGFAllocation[] = [];

    // Citizen decides how to split their allocation
    let remaining = totalBudget;

    // Sort projects by preference
    const scoredProjects = projects.map(p => ({
      ...p,
      score: this.scoreProjectForRetroPGF(p.name),
    })).sort((a, b) => b.score - a.score);

    // Allocate to top projects
    const topN = Math.min(5, scoredProjects.length);
    for (let i = 0; i < topN && remaining > 0; i++) {
      const project = scoredProjects[i];
      const allocationPercent = 0.3 - i * 0.05;  // Decreasing amounts
      const amount = Math.min(remaining, totalBudget * allocationPercent);

      if (amount > 0) {
        const allocation: RetroPGFAllocation = {
          projectId: project.id,
          amount,
          reason: `Supports ${this.preferredCategories[0] || 'community'} goals`,
        };
        allocations.push(allocation);
        remaining -= amount;
      }
    }

    this.retroPGFAllocations.push(...allocations);
    return allocations;
  }

  /**
   * Score a project for RetroPGF allocation
   */
  private scoreProjectForRetroPGF(projectName: string): number {
    let score = random() * 0.3;  // Base randomness

    const nameLower = projectName.toLowerCase();

    // Preferred categories
    for (const category of this.preferredCategories) {
      if (nameLower.includes(category)) {
        score += 0.25;
      }
    }

    // Public goods boost
    if (this.publicGoodsInterest > 0.7) {
      const pgKeywords = ['public', 'open', 'free', 'commons'];
      for (const kw of pgKeywords) {
        if (nameLower.includes(kw)) {
          score += 0.15;
        }
      }
    }

    return Math.min(1, score);
  }

  /**
   * Get citizen statistics
   */
  getCitizenStats(): {
    badge: string;
    citizenSince: number;
    vetoVotes: number;
    proposalsVoted: number;
    retroPGFAllocations: number;
    totalRetroPGFAllocated: number;
    preferredCategories: string[];
  } {
    const totalAllocated = this.retroPGFAllocations.reduce((sum, a) => sum + a.amount, 0);

    return {
      badge: this.citizenshipBadge,
      citizenSince: this.badgeGrantedStep,
      vetoVotes: this.vetoVotesCast,
      proposalsVoted: this.citizenProposalsVoted,
      retroPGFAllocations: this.retroPGFAllocations.length,
      totalRetroPGFAllocated: totalAllocated,
      preferredCategories: this.preferredCategories,
    };
  }
}
