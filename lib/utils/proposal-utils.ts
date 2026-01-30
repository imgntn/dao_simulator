// Proposal utility functions
// Port from utils/proposal_utils.py

import { Proposal } from '../data-structures/proposal';
import { MultiStageProposal, type StageConfig } from '../data-structures/multi-stage-proposal';
import type { DAO } from '../data-structures/dao';
import type { DAOMember } from '../agents/base';
import { randomFloat, randomInt } from './random';

/**
 * Create a random proposal for testing/simulation purposes
 */
export function createRandomProposal(
  dao: DAO,
  creator?: DAOMember,
  titlePrefix: string = 'Proposal',
  topic: string = 'Default Topic',
  project?: any,
  durationOverride?: number
): Proposal {
  const proposalId = dao.proposals.length;
  const title = `${titlePrefix} ${proposalId}`;
  const description = `This is the description for ${title}.`;
  const treasuryFunds = Math.max(dao.treasury?.funds || 0, 1000);
  const fundingRatio = randomFloat(0.005, 0.05); // 0.5% - 5% of treasury
  const fundingRequired = Math.round(treasuryFunds * fundingRatio * 100) / 100;
  const duration = durationOverride && durationOverride > 0
    ? durationOverride
    : randomInt(1, 13);

  const tempFraction = dao.proposalPolicy?.tempCheckFraction ?? 0.25;
  const tempDuration = Math.max(1, Math.round(duration * tempFraction));
  const onChainDuration = Math.max(1, duration - tempDuration);

  const stageConfigs: StageConfig[] = duration >= 2
    ? [
        { stage: 'temp_check', durationSteps: tempDuration, platform: 'snapshot' },
        { stage: 'on_chain', durationSteps: onChainDuration, platform: 'on_chain' },
      ]
    : [{ stage: 'on_chain', durationSteps: duration, platform: 'on_chain' }];

  return new MultiStageProposal(
    dao,
    creator?.uniqueId || '',
    title,
    description,
    fundingRequired,
    duration,
    topic,
    project || null,
    stageConfigs
  );
}

/**
 * Submit a random proposal on behalf of a creator
 */
export function submitRandomProposal(dao: DAO, creator: DAOMember): Proposal {
  const proposal = createRandomProposal(dao, creator);
  dao.addProposal(proposal);
  return proposal;
}

/**
 * Calculate proposal approval rate
 */
export function getApprovalRate(proposal: Proposal): number {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  if (totalVotes === 0) {
    return 0;
  }
  return proposal.votesFor / totalVotes;
}

/**
 * Check if proposal has quorum
 */
export function hasQuorum(
  proposal: Proposal,
  dao: DAO,
  quorumPercentage: number = 0.5
): boolean {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const totalMembers = dao.members.length;
  const participationRate = totalVotes / Math.max(totalMembers, 1);
  return participationRate >= quorumPercentage;
}

/**
 * Get proposals by status
 */
export function getProposalsByStatus(
  dao: DAO,
  status: string
): Proposal[] {
  return dao.proposals.filter((p) => p.status === status);
}

/**
 * Get active proposals (pending status)
 */
export function getActiveProposals(dao: DAO): Proposal[] {
  return getProposalsByStatus(dao, 'pending');
}

/**
 * Get approved proposals
 */
export function getApprovedProposals(dao: DAO): Proposal[] {
  return getProposalsByStatus(dao, 'approved');
}

/**
 * Get rejected proposals
 */
export function getRejectedProposals(dao: DAO): Proposal[] {
  return getProposalsByStatus(dao, 'rejected');
}

/**
 * Calculate average proposal duration
 */
export function getAverageProposalDuration(dao: DAO): number {
  if (dao.proposals.length === 0) {
    return 0;
  }
  const totalDuration = dao.proposals.reduce((sum, p) => sum + p.duration, 0);
  return totalDuration / dao.proposals.length;
}

/**
 * Calculate average funding requested
 */
export function getAverageFundingRequested(dao: DAO): number {
  if (dao.proposals.length === 0) {
    return 0;
  }
  const totalFunding = dao.proposals.reduce(
    (sum, p) => sum + (p.fundingGoal || 0),
    0
  );
  return totalFunding / dao.proposals.length;
}

/**
 * Get proposals by topic
 */
export function getProposalsByTopic(dao: DAO, topic: string): Proposal[] {
  return dao.proposals.filter((p) => p.topic === topic);
}

/**
 * Get proposals by creator
 */
export function getProposalsByCreator(
  dao: DAO,
  creatorId: string
): Proposal[] {
  return dao.proposals.filter((p) => p.creator === creatorId);
}

/**
 * Calculate proposal success rate for a creator
 */
export function getCreatorSuccessRate(dao: DAO, creatorId: string): number {
  const creatorProposals = getProposalsByCreator(dao, creatorId);
  if (creatorProposals.length === 0) {
    return 0;
  }
  const approvedCount = creatorProposals.filter(
    (p) => p.status === 'approved'
  ).length;
  return approvedCount / creatorProposals.length;
}

/**
 * Get top proposal creators by number of proposals
 */
export function getTopCreators(dao: DAO, limit: number = 10): Array<{
  creatorId: string;
  count: number;
  successRate: number;
}> {
  const creatorMap = new Map<string, number>();

  for (const proposal of dao.proposals) {
    if (proposal.creator) {
      creatorMap.set(
        proposal.creator,
        (creatorMap.get(proposal.creator) || 0) + 1
      );
    }
  }

  const creators = Array.from(creatorMap.entries())
    .map(([creatorId, count]) => ({
      creatorId,
      count,
      successRate: getCreatorSuccessRate(dao, creatorId),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return creators;
}

/**
 * Calculate total funding requested across all proposals
 */
export function getTotalFundingRequested(dao: DAO): number {
  return dao.proposals.reduce((sum, p) => sum + (p.fundingGoal || 0), 0);
}

/**
 * Calculate total funding approved
 */
export function getTotalFundingApproved(dao: DAO): number {
  return dao.proposals
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.fundingGoal || 0), 0);
}

/**
 * Get proposal statistics
 */
export function getProposalStatistics(dao: DAO): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  averageDuration: number;
  averageFunding: number;
  totalFundingRequested: number;
  totalFundingApproved: number;
} {
  const total = dao.proposals.length;
  const pending = getActiveProposals(dao).length;
  const approved = getApprovedProposals(dao).length;
  const rejected = getRejectedProposals(dao).length;
  const approvalRate = total > 0 ? approved / total : 0;

  return {
    total,
    pending,
    approved,
    rejected,
    approvalRate,
    averageDuration: getAverageProposalDuration(dao),
    averageFunding: getAverageFundingRequested(dao),
    totalFundingRequested: getTotalFundingRequested(dao),
    totalFundingApproved: getTotalFundingApproved(dao),
  };
}
