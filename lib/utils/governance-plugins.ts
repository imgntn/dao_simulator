// Governance plugins - extensible governance rules
// Port from utils/governance_plugins.py
// Extended with digital twin governance patterns

import type { Proposal } from '../data-structures/proposal';
import type { DAO } from '../data-structures/dao';
import type { MultiStageProposal, HouseType } from '../data-structures/multi-stage-proposal';
import type { GovernanceHouse, BicameralGovernance } from '../data-structures/governance-house';

/**
 * Calculate total token supply including delegated-out tokens.
 * When tokens are delegated, they leave member.tokens but still exist in the supply.
 */
function getTotalTokenSupply(dao: DAO): number {
  return dao.members.reduce(
    (sum, member) => {
      let delegatedOut = 0;
      for (const [, amount] of member.delegations) {
        delegatedOut += amount;
      }
      return sum + member.tokens + member.stakedTokens + delegatedOut;
    }, 0
  );
}

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
  constitutionalQuorum?: number;  // Category quorum rules
  nonConstitutionalQuorum?: number;
  approvalThreshold?: number;
  bicameralSystem?: BicameralGovernance | null;
  tokenHouseQuorum?: number;
  tokenHouseApproval?: number;
  citizensHouseVetoEnabled?: boolean;
  vetoThresholdPercent?: number;
  rageQuitThresholdPercent?: number;
  minTimelockSteps?: number;
  maxTimelockSteps?: number;
  councilMembers?: string[];
  vetoThreshold?: number;
  vetoPeriodSteps?: number;
  stakingThreshold?: number;
  boostedQuorum?: number;
  normalQuorum?: number;
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
 * Now also checks quorum if configured (fixes bug where quorum was ignored)
 * Uses token-weighted participation for quorum calculation (like real DAOs)
 */
export class MajorityRule extends GovernanceRule {
  private quorumPercentage: number | undefined;

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Use configured quorum if provided (as fraction 0-1)
    this.quorumPercentage = config?.quorumPercentage;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // If quorum is configured, check it first
    if (this.quorumPercentage !== undefined && this.quorumPercentage > 0) {
      // Calculate total voting power (tokens) in the DAO
      // This matches how real DAOs like Compound calculate quorum
      const totalTokens = getTotalTokenSupply(dao);

      // Calculate tokens that participated in voting
      const votingTokens = proposal.votesFor + proposal.votesAgainst;
      const participationRate = votingTokens / Math.max(totalTokens, 1);

      if (participationRate < this.quorumPercentage) {
        return false; // Quorum not met
      }
    }

    // Simple majority: more votes for than against
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
    const totalTokens = getTotalTokenSupply(dao);
    const participationRate = totalVotes / Math.max(totalTokens, 1);

    // Must meet quorum AND have majority support
    return (
      participationRate >= this.quorumPercentage &&
      proposal.votesFor > proposal.votesAgainst
    );
  }
}

/**
 * Supermajority rule - require higher threshold than simple majority
 * Now also checks quorum if configured (fixes bug where quorum was ignored)
 */
export class SupermajorityRule extends GovernanceRule {
  private threshold: number;
  private quorumPercentage: number | undefined;

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.threshold = config?.threshold ?? 0.66;
    this.quorumPercentage = config?.quorumPercentage;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0) {
      return false;
    }

    // Check quorum first if configured
    if (this.quorumPercentage !== undefined && this.quorumPercentage > 0) {
      const totalTokens = getTotalTokenSupply(dao);
      const participationRate = totalVotes / Math.max(totalTokens, 1);

      if (participationRate < this.quorumPercentage) {
        return false; // Quorum not met
      }
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
    // Calculate total tokens in circulation (including staked and delegated)
    const totalTokens = getTotalTokenSupply(dao);

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
 * Now also checks quorum if configured (fixes bug where quorum was ignored)
 */
export class TimeDecayRule extends GovernanceRule {
  private initialThreshold: number;
  private finalThreshold: number;
  private decaySteps: number;
  private quorumPercentage: number | undefined;

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Default: starts at 66% threshold, decays to 50% over 100 steps
    this.initialThreshold = config?.threshold ?? 0.66;
    this.finalThreshold = 0.5;
    this.decaySteps = 100;
    this.quorumPercentage = config?.quorumPercentage;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalVotes === 0) {
      return false;
    }

    // Check quorum first if configured
    if (this.quorumPercentage !== undefined && this.quorumPercentage > 0) {
      const totalTokens = getTotalTokenSupply(dao);
      const participationRate = totalVotes / Math.max(totalTokens, 1);

      if (participationRate < this.quorumPercentage) {
        return false; // Quorum not met
      }
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
    const totalReputation = dao.members.reduce(
      (sum, member) => sum + member.reputation, 0
    );

    // Sum reputation of members who actually voted
    const votesMap = proposal.votes;
    let voterReputation = 0;
    if (votesMap) {
      for (const [memberId] of votesMap) {
        const member = dao.members.find(m => m.uniqueId === memberId);
        if (member) {
          voterReputation += member.reputation;
        }
      }
    }

    const participationRate = voterReputation / Math.max(totalReputation, 1);
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
  private convictionState: Map<string, number> = new Map(); // daoId:proposalId -> accumulated conviction

  constructor(config?: GovernanceRuleConfig) {
    super();
    // Default: need conviction equivalent to 10% of total tokens
    this.thresholdPercent = config?.convictionThreshold ?? 0.10;
    // Default: conviction reaches 50% of max after 30 steps
    this.halfLife = config?.convictionHalfLife ?? 30;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Calculate decay rate per step (approaches 0.5 after halfLife steps)
    const decayRate = Math.pow(0.5, 1 / this.halfLife);

    const stateKey = `${dao.daoId}:${proposal.uniqueId}`;
    const prevConviction = this.convictionState.get(stateKey) || 0;

    // Decay previous conviction and add current support
    const currentSupport = proposal.votesFor;
    const newConviction = prevConviction * decayRate + currentSupport;
    this.convictionState.set(stateKey, newConviction);

    // Calculate threshold based on total voting power
    const totalTokens = getTotalTokenSupply(dao);
    const requestedFraction = (proposal.fundingGoal || 1) / Math.max(totalTokens, 1);
    const threshold = totalTokens * requestedFraction / (1 - decayRate);

    // Clean up closed proposals
    for (const [id] of this.convictionState) {
      const [daoId, proposalId] = id.split(':');
      if (daoId === dao.daoId && !dao.proposals.some(p => p.uniqueId === proposalId && p.status === 'open')) {
        this.convictionState.delete(id);
      }
    }

    return newConviction >= threshold;
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
    const votesMap = proposal.votes;

    if (!votesMap || votesMap.size === 0) {
      return false;
    }

    // Calculate quadratic votes (sqrt of each voter's weight)
    let quadraticVotesFor = 0;
    let quadraticVotesAgainst = 0;

    for (const [, voteData] of votesMap) {
      if (voteData.vote) {
        quadraticVotesFor += voteData.weight;  // already sqrt'd by voting strategy
      } else {
        quadraticVotesAgainst += voteData.weight;  // already sqrt'd by voting strategy
      }
    }

    // Calculate total quadratic voting power in the DAO
    const totalQuadraticPower = dao.members.reduce(
      (sum, member) => sum + Math.sqrt(member.tokens + member.stakedTokens),
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.constitutionalQuorum = config?.constitutionalQuorum ?? 0.05;
    this.nonConstitutionalQuorum = config?.nonConstitutionalQuorum ?? 0.03;
    this.approvalThreshold = config?.approvalThreshold ?? 0.51;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const multiStage = proposal as unknown as MultiStageProposal;
    const category = multiStage.proposalCategory || 'standard';

    // Calculate total voting power
    const totalTokens = getTotalTokenSupply(dao);

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
    // CRITICAL FIX: quorum must check total participation, not just votes for
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const quorumMet = totalVotes >= quorumVotes;

    // Check approval threshold
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.bicameralSystem = config?.bicameralSystem ?? null;
    this.tokenHouseQuorum = config?.tokenHouseQuorum ?? 0.30;
    this.tokenHouseApproval = config?.tokenHouseApproval ?? 0.51;
    this.citizensHouseVetoEnabled = config?.citizensHouseVetoEnabled ?? true;
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.vetoThresholdPercent = config?.vetoThresholdPercent ?? 1;
    this.rageQuitThresholdPercent = config?.rageQuitThresholdPercent ?? 10;
    this.minTimelockSteps = config?.minTimelockSteps ?? 120;
    this.maxTimelockSteps = config?.maxTimelockSteps ?? 1080;
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
  private competingProposals: Map<string, Map<string, number>> = new Map(); // daoId -> (proposalId -> votes)

  constructor(_config?: GovernanceRuleConfig) {
    super();
  }

  /**
   * Register a competing proposal
   */
  registerCompetingProposal(proposalId: string, approvalVotes: number): void {
    const defaultMap = this.competingProposals.get('default') || new Map();
    defaultMap.set(proposalId, approvalVotes);
    this.competingProposals.set('default', defaultMap);
  }

  /**
   * Clear competing proposals (new voting round)
   */
  clearCompetingProposals(): void {
    this.competingProposals.clear();
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const daoId = dao.daoId ?? 'default';
    if (!this.competingProposals.has(daoId)) {
      this.competingProposals.set(daoId, new Map());
    }
    const daoProposals = this.competingProposals.get(daoId)!;

    // Clear stale entries for resolved proposals
    for (const [id] of daoProposals) {
      if (!dao.proposals.some(p => p.uniqueId === id && p.status === 'open')) {
        daoProposals.delete(id);
      }
    }

    // Register this proposal's votes
    daoProposals.set(proposal.uniqueId, proposal.votesFor);

    // Find the proposal with highest approval
    let maxVotes = 0;
    let leadingProposalId = '';

    for (const [id, votes] of daoProposals.entries()) {
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.councilMembers = new Set(config?.councilMembers ?? []);
    this.approvalThreshold = config?.approvalThreshold ?? 0.75;
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

  get quorumFraction(): number {
    return this.approvalThreshold;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Count distinct council member votes, 1 per member regardless of tokens
    const votesMap = proposal.votes;
    let councilFor = 0;
    let councilAgainst = 0;
    let councilTotal = 0;

    if (votesMap) {
      for (const [memberId, voteData] of votesMap) {
        if (this.councilMembers.has(memberId)) {
          councilTotal++;
          if (voteData.vote) councilFor++;
          else councilAgainst++;
        }
      }
    }

    const councilSize = this.councilMembers.size;
    if (councilSize === 0) {
      return false;
    }

    // Check quorum: enough council members voted
    const quorumMet = councilTotal >= Math.ceil(councilSize * this.approvalThreshold);

    // Check approval: majority of council votes
    return quorumMet && councilFor > councilAgainst;
  }
}

/**
 * Optimistic approval rule
 * Proposal auto-passes unless vetoed within window
 */
export class OptimisticApprovalRule extends GovernanceRule {
  private vetoThreshold: number;  // Number of veto votes to block
  private vetoPeriodSteps: number;

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.vetoThreshold = config?.vetoThreshold ?? 100;
    this.vetoPeriodSteps = config?.vetoPeriodSteps ?? 168;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    const age = dao.currentStep - proposal.creationTime;

    if (age < this.vetoPeriodSteps) {
      // Still in veto period - not yet approved (pending)
      return false;
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

  constructor(config?: GovernanceRuleConfig) {
    super();
    this.stakingThreshold = config?.stakingThreshold ?? 100;
    this.boostedQuorum = config?.boostedQuorum ?? 0.01;
    this.normalQuorum = config?.normalQuorum ?? 0.50;
  }

  approve(proposal: Proposal, dao: DAO): boolean {
    // Check if proposal is "boosted" (simplified - would need staking tracking)
    const isBoosted = proposal.currentFunding >= this.stakingThreshold;

    const totalTokens = getTotalTokenSupply(dao);

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
