// Governance plugins - extensible governance rules
// Port from utils/governance_plugins.py
// Extended with digital twin governance patterns

import type { Proposal } from '../data-structures/proposal';
import type { DAO } from '../data-structures/dao';
import type { MultiStageProposal, HouseType } from '../data-structures/multi-stage-proposal';
import type { GovernanceHouse, BicameralGovernance } from '../data-structures/governance-house';

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
 * Configuration for governance rules
 */
export interface GovernanceRuleConfig {
  quorumPercentage?: number;      // For quorum-based rules (0-1)
  threshold?: number;             // For supermajority (0-1)
  convictionThreshold?: number;   // For conviction voting
  convictionHalfLife?: number;    // For conviction voting decay
}

/**
 * Registry for governance rules
 */
const ruleRegistry = new Map<string, new (config?: GovernanceRuleConfig) => GovernanceRule>();

/**
 * Register a governance rule class under a given name
 */
export function registerRule(
  name: string,
  ruleClass: new (config?: GovernanceRuleConfig) => GovernanceRule
): void {
  ruleRegistry.set(name.toLowerCase(), ruleClass);
}

/**
 * Get a governance rule by name with optional configuration
 */
export function getRule(name: string, config?: GovernanceRuleConfig): GovernanceRule | null {
  const RuleClass = ruleRegistry.get(name.toLowerCase());
  if (RuleClass) {
    return new RuleClass(config);
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
  constructor(_config?: GovernanceRuleConfig) {
    super();
  }

  approve(proposal: Proposal): boolean {
    return proposal.votesFor > proposal.votesAgainst;
  }
}

/**
 * Quorum rule - require minimum participation percentage
 * Now properly accepts quorum percentage from configuration
 */
export class QuorumRule extends GovernanceRule {
  private quorumPercentage: number;

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Use configured quorum or default to 4% (realistic for DAOs)
    this.quorumPercentage = config?.quorumPercentage ?? 0.04;
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.threshold = config?.threshold ?? 0.66;
  }

  approve(proposal: Proposal): boolean {
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Use configured quorum or default to 4%
    this.quorumPercentage = config?.quorumPercentage ?? 0.04;
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Default: starts at 66% threshold, decays to 50% over 100 steps
    this.initialThreshold = config?.threshold ?? 0.66;
    this.finalThreshold = 0.5;
    this.decaySteps = 100;
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Default: 50% reputation participation required
    this.quorumPercentage = config?.quorumPercentage ?? 0.5;
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
 *
 * Conviction grows exponentially toward a maximum based on support:
 *   c(t) = support * (1 - decay^t) / (1 - decay)
 *
 * Where decay = 0.5^(1/halfLife), so conviction reaches 50% of max after halfLife steps.
 *
 * The threshold is calculated as a percentage of total voting power to make it
 * scale-independent and actually achievable.
 */
export class ConvictionVotingRule extends GovernanceRule {
  private thresholdPercent: number;  // Percent of total tokens needed as conviction
  private halfLife: number;  // Steps for conviction to reach 50% of max

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Default: need conviction equivalent to 10% of total tokens
    this.thresholdPercent = config?.convictionThreshold ?? 0.10;
    // Default: conviction reaches 50% of max after 30 steps
    this.halfLife = config?.convictionHalfLife ?? 30;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const age = dao.currentStep - proposal.creationTime;

    // No conviction if just created
    if (age <= 0) {
      return false;
    }

    // Calculate decay rate per step (approaches 0.5 after halfLife steps)
    const decayRate = Math.pow(0.5, 1 / this.halfLife);

    // Current support (votes for the proposal)
    const support = proposal.votesFor;

    // Calculate conviction using exponential accumulation formula
    // c(t) = support * (1 - decay^t) / (1 - decay)
    // This converges to support/(1-decay) as t → ∞
    const maxConviction = support / (1 - decayRate);
    const currentConviction = maxConviction * (1 - Math.pow(decayRate, age));

    // Calculate threshold based on total voting power
    const totalTokens = dao.members.reduce(
      (sum, member) => sum + member.tokens,
      0
    );
    const threshold = totalTokens * this.thresholdPercent;

    return currentConviction >= threshold;
  }
}

/**
 * Quadratic voting rule - voting power is sqrt(tokens)
 * This reduces the influence of large token holders and gives
 * smaller holders more relative voice in governance decisions.
 */
export class QuadraticVotingRule extends GovernanceRule {
  private quorumPercentage: number;

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Use 4% quorum to match other governance systems (was 10%, too high)
    this.quorumPercentage = config?.quorumPercentage ?? 0.04;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Access the votes map to calculate quadratic voting power
    const votesMap = (proposal as any).votes as Map<string, { vote: boolean; weight: number }>;

    if (!votesMap || votesMap.size === 0) {
      return false;
    }

    // Calculate quadratic votes (sqrt of each voter's weight)
    let quadraticVotesFor = 0;
    let quadraticVotesAgainst = 0;

    for (const [, voteData] of votesMap) {
      const quadraticWeight = Math.sqrt(voteData.weight);
      if (voteData.vote) {
        quadraticVotesFor += quadraticWeight;
      } else {
        quadraticVotesAgainst += quadraticWeight;
      }
    }

    // Calculate total quadratic voting power in the DAO
    const totalQuadraticPower = dao.members.reduce(
      (sum, member) => sum + Math.sqrt(member.tokens),
      0
    );

    // Check quorum (based on quadratic participation)
    const totalQuadraticVotes = quadraticVotesFor + quadraticVotesAgainst;
    const participationRate = totalQuadraticPower > 0
      ? totalQuadraticVotes / totalQuadraticPower
      : 0;

    // Must meet quorum AND have majority support (in quadratic terms)
    return (
      participationRate >= this.quorumPercentage &&
      quadraticVotesFor > quadraticVotesAgainst
    );
  }
}

// =============================================================================
// DIGITAL TWIN GOVERNANCE RULES
// =============================================================================

/**
 * Category-based quorum rule (Arbitrum-style)
 * Different quorum thresholds for constitutional vs non-constitutional proposals
 */
export class CategoryQuorumRule extends GovernanceRule {
  private constitutionalQuorum: number;
  private nonConstitutionalQuorum: number;
  private approvalThreshold: number;

  constructor(
    constitutionalQuorum: number = 0.05,  // 5%
    nonConstitutionalQuorum: number = 0.03,  // 3%
    approvalThreshold: number = 0.51  // 51%
  ) {
    super();
    this.constitutionalQuorum = constitutionalQuorum;
    this.nonConstitutionalQuorum = nonConstitutionalQuorum;
    this.approvalThreshold = approvalThreshold;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const multiStage = proposal as unknown as MultiStageProposal;
    const category = multiStage.proposalCategory || 'standard';

    // Calculate total voting power
    const totalTokens = dao.members.reduce(
      (sum, member) => sum + member.tokens + member.stakedTokens,
      0
    );

    // Select quorum based on category
    let requiredQuorum: number;
    if (category === 'constitutional') {
      requiredQuorum = this.constitutionalQuorum;
    } else if (category === 'non_constitutional') {
      requiredQuorum = this.nonConstitutionalQuorum;
    } else {
      requiredQuorum = this.nonConstitutionalQuorum;  // Default to lower
    }

    const quorumVotes = totalTokens * requiredQuorum;
    const quorumMet = proposal.votesFor >= quorumVotes;

    // Check approval threshold
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const approvalRate = totalVotes > 0 ? proposal.votesFor / totalVotes : 0;

    return quorumMet && approvalRate >= this.approvalThreshold;
  }
}

/**
 * Bicameral voting rule (Optimism-style)
 * Requires approval from Token House; Citizens House has veto power
 */
export class BicameralRule extends GovernanceRule {
  private bicameralSystem: BicameralGovernance | null;
  private tokenHouseQuorum: number;
  private tokenHouseApproval: number;
  private citizensHouseVetoEnabled: boolean;

  constructor(
    bicameralSystem: BicameralGovernance | null = null,
    tokenHouseQuorum: number = 0.30,  // 30%
    tokenHouseApproval: number = 0.51,  // 51%
    citizensHouseVetoEnabled: boolean = true
  ) {
    super();
    this.bicameralSystem = bicameralSystem;
    this.tokenHouseQuorum = tokenHouseQuorum;
    this.tokenHouseApproval = tokenHouseApproval;
    this.citizensHouseVetoEnabled = citizensHouseVetoEnabled;
  }

  setBicameralSystem(system: BicameralGovernance): void {
    this.bicameralSystem = system;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const multiStage = proposal as unknown as MultiStageProposal;

    // If no bicameral system, fall back to standard voting
    if (!this.bicameralSystem) {
      const totalVotes = proposal.votesFor + proposal.votesAgainst;
      return totalVotes > 0 && proposal.votesFor > proposal.votesAgainst;
    }

    // Check Token House approval
    const tokenHouse = this.bicameralSystem.getHouse('token_house');
    if (tokenHouse) {
      const tokenResult = tokenHouse.getVoteResult(proposal.uniqueId);
      if (!tokenResult.approved) {
        return false;
      }
    }

    // Check for Citizens House veto (if enabled)
    if (this.citizensHouseVetoEnabled) {
      const citizensHouse = this.bicameralSystem.getHouse('citizens_house');
      if (citizensHouse && citizensHouse.canVeto) {
        if (citizensHouse.checkVetoCondition(proposal.uniqueId)) {
          return false;  // Vetoed
        }
      }
    }

    return true;
  }
}

/**
 * Dual governance rule (Lido-style)
 * Allows stakers to veto proposals with dynamic timelock extension
 */
export class DualGovernanceRule extends GovernanceRule {
  private vetoThresholdPercent: number;
  private rageQuitThresholdPercent: number;
  private minTimelockSteps: number;
  private maxTimelockSteps: number;

  constructor(
    vetoThresholdPercent: number = 1,  // 1% stETH supply
    rageQuitThresholdPercent: number = 10,  // 10% triggers rage quit
    minTimelockSteps: number = 120,  // 5 days
    maxTimelockSteps: number = 1080  // 45 days
  ) {
    super();
    this.vetoThresholdPercent = vetoThresholdPercent;
    this.rageQuitThresholdPercent = rageQuitThresholdPercent;
    this.minTimelockSteps = minTimelockSteps;
    this.maxTimelockSteps = maxTimelockSteps;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const multiStage = proposal as unknown as MultiStageProposal;

    // Basic voting must pass first
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0 || proposal.votesFor <= proposal.votesAgainst) {
      return false;
    }

    // Calculate total staked supply
    const totalStakedSupply = dao.members.reduce(
      (sum, member) => sum + member.stakedTokens,
      0
    );

    if (totalStakedSupply <= 0) {
      return true;  // No stakers to veto
    }

    // Check veto signal percentage
    const vetoSignal = multiStage.totalVetoSignal || 0;
    const vetoSignalPercent = (vetoSignal / totalStakedSupply) * 100;

    // Rage quit threshold reached = proposal fails
    if (vetoSignalPercent >= this.rageQuitThresholdPercent) {
      return false;
    }

    // If veto threshold reached, proposal still passes but with extended timelock
    // (timelock extension is handled by the state machine, not here)
    return true;
  }

  /**
   * Calculate dynamic timelock based on veto signal
   */
  calculateDynamicTimelock(vetoSignalPercent: number): number {
    if (vetoSignalPercent <= 0) {
      return this.minTimelockSteps;
    }

    const range = this.maxTimelockSteps - this.minTimelockSteps;
    const factor = Math.min(vetoSignalPercent / this.vetoThresholdPercent, 1);

    return Math.round(this.minTimelockSteps + range * factor);
  }
}

/**
 * Approval voting rule (MakerDAO-style)
 * Continuous approval voting for executive proposals
 * Proposal passes when it has most approval among competing proposals
 */
export class ApprovalVotingRule extends GovernanceRule {
  private competingProposals: Map<string, number> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a competing proposal
   */
  registerCompetingProposal(proposalId: string, approvalVotes: number): void {
    this.competingProposals.set(proposalId, approvalVotes);
  }

  /**
   * Clear competing proposals (new voting round)
   */
  clearCompetingProposals(): void {
    this.competingProposals.clear();
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Register this proposal's votes
    this.competingProposals.set(proposal.uniqueId, proposal.votesFor);

    // Find the proposal with highest approval
    let maxVotes = 0;
    let leadingProposalId = '';

    for (const [id, votes] of this.competingProposals.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        leadingProposalId = id;
      }
    }

    // This proposal is approved if it's leading
    return proposal.uniqueId === leadingProposalId && maxVotes > 0;
  }
}

/**
 * Security council rule (Arbitrum/Optimism-style)
 * Allows fast-track execution for security emergencies
 */
export class SecurityCouncilRule extends GovernanceRule {
  private councilMembers: Set<string>;
  private approvalThreshold: number;  // e.g., 9 of 12

  constructor(
    councilMembers: string[] = [],
    approvalThreshold: number = 0.75  // 75% = 9 of 12
  ) {
    super();
    this.councilMembers = new Set(councilMembers);
    this.approvalThreshold = approvalThreshold;
  }

  addCouncilMember(memberId: string): void {
    this.councilMembers.add(memberId);
  }

  removeCouncilMember(memberId: string): void {
    this.councilMembers.delete(memberId);
  }

  isCouncilMember(memberId: string): boolean {
    return this.councilMembers.has(memberId);
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // For security council decisions, we count individual member votes
    // Each council member gets 1 vote regardless of token holdings

    // In a full implementation, we'd track which council members voted
    // For now, use the votes as proxy (assume 1 vote = 1 council member)
    const councilSize = this.councilMembers.size;
    if (councilSize === 0) {
      return false;
    }

    const requiredVotes = Math.ceil(councilSize * this.approvalThreshold);

    // votes_for represents council members voting in favor
    return proposal.votesFor >= requiredVotes;
  }
}

/**
 * Optimistic approval rule
 * Proposal auto-passes unless vetoed within window
 */
export class OptimisticApprovalRule extends GovernanceRule {
  private vetoThreshold: number;  // Number of veto votes to block
  private vetoPeriodSteps: number;

  constructor(
    vetoThreshold: number = 100,
    vetoPeriodSteps: number = 168  // 7 days
  ) {
    super();
    this.vetoThreshold = vetoThreshold;
    this.vetoPeriodSteps = vetoPeriodSteps;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Check if veto period has passed
    const age = dao.currentStep - proposal.creationTime;

    if (age < this.vetoPeriodSteps) {
      // Still in veto period - check for vetoes
      return proposal.votesAgainst < this.vetoThreshold;
    }

    // Veto period passed - auto-approve if not vetoed
    return proposal.votesAgainst < this.vetoThreshold;
  }
}

/**
 * Holographic consensus rule (DAOstack-style)
 * Uses prediction markets to filter proposals
 */
export class HolographicConsensusRule extends GovernanceRule {
  private stakingThreshold: number;  // GEN tokens to boost
  private boostedQuorum: number;  // Lower quorum when boosted
  private normalQuorum: number;  // Higher quorum when not boosted

  constructor(
    stakingThreshold: number = 100,
    boostedQuorum: number = 0.01,  // 1% when boosted
    normalQuorum: number = 0.50  // 50% when not boosted
  ) {
    super();
    this.stakingThreshold = stakingThreshold;
    this.boostedQuorum = boostedQuorum;
    this.normalQuorum = normalQuorum;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Check if proposal is "boosted" (simplified - would need staking tracking)
    const isBoosted = proposal.currentFunding >= this.stakingThreshold;

    const totalTokens = dao.members.reduce(
      (sum, member) => sum + member.tokens,
      0
    );

    const requiredQuorum = isBoosted ? this.boostedQuorum : this.normalQuorum;
    const quorumVotes = totalTokens * requiredQuorum;

    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const quorumMet = totalVotes >= quorumVotes;

    // Relative majority for boosted, absolute majority for non-boosted
    if (isBoosted) {
      return quorumMet && proposal.votesFor > proposal.votesAgainst;
    } else {
      return quorumMet && proposal.votesFor > totalVotes / 2;
    }
  }
}

// =============================================================================
// RULE REGISTRATION
// =============================================================================

// Register default rules
registerRule('majority', MajorityRule);
registerRule('quorum', QuorumRule);
registerRule('supermajority', SupermajorityRule);
registerRule('tokenquorum', TokenQuorumRule);
registerRule('timedecay', TimeDecayRule);
registerRule('reputationquorum', ReputationQuorumRule);
registerRule('conviction', ConvictionVotingRule);
registerRule('quadratic', QuadraticVotingRule);

// Register digital twin rules
registerRule('categoryquorum', CategoryQuorumRule);
registerRule('bicameral', BicameralRule);
registerRule('dualgovernance', DualGovernanceRule);
registerRule('approvalvoting', ApprovalVotingRule);
registerRule('securitycouncil', SecurityCouncilRule);
registerRule('optimistic', OptimisticApprovalRule);
registerRule('holographic', HolographicConsensusRule);
