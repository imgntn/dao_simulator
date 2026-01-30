// InterDAOProposal - Joint proposals between multiple DAOs

import { EventBus } from '../utils/event-bus';
import type {
  InterDAOProposalType,
  InterDAOProposalData,
  DAOVoteResult,
} from '../types/dao-city';

/**
 * InterDAOProposal represents a proposal that requires approval from multiple DAOs.
 * Types include:
 * - collaboration: Joint projects or initiatives
 * - treaty: Formal agreements between DAOs
 * - resource_sharing: Sharing treasury or resources
 * - joint_venture: Creating new shared entities
 */
export class InterDAOProposal implements InterDAOProposalData {
  uniqueId: string;
  title: string;
  description: string;
  proposalType: InterDAOProposalType;
  creatorDaoId: string;
  creatorMemberId: string;
  participatingDaos: string[];
  votingResults: Record<string, DAOVoteResult>;
  requiredApprovalCount: number;
  creationStep: number;
  votingPeriod: number;
  status: 'open' | 'approved' | 'rejected' | 'executed';

  // Optional proposal-specific data
  sharedBudget?: number;
  contributionRatios?: Record<string, number>;
  resourceType?: string;
  resourceAmount?: number;

  private eventBus: EventBus | null;
  private votersByDao: Map<string, Set<string>> = new Map();
  private consideredByDao: Map<string, Set<string>> = new Map();
  private remindedByDao: Map<string, Set<string>> = new Map();

  constructor(
    uniqueId: string,
    title: string,
    description: string,
    proposalType: InterDAOProposalType,
    creatorDaoId: string,
    creatorMemberId: string,
    participatingDaos: string[],
    creationStep: number,
    votingPeriod: number = 100,
    eventBus?: EventBus
  ) {
    this.uniqueId = uniqueId;
    this.title = title;
    this.description = description;
    this.proposalType = proposalType;
    this.creatorDaoId = creatorDaoId;
    this.creatorMemberId = creatorMemberId;
    this.participatingDaos = participatingDaos;
    this.creationStep = creationStep;
    this.votingPeriod = votingPeriod;
    this.status = 'open';
    this.eventBus = eventBus || null;

    // Default: all participating DAOs must approve
    this.requiredApprovalCount = participatingDaos.length;

    // Initialize voting results for each participating DAO
    this.votingResults = {};
    for (const daoId of participatingDaos) {
      this.votingResults[daoId] = {
        daoId,
        votesFor: 0,
        votesAgainst: 0,
        totalEligibleVoters: 0,
        quorumMet: false,
        approved: null, // Pending
      };
      this.votersByDao.set(daoId, new Set());
      this.consideredByDao.set(daoId, new Set());
      this.remindedByDao.set(daoId, new Set());
    }
  }

  /**
   * Check if a member has already voted on this proposal for a given DAO
   */
  hasVoted(daoId: string, memberId: string): boolean {
    const voters = this.votersByDao.get(daoId);
    return voters ? voters.has(memberId) : false;
  }

  /**
   * Check if a member has already considered voting on this proposal
   */
  hasConsidered(daoId: string, memberId: string): boolean {
    const considered = this.consideredByDao.get(daoId);
    return considered ? considered.has(memberId) : false;
  }

  /**
   * Check if a member has already received a reminder chance
   */
  hasReminded(daoId: string, memberId: string): boolean {
    const reminded = this.remindedByDao.get(daoId);
    return reminded ? reminded.has(memberId) : false;
  }

  /**
   * Mark a member as having considered this proposal
   */
  markConsidered(daoId: string, memberId: string): void {
    const considered = this.consideredByDao.get(daoId);
    if (considered) {
      considered.add(memberId);
    }
  }

  /**
   * Mark a member as having received a reminder chance
   */
  markReminded(daoId: string, memberId: string): void {
    const reminded = this.remindedByDao.get(daoId);
    if (reminded) {
      reminded.add(memberId);
    }
  }

  /**
   * Record a vote from a member of a participating DAO
   */
  vote(
    daoId: string,
    memberId: string,
    inFavor: boolean,
    weight: number = 1,
    step: number
  ): boolean {
    if (this.status !== 'open') {
      return false;
    }

    // Check if DAO is participating
    const daoResult = this.votingResults[daoId];
    if (!daoResult) {
      return false;
    }

    const voters = this.votersByDao.get(daoId);
    if (!voters || voters.has(memberId)) {
      return false;
    }

    // Record vote
    if (inFavor) {
      daoResult.votesFor += weight;
    } else {
      daoResult.votesAgainst += weight;
    }

    voters.add(memberId);
    this.markConsidered(daoId, memberId);

    if (this.eventBus) {
      this.eventBus.publish('inter_dao_vote', {
        step,
        proposalId: this.uniqueId,
        daoId,
        memberId,
        inFavor,
        weight,
      });
    }

    return true;
  }

  /**
   * Update the total eligible voters for a DAO
   */
  setEligibleVoters(daoId: string, count: number): void {
    const daoResult = this.votingResults[daoId];
    if (daoResult) {
      daoResult.totalEligibleVoters = count;
    }
  }

  /**
   * Check if voting period has ended
   */
  isVotingEnded(currentStep: number): boolean {
    return currentStep >= this.creationStep + this.votingPeriod;
  }

  /**
   * Finalize voting for a specific DAO
   * Called when DAO completes its internal voting process
   */
  finalizeDAOVote(
    daoId: string,
    quorumThreshold: number = 0.5,
    approvalThreshold: number = 0.5
  ): void {
    const daoResult = this.votingResults[daoId];
    if (!daoResult || daoResult.approved !== null) {
      return; // Already finalized or invalid
    }

    const totalVotes = daoResult.votesFor + daoResult.votesAgainst;
    const eligibleVoters = daoResult.totalEligibleVoters || 1;

    // Check quorum (minimum participation)
    daoResult.quorumMet = totalVotes / eligibleVoters >= quorumThreshold;

    if (!daoResult.quorumMet) {
      daoResult.approved = false; // Failed due to insufficient participation
      return;
    }

    // Check approval threshold
    const approvalRatio = totalVotes > 0 ? daoResult.votesFor / totalVotes : 0;
    daoResult.approved = approvalRatio >= approvalThreshold;
  }

  /**
   * Finalize the entire inter-DAO proposal
   * Called after all DAOs have finished voting
   */
  finalize(step: number): void {
    if (this.status !== 'open') {
      return;
    }

    // Count approved DAOs
    let approvedCount = 0;
    let allFinalized = true;

    for (const daoResult of Object.values(this.votingResults)) {
      if (daoResult.approved === null) {
        allFinalized = false;
      } else if (daoResult.approved) {
        approvedCount++;
      }
    }

    // Cannot finalize if not all DAOs have voted
    if (!allFinalized) {
      return;
    }

    // Check if enough DAOs approved
    if (approvedCount >= this.requiredApprovalCount) {
      this.status = 'approved';
    } else {
      this.status = 'rejected';
    }

    if (this.eventBus) {
      this.eventBus.publish('inter_dao_proposal_finalized', {
        step,
        proposalId: this.uniqueId,
        status: this.status,
        approvedCount,
        requiredCount: this.requiredApprovalCount,
      });
    }
  }

  /**
   * Execute the proposal if approved
   */
  execute(step: number): boolean {
    if (this.status !== 'approved') {
      return false;
    }

    this.status = 'executed';

    if (this.eventBus) {
      this.eventBus.publish('inter_dao_proposal_executed', {
        step,
        proposalId: this.uniqueId,
        proposalType: this.proposalType,
        participatingDaos: this.participatingDaos,
      });
    }

    return true;
  }

  /**
   * Get voting summary for display
   */
  getVotingSummary(): {
    totalVotesFor: number;
    totalVotesAgainst: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    isApproved: boolean;
    isRejected: boolean;
    isPending: boolean;
  } {
    let totalFor = 0;
    let totalAgainst = 0;
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    for (const result of Object.values(this.votingResults)) {
      totalFor += result.votesFor;
      totalAgainst += result.votesAgainst;

      if (result.approved === null) {
        pending++;
      } else if (result.approved) {
        approved++;
      } else {
        rejected++;
      }
    }

    return {
      totalVotesFor: totalFor,
      totalVotesAgainst: totalAgainst,
      approvedCount: approved,
      pendingCount: pending,
      rejectedCount: rejected,
      isApproved: this.status === 'approved',
      isRejected: this.status === 'rejected',
      isPending: this.status === 'open',
    };
  }

  /**
   * Get full state for broadcasting
   */
  getState(): InterDAOProposalData {
    return {
      uniqueId: this.uniqueId,
      title: this.title,
      description: this.description,
      proposalType: this.proposalType,
      creatorDaoId: this.creatorDaoId,
      creatorMemberId: this.creatorMemberId,
      participatingDaos: [...this.participatingDaos],
      votingResults: { ...this.votingResults },
      requiredApprovalCount: this.requiredApprovalCount,
      creationStep: this.creationStep,
      votingPeriod: this.votingPeriod,
      status: this.status,
      sharedBudget: this.sharedBudget,
      contributionRatios: this.contributionRatios
        ? { ...this.contributionRatios }
        : undefined,
      resourceType: this.resourceType,
      resourceAmount: this.resourceAmount,
    };
  }

  /**
   * Create a collaboration proposal
   */
  static createCollaboration(
    uniqueId: string,
    title: string,
    description: string,
    creatorDaoId: string,
    creatorMemberId: string,
    participatingDaos: string[],
    creationStep: number,
    sharedBudget: number,
    contributionRatios: Record<string, number>,
    eventBus?: EventBus
  ): InterDAOProposal {
    const proposal = new InterDAOProposal(
      uniqueId,
      title,
      description,
      'collaboration',
      creatorDaoId,
      creatorMemberId,
      participatingDaos,
      creationStep,
      100,
      eventBus
    );
    proposal.sharedBudget = sharedBudget;
    proposal.contributionRatios = contributionRatios;
    return proposal;
  }

  /**
   * Create a treaty proposal
   */
  static createTreaty(
    uniqueId: string,
    title: string,
    description: string,
    creatorDaoId: string,
    creatorMemberId: string,
    participatingDaos: string[],
    creationStep: number,
    eventBus?: EventBus
  ): InterDAOProposal {
    return new InterDAOProposal(
      uniqueId,
      title,
      description,
      'treaty',
      creatorDaoId,
      creatorMemberId,
      participatingDaos,
      creationStep,
      150, // Treaties get longer voting period
      eventBus
    );
  }

  /**
   * Create a resource sharing proposal
   */
  static createResourceSharing(
    uniqueId: string,
    title: string,
    description: string,
    creatorDaoId: string,
    creatorMemberId: string,
    participatingDaos: string[],
    creationStep: number,
    resourceType: string,
    resourceAmount: number,
    eventBus?: EventBus
  ): InterDAOProposal {
    const proposal = new InterDAOProposal(
      uniqueId,
      title,
      description,
      'resource_sharing',
      creatorDaoId,
      creatorMemberId,
      participatingDaos,
      creationStep,
      100,
      eventBus
    );
    proposal.resourceType = resourceType;
    proposal.resourceAmount = resourceAmount;
    return proposal;
  }

  /**
   * Create a joint venture proposal
   */
  static createJointVenture(
    uniqueId: string,
    title: string,
    description: string,
    creatorDaoId: string,
    creatorMemberId: string,
    participatingDaos: string[],
    creationStep: number,
    sharedBudget: number,
    contributionRatios: Record<string, number>,
    eventBus?: EventBus
  ): InterDAOProposal {
    const proposal = new InterDAOProposal(
      uniqueId,
      title,
      description,
      'joint_venture',
      creatorDaoId,
      creatorMemberId,
      participatingDaos,
      creationStep,
      200, // Joint ventures get longest voting period
      eventBus
    );
    proposal.sharedBudget = sharedBudget;
    proposal.contributionRatios = contributionRatios;
    return proposal;
  }
}
