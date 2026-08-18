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

export interface TokenSupplySnapshot {
  token: string;
  memberLiquid: number;
  memberStaked: number;
  memberDelegated: number;
  treasuryLiquid: number;
  treasuryLocked: number;
  treasuryBuffer: number;
  liquidityPools: number;
  guildTreasuries: number;
  externalCustody: number;
  minted: number;
  burned: number;
  total: number;
}

export interface AssetSupplyBaseline {
  supply: number;
  minted: number;
  burned: number;
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

function poolTokenBalance(dao: DAO, token: string): number {
  let total = 0;
  for (const pool of dao.treasury.pools.values()) {
    if (pool.tokenA === token) total += pool.reserveA;
    if (pool.tokenB === token) total += pool.reserveB;
  }
  return total;
}

export function captureTokenSupply(dao: DAO, token: string = dao.tokenSymbol): TokenSupplySnapshot {
  const isPrimary = token === dao.tokenSymbol;
  const memberLiquid = dao.members.reduce(
    (sum, member) => sum + member.getAssetBalance(token),
    0
  );
  const memberStaked = isPrimary
    ? dao.members.reduce((sum, member) => sum + member.stakedTokens, 0)
    : 0;
  const memberDelegated = isPrimary
    ? dao.members.reduce(
        (sum, member) =>
          sum +
          Array.from(member.delegations.values()).reduce(
            (subtotal, value) => subtotal + value,
            0
          ),
        0
      )
    : 0;
  const treasuryLiquid = dao.treasury.getTokenBalance(token);
  const treasuryLocked = dao.treasury.getLockedBalance(token);
  const treasuryBuffer = isPrimary ? dao.treasury.getTokenBalance('DAO_BUFFER') : 0;
  const liquidityPools = poolTokenBalance(dao, token);
  let guildTreasuries = 0;
  let externalCustody = 0;
  let minted = 0;
  let burned = 0;

  const treasuries = [dao.treasury, ...dao.guilds.map(guild => guild.treasury)];
  for (const treasury of treasuries) {
    if (treasury !== dao.treasury) {
      guildTreasuries += treasury.getTokenBalance(token) + treasury.getLockedBalance(token);
      for (const pool of treasury.pools.values()) {
        if (pool.tokenA === token) guildTreasuries += pool.reserveA;
        if (pool.tokenB === token) guildTreasuries += pool.reserveB;
      }
    }
    for (const entry of treasury.getLedger()) {
      if (entry.token !== token) continue;
      if (entry.operation === 'mint') minted += entry.amount;
      if (entry.operation === 'burn') burned += entry.amount;
      if (entry.flowClass === 'transfer' && entry.destination.startsWith('external:')) {
        externalCustody += entry.amount;
      }
      if (entry.flowClass === 'transfer' && entry.source.startsWith('external:')) {
        externalCustody -= entry.amount;
      }
    }
  }

  return {
    token,
    memberLiquid,
    memberStaked,
    memberDelegated,
    treasuryLiquid,
    treasuryLocked,
    treasuryBuffer,
    liquidityPools,
    guildTreasuries,
    externalCustody,
    minted,
    burned,
    total:
      memberLiquid +
      memberStaked +
      memberDelegated +
      treasuryLiquid +
      treasuryLocked +
      treasuryBuffer +
      liquidityPools +
      guildTreasuries +
      externalCustody,
  };
}

export function captureAllTokenSupplies(dao: DAO): Record<string, TokenSupplySnapshot> {
  const tokens = new Set<string>([dao.tokenSymbol]);
  for (const member of dao.members) {
    for (const token of Object.keys(member.getAssetBalances())) tokens.add(token);
  }
  for (const treasury of [dao.treasury, ...dao.guilds.map(guild => guild.treasury)]) {
    for (const token of treasury.getTokenSymbols()) tokens.add(token);
  }
  // DAO_BUFFER is an internal claim on primary assets, not a separate currency.
  tokens.delete('DAO_BUFFER');

  return Object.fromEntries(
    Array.from(tokens)
      .sort()
      .map(token => [token, captureTokenSupply(dao, token)])
  );
}

export function createAssetSupplyBaselines(
  dao: DAO
): Record<string, AssetSupplyBaseline> {
  return Object.fromEntries(
    Object.entries(captureAllTokenSupplies(dao)).map(([token, snapshot]) => [
      token,
      {
        supply: snapshot.total,
        minted: snapshot.minted,
        burned: snapshot.burned,
      },
    ])
  );
}

export function checkAllTokenConservation(
  dao: DAO,
  step: number,
  baselines: Record<string, AssetSupplyBaseline>,
  tolerance: number
): InvariantViolation | null {
  const snapshots = captureAllTokenSupplies(dao);
  const tokens = new Set([...Object.keys(baselines), ...Object.keys(snapshots)]);
  for (const token of Array.from(tokens).sort()) {
    const snapshot = snapshots[token] || captureTokenSupply(dao, token);
    const baseline = baselines[token] || { supply: 0, minted: 0, burned: 0 };
    const expected =
      baseline.supply +
      (snapshot.minted - baseline.minted) -
      (snapshot.burned - baseline.burned);
    if (Math.abs(snapshot.total - expected) > tolerance) {
      return {
        invariant: 'multi_asset_token_conservation',
        step,
        message:
          `Accounted ${token} supply (${snapshot.total.toFixed(6)}) differs from ` +
          `baseline + net issuance (${expected.toFixed(6)}); ` +
          `members=${snapshot.memberLiquid.toFixed(6)}, treasury=${snapshot.treasuryLiquid.toFixed(6)}, ` +
          `locked=${snapshot.treasuryLocked.toFixed(6)}, pools=${snapshot.liquidityPools.toFixed(6)}, ` +
          `guilds=${snapshot.guildTreasuries.toFixed(6)}, external=${snapshot.externalCustody.toFixed(6)}`,
        expected,
        actual: snapshot.total,
      };
    }
  }

  const ledgerIssues = [dao.treasury, ...dao.guilds.map(guild => guild.treasury)]
    .flatMap(treasury => treasury.validateLedger(tolerance).issues);
  return ledgerIssues.length > 0
    ? {
        invariant: 'multi_asset_token_conservation',
        step,
        message: `Treasury ledger failed reconciliation: ${ledgerIssues.join('; ')}`,
      }
    : null;
}

/**
 * Check exact token conservation across every modeled holding location.
 */
export function checkTokenConservation(
  dao: DAO,
  step: number,
  initialSupply: number,
  tolerance: number
): InvariantViolation | null {
  const snapshot = captureTokenSupply(dao);
  const expected = initialSupply + snapshot.minted - snapshot.burned;
  const ledgerIssues = [dao.treasury, ...dao.guilds.map(guild => guild.treasury)]
    .flatMap(treasury => treasury.validateLedger(tolerance).issues);

  if (ledgerIssues.length > 0) {
    return {
      invariant: 'token_conservation',
      step,
      message: `Treasury ledger failed reconciliation: ${ledgerIssues.join('; ')}`,
      expected,
      actual: snapshot.total,
    };
  }

  if (Math.abs(snapshot.total - expected) > tolerance) {
    return {
      invariant: 'token_conservation',
      step,
      message:
        `Accounted ${snapshot.token} supply (${snapshot.total.toFixed(6)}) differs from ` +
        `initial + minted - burned (${expected.toFixed(6)}); ` +
        `liquid=${snapshot.memberLiquid.toFixed(6)}, staked=${snapshot.memberStaked.toFixed(6)}, ` +
        `delegated=${snapshot.memberDelegated.toFixed(6)}, treasury=${snapshot.treasuryLiquid.toFixed(6)}, ` +
        `locked=${snapshot.treasuryLocked.toFixed(6)}, buffer=${snapshot.treasuryBuffer.toFixed(6)}, ` +
        `pools=${snapshot.liquidityPools.toFixed(6)}, ` +
        `guilds=${snapshot.guildTreasuries.toFixed(6)}, external=${snapshot.externalCustody.toFixed(6)}, ` +
        `minted=${snapshot.minted.toFixed(6)}, ` +
        `burned=${snapshot.burned.toFixed(6)}`,
      expected,
      actual: snapshot.total,
    };
  }

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
  const snapshot = captureTokenSupply(simulation.dao);
  return snapshot.total - snapshot.minted + snapshot.burned;
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
