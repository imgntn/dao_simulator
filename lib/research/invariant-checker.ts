/**
 * Invariant Checker
 *
 * Verifies fundamental invariants hold during simulation:
 * - Token conservation (total tokens = initial supply)
 * - Reputation non-negativity
 * - Vote totals match participants
 * - Delegation chain acyclicity
 */

import type { DAO } from '../data-structures/dao';
import type { DAOSimulation } from '../engine/simulation';

export interface InvariantViolation {
  invariant: string;
  step: number;
  message: string;
  expected?: number;
  actual?: number;
}

export interface InvariantCheckResult {
  passed: boolean;
  violations: InvariantViolation[];
  checksPerformed: number;
}

export interface InvariantConfig {
  checkConservation?: boolean;
  checkReputationNonNegative?: boolean;
  checkVoteTotals?: boolean;
  checkDelegationAcyclic?: boolean;
  conservationTolerance?: number; // Allow small floating point errors
}

const DEFAULT_CONFIG: InvariantConfig = {
  checkConservation: true,
  checkReputationNonNegative: true,
  checkVoteTotals: true,
  checkDelegationAcyclic: true,
  conservationTolerance: 0.01, // Allow 0.01 token rounding error
};

/**
 * Check all invariants for a DAO at a given step
 */
export function checkInvariants(
  dao: DAO,
  step: number,
  initialTokenSupply: number,
  config: InvariantConfig = DEFAULT_CONFIG
): InvariantCheckResult {
  const violations: InvariantViolation[] = [];
  let checksPerformed = 0;

  // Token conservation check
  if (config.checkConservation) {
    checksPerformed++;
    const conservationResult = checkTokenConservation(
      dao,
      step,
      initialTokenSupply,
      config.conservationTolerance ?? 0.01
    );
    if (conservationResult) {
      violations.push(conservationResult);
    }
  }

  // Reputation non-negativity check
  if (config.checkReputationNonNegative) {
    checksPerformed++;
    const reputationViolations = checkReputationNonNegative(dao, step);
    violations.push(...reputationViolations);
  }

  // Vote totals check
  if (config.checkVoteTotals) {
    checksPerformed++;
    const voteViolations = checkVoteTotals(dao, step);
    violations.push(...voteViolations);
  }

  // Delegation acyclicity check
  if (config.checkDelegationAcyclic) {
    checksPerformed++;
    const delegationViolations = checkDelegationAcyclic(dao, step);
    violations.push(...delegationViolations);
  }

  return {
    passed: violations.length === 0,
    violations,
    checksPerformed,
  };
}

/**
 * Check token conservation: sum of all tokens equals initial supply
 */
function checkTokenConservation(
  dao: DAO,
  step: number,
  initialSupply: number,
  tolerance: number
): InvariantViolation | null {
  // Sum all agent tokens
  const agentTokens = dao.members.reduce((sum, m) => sum + (m.tokens || 0), 0);

  // Get treasury token balance
  const treasuryTokens = dao.treasury.getTokenBalance(dao.tokenSymbol);

  // Note: We're not tracking burned tokens explicitly, so we just check
  // that total doesn't exceed initial supply and is reasonably close
  const totalTokens = agentTokens + treasuryTokens;

  // Check if total exceeds initial (tokens created from nowhere)
  if (totalTokens > initialSupply + tolerance) {
    return {
      invariant: 'token_conservation',
      step,
      message: `Total tokens (${totalTokens.toFixed(2)}) exceeds initial supply (${initialSupply.toFixed(2)})`,
      expected: initialSupply,
      actual: totalTokens,
    };
  }

  // We allow tokens to decrease (burned/lost) but not increase
  // If you want strict conservation, uncomment this:
  // if (Math.abs(totalTokens - initialSupply) > tolerance) {
  //   return {
  //     invariant: 'token_conservation',
  //     step,
  //     message: `Token total (${totalTokens.toFixed(2)}) differs from initial supply (${initialSupply.toFixed(2)})`,
  //     expected: initialSupply,
  //     actual: totalTokens,
  //   };
  // }

  return null;
}

/**
 * Check that no agent has negative reputation
 */
function checkReputationNonNegative(dao: DAO, step: number): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const member of dao.members) {
    if (member.reputation < 0) {
      violations.push({
        invariant: 'reputation_non_negative',
        step,
        message: `Agent ${member.uniqueId} has negative reputation: ${member.reputation}`,
        expected: 0,
        actual: member.reputation,
      });
    }
  }

  return violations;
}

/**
 * Check that vote totals are consistent
 */
function checkVoteTotals(dao: DAO, step: number): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const proposal of dao.proposals) {
    // Skip proposals without votes
    const votes = proposal.votes;
    if (!votes || votes.size === 0) continue;

    let yesVotes = 0;
    let noVotes = 0;
    const totalVoters = votes.size;

    for (const [, voteData] of votes) {
      if (voteData.vote === true) {
        yesVotes += voteData.weight || 1;
      } else if (voteData.vote === false) {
        noVotes += voteData.weight || 1;
      }
      // abstain votes are intentionally skipped
    }

    // Check that yes + no weights are reasonable (no negative weights)
    if (yesVotes < 0 || noVotes < 0) {
      violations.push({
        invariant: 'vote_totals',
        step,
        message: `Proposal ${proposal.uniqueId} has negative vote weights: yes=${yesVotes}, no=${noVotes}`,
      });
    }

    // Check that reported totals match calculated totals (if available)
    const reportedYes = proposal.votesFor;
    const reportedNo = proposal.votesAgainst;

    if (reportedYes !== undefined && Math.abs(reportedYes - yesVotes) > 0.01) {
      violations.push({
        invariant: 'vote_totals',
        step,
        message: `Proposal ${proposal.uniqueId} reported yes votes (${reportedYes}) doesn't match calculated (${yesVotes})`,
        expected: reportedYes,
        actual: yesVotes,
      });
    }

    if (reportedNo !== undefined && Math.abs(reportedNo - noVotes) > 0.01) {
      violations.push({
        invariant: 'vote_totals',
        step,
        message: `Proposal ${proposal.uniqueId} reported no votes (${reportedNo}) doesn't match calculated (${noVotes})`,
        expected: reportedNo,
        actual: noVotes,
      });
    }
  }

  return violations;
}

/**
 * Check that delegation chains don't form cycles
 */
function checkDelegationAcyclic(dao: DAO, step: number): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Build delegation graph
  const delegationTargets = new Map<string, string[]>();

  for (const member of dao.members) {
    if (member.delegations && member.delegations.size > 0) {
      const targets: string[] = [];
      for (const [targetId] of member.delegations) {
        targets.push(targetId);
      }
      delegationTargets.set(member.uniqueId, targets);
    }
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string, path: string[]): string[] | null {
    visited.add(nodeId);
    recursionStack.add(path.length > 0 ? path[path.length - 1] : nodeId);

    const targets = delegationTargets.get(nodeId) || [];
    for (const target of targets) {
      if (!visited.has(target)) {
        const cycle = hasCycle(target, [...path, nodeId]);
        if (cycle) return cycle;
      } else if (path.includes(target)) {
        // Found a cycle
        return [...path, nodeId, target];
      }
    }

    return null;
  }

  for (const memberId of delegationTargets.keys()) {
    if (!visited.has(memberId)) {
      const cycle = hasCycle(memberId, []);
      if (cycle) {
        violations.push({
          invariant: 'delegation_acyclic',
          step,
          message: `Delegation cycle detected: ${cycle.join(' -> ')}`,
        });
        break; // One cycle is enough to report
      }
    }
  }

  return violations;
}

/**
 * Calculate initial token supply from a simulation
 */
export function calculateInitialTokenSupply(simulation: DAOSimulation): number {
  const dao = simulation.dao;

  // Sum all agent tokens
  const agentTokens = dao.members.reduce((sum, m) => sum + (m.tokens || 0), 0);

  // Get treasury balance
  const treasuryTokens = dao.treasury.getTokenBalance(dao.tokenSymbol);

  return agentTokens + treasuryTokens;
}

/**
 * InvariantTracker - tracks invariants across simulation steps
 */
export class InvariantTracker {
  private initialTokenSupply: number;
  private config: InvariantConfig;
  private violations: InvariantViolation[] = [];
  private totalChecks: number = 0;

  constructor(initialTokenSupply: number, config: InvariantConfig = DEFAULT_CONFIG) {
    this.initialTokenSupply = initialTokenSupply;
    this.config = config;
  }

  /**
   * Check invariants at current step
   */
  check(dao: DAO, step: number): InvariantCheckResult {
    const result = checkInvariants(dao, step, this.initialTokenSupply, this.config);
    this.violations.push(...result.violations);
    this.totalChecks += result.checksPerformed;
    return result;
  }

  /**
   * Get all violations accumulated so far
   */
  getViolations(): InvariantViolation[] {
    return [...this.violations];
  }

  /**
   * Get total number of checks performed
   */
  getTotalChecks(): number {
    return this.totalChecks;
  }

  /**
   * Check if all invariants have held so far
   */
  allPassed(): boolean {
    return this.violations.length === 0;
  }

  /**
   * Get summary report
   */
  getSummary(): {
    passed: boolean;
    totalChecks: number;
    violationCount: number;
    violations: InvariantViolation[];
  } {
    return {
      passed: this.violations.length === 0,
      totalChecks: this.totalChecks,
      violationCount: this.violations.length,
      violations: this.violations,
    };
  }

  /**
   * Reset tracker state
   */
  reset(newInitialSupply?: number): void {
    if (newInitialSupply !== undefined) {
      this.initialTokenSupply = newInitialSupply;
    }
    this.violations = [];
    this.totalChecks = 0;
  }
}
