// Governance plugins - extensible governance rules
// Port from utils/governance_plugins.py

import type { Proposal } from '../data-structures/proposal';
import type { DAO } from '../data-structures/dao';

/**
 * Base class for governance approval rules
 */
export abstract class GovernanceRule {
  /**
   * Return true to approve the proposal
   */
  abstract approve(proposal: Proposal, dao: DAO): boolean;
}

/**
 * Registry for governance rules
 */
const ruleRegistry = new Map<string, new () => GovernanceRule>();

/**
 * Register a governance rule class under a given name
 */
export function registerRule(
  name: string,
  ruleClass: new () => GovernanceRule
): void {
  ruleRegistry.set(name.toLowerCase(), ruleClass);
}

/**
 * Get a governance rule by name
 */
export function getRule(name: string): GovernanceRule | null {
  const RuleClass = ruleRegistry.get(name.toLowerCase());
  if (RuleClass) {
    return new RuleClass();
  }
  return null;
}

/**
 * Get all registered rule names
 */
export function listRules(): string[] {
  return Array.from(ruleRegistry.keys());
}

/**
 * Simple majority rule - approve if votes_for > votes_against
 */
export class MajorityRule extends GovernanceRule {
  approve(proposal: Proposal, _dao: DAO): boolean {
    return proposal.votesFor > proposal.votesAgainst;
  }
}

/**
 * Quorum rule - require minimum participation percentage
 */
export class QuorumRule extends GovernanceRule {
  private quorumPercentage: number;

  constructor(quorumPercentage: number = 0.5) {
    super();
    this.quorumPercentage = quorumPercentage;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const totalMembers = dao.members.length;
    const participationRate = totalVotes / Math.max(totalMembers, 1);

    // Must meet quorum AND have majority support
    return (
      participationRate >= this.quorumPercentage &&
      proposal.votesFor > proposal.votesAgainst
    );
  }
}

/**
 * Supermajority rule - require higher threshold than simple majority
 */
export class SupermajorityRule extends GovernanceRule {
  private threshold: number;

  constructor(threshold: number = 0.66) {
    super();
    this.threshold = threshold;
  }

  approve(proposal: Proposal, _dao: DAO): boolean {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0) {
      return false;
    }

    const approvalRate = proposal.votesFor / totalVotes;
    return approvalRate >= this.threshold;
  }
}

/**
 * Token-weighted quorum rule - require minimum token participation
 */
export class TokenQuorumRule extends GovernanceRule {
  private quorumPercentage: number;

  constructor(quorumPercentage: number = 0.5) {
    super();
    this.quorumPercentage = quorumPercentage;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Calculate total tokens in circulation
    const totalTokens = dao.members.reduce(
      (sum, member) => sum + member.tokens,
      0
    );

    // Calculate tokens that participated in voting
    const votingTokens = proposal.votesFor + proposal.votesAgainst;
    const participationRate = votingTokens / Math.max(totalTokens, 1);

    // Must meet token quorum AND have majority support
    return (
      participationRate >= this.quorumPercentage &&
      proposal.votesFor > proposal.votesAgainst
    );
  }
}

/**
 * Time-decay rule - proposals get easier to pass over time
 */
export class TimeDecayRule extends GovernanceRule {
  private initialThreshold: number;
  private finalThreshold: number;
  private decaySteps: number;

  constructor(
    initialThreshold: number = 0.66,
    finalThreshold: number = 0.5,
    decaySteps: number = 100
  ) {
    super();
    this.initialThreshold = initialThreshold;
    this.finalThreshold = finalThreshold;
    this.decaySteps = decaySteps;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0) {
      return false;
    }

    // Calculate current threshold based on proposal age
    const age = dao.currentStep - proposal.creationTime;
    const decayProgress = Math.min(1, age / this.decaySteps);
    const currentThreshold =
      this.initialThreshold -
      (this.initialThreshold - this.finalThreshold) * decayProgress;

    const approvalRate = proposal.votesFor / totalVotes;
    return approvalRate >= currentThreshold;
  }
}

/**
 * Reputation-weighted quorum rule
 */
export class ReputationQuorumRule extends GovernanceRule {
  private quorumPercentage: number;

  constructor(quorumPercentage: number = 0.5) {
    super();
    this.quorumPercentage = quorumPercentage;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Calculate total reputation in DAO
    const totalReputation = dao.members.reduce(
      (sum, member) => sum + member.reputation,
      0
    );

    // For this to work, we'd need to track reputation-weighted votes
    // This is a simplified version that uses token-weighted votes as proxy
    const votingPower = proposal.votesFor + proposal.votesAgainst;
    const participationRate = votingPower / Math.max(totalReputation, 1);

    return (
      participationRate >= this.quorumPercentage &&
      proposal.votesFor > proposal.votesAgainst
    );
  }
}

/**
 * Conviction voting rule - votes accumulate strength over time
 */
export class ConvictionVotingRule extends GovernanceRule {
  private convictionThreshold: number;
  private halfLife: number;

  constructor(convictionThreshold: number = 1000, halfLife: number = 10) {
    super();
    this.convictionThreshold = convictionThreshold;
    this.halfLife = halfLife;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Calculate conviction (simplified - would need to track individual vote times)
    const age = dao.currentStep - proposal.creationTime;
    const conviction = proposal.votesFor * Math.log(age + 1) * this.halfLife;

    return conviction >= this.convictionThreshold;
  }
}

// Register default rules
registerRule('majority', MajorityRule);
registerRule('quorum', QuorumRule);
registerRule('supermajority', SupermajorityRule);
registerRule('tokenquorum', TokenQuorumRule);
registerRule('timedecay', TimeDecayRule);
registerRule('reputationquorum', ReputationQuorumRule);
registerRule('conviction', ConvictionVotingRule);
