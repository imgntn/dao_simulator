// Transitive Delegation Resolver
// Handles delegation chain resolution for voting power calculation

import type { DAOMember } from '../agents/base';

/**
 * DelegationResolver provides utilities for resolving transitive delegation chains.
 *
 * In liquid democracy, voting power flows through delegation chains:
 * A -> B -> C means A delegates to B, B delegates to C, and C votes with accumulated power.
 *
 * Key features:
 * - Transitive power accumulation: C can vote with A's + B's + C's tokens
 * - Cycle detection at any depth: Prevents A -> B -> C -> A
 * - Snapshot-compatible: Works with voting power snapshots
 */
export class DelegationResolver {
  /**
   * Resolve total voting power including all transitive delegations.
   *
   * This calculates the effective voting power a member has when they vote,
   * including their own tokens/stake plus all tokens delegated to them
   * (directly or transitively through other delegators).
   *
   * Note: When delegation occurs via delegate(), tokens are transferred from
   * the delegator to the delegations map (delegator loses tokens). So we count:
   * - Member's own tokens + staked tokens
   * - Delegated amounts from each delegator
   * - Transitive: delegated amounts that delegators received from their delegators
   *
   * @param member - The member to calculate voting power for
   * @param visited - Set of already-visited member IDs (for cycle detection)
   * @returns Total voting power including delegated tokens
   */
  static resolveVotingPower(member: DAOMember, visited: Set<string> = new Set()): number {
    // Cycle detection: if we've seen this member, don't count again
    if (visited.has(member.uniqueId)) {
      return 0;
    }
    visited.add(member.uniqueId);

    // Start with member's own voting power (tokens + staked tokens)
    let totalPower = member.tokens + member.stakedTokens;

    // Add power from all delegators (members who delegated TO this member)
    // This is stored in the delegates array
    for (const delegator of member.delegates) {
      // Get the amount this delegator delegated to this member
      const delegatedAmount = delegator.delegations.get(member.uniqueId) || 0;

      if (delegatedAmount > 0) {
        // Add the delegated amount directly (tokens were already transferred)
        totalPower += delegatedAmount;
      }

      // For transitive chains, we need to get what was delegated TO the delegator
      // (not the delegator's own tokens, since they already gave those away)
      // This handles A -> B -> C: C gets B's delegated amount, plus what A delegated to B
      totalPower += this.getReceivedDelegations(delegator, visited);
    }

    return totalPower;
  }

  /**
   * Get the total amount of tokens delegated TO a member (not their own tokens).
   * Used for transitive delegation calculation.
   */
  private static getReceivedDelegations(member: DAOMember, visited: Set<string>): number {
    let total = 0;

    for (const delegator of member.delegates) {
      if (visited.has(delegator.uniqueId)) {
        continue;
      }

      const delegatedAmount = delegator.delegations.get(member.uniqueId) || 0;
      if (delegatedAmount > 0) {
        total += delegatedAmount;
      }

      // Recursively get what was delegated to the delegator
      total += this.getReceivedDelegations(delegator, new Set(visited));
    }

    return total;
  }

  /**
   * Get the representative chain for a member (who they delegate to, transitively).
   *
   * Follows the representative pointer to build the full delegation chain.
   * For example: A -> B -> C returns [A, B, C] when called on A.
   *
   * @param member - The starting member
   * @returns Array of members in the delegation chain
   */
  static getDelegationChain(member: DAOMember): DAOMember[] {
    const chain: DAOMember[] = [];
    let current: DAOMember | null = member;
    const visited = new Set<string>();

    while (current && !visited.has(current.uniqueId)) {
      visited.add(current.uniqueId);
      chain.push(current);

      // Follow the representative chain (field is now in base DAOMember class)
      current = current.representative;
    }

    return chain;
  }

  /**
   * Get the terminal representative for a member (end of delegation chain).
   *
   * Follows the representative chain to find who will actually cast the vote.
   *
   * @param member - The starting member
   * @returns The terminal representative (or the member itself if no delegation)
   */
  static getTerminalRepresentative(member: DAOMember): DAOMember {
    const chain = this.getDelegationChain(member);
    return chain[chain.length - 1];
  }

  /**
   * Check if delegating from one member to another would create a cycle.
   *
   * A cycle occurs when the target's delegation chain leads back to the source.
   * For example: If A -> B -> C exists, then C -> A would create a cycle.
   *
   * @param from - The member who wants to delegate
   * @param to - The intended delegation target
   * @returns true if delegation would create a cycle
   */
  static wouldCreateCycle(from: DAOMember, to: DAOMember): boolean {
    // Check if 'to' already leads back to 'from' through its representative chain
    const visited = new Set<string>();
    let current: DAOMember | null = to;

    while (current) {
      // If we've already visited this node, there's an existing cycle (but not involving 'from')
      if (visited.has(current.uniqueId)) {
        return false;
      }

      // If we reach 'from', then adding from -> to would create a cycle
      if (current.uniqueId === from.uniqueId) {
        return true;
      }

      visited.add(current.uniqueId);

      // Follow the representative chain (field is now in base DAOMember class)
      current = current.representative;
    }

    // Also check if 'to' has delegated to 'from' (direct circular delegation)
    if (to.delegations.has(from.uniqueId)) {
      return true;
    }

    // Check transitive delegations from 'to'
    for (const [delegateId] of to.delegations) {
      const delegateMember = from.model?.dao?.members.find(m => m.uniqueId === delegateId);
      if (delegateMember && this.wouldCreateCycleViaDelegate(from, delegateMember, new Set([to.uniqueId]))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper to check cycle through delegate chain.
   */
  private static wouldCreateCycleViaDelegate(
    from: DAOMember,
    current: DAOMember,
    visited: Set<string>
  ): boolean {
    if (visited.has(current.uniqueId)) {
      return false;
    }
    if (current.uniqueId === from.uniqueId) {
      return true;
    }
    visited.add(current.uniqueId);

    for (const [delegateId] of current.delegations) {
      const delegateMember = from.model?.dao?.members.find(m => m.uniqueId === delegateId);
      if (delegateMember && this.wouldCreateCycleViaDelegate(from, delegateMember, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate voting power for a snapshot (at proposal creation time).
   *
   * This version takes a snapshot map of member IDs to their base voting power,
   * allowing for point-in-time voting power calculation.
   *
   * @param memberId - The member to calculate power for
   * @param baseSnapshot - Map of member IDs to their base voting power
   * @param delegatesMap - Map of member IDs to their delegators' IDs
   * @param delegationsMap - Map of member IDs to their delegation amounts (memberId -> delegateId -> amount)
   * @param visited - Set of already-visited member IDs
   * @returns Total voting power at snapshot time
   */
  static resolveSnapshotVotingPower(
    memberId: string,
    baseSnapshot: Map<string, number>,
    delegatesMap: Map<string, string[]>,
    delegationsMap: Map<string, Map<string, number>>,
    visited: Set<string> = new Set()
  ): number {
    if (visited.has(memberId)) {
      return 0;
    }
    visited.add(memberId);

    // Start with base voting power from snapshot
    let totalPower = baseSnapshot.get(memberId) || 0;

    // Add power from delegators
    const delegatorIds = delegatesMap.get(memberId) || [];
    for (const delegatorId of delegatorIds) {
      const delegatorDelegations = delegationsMap.get(delegatorId);
      const delegatedAmount = delegatorDelegations?.get(memberId) || 0;

      if (delegatedAmount > 0) {
        totalPower += delegatedAmount;
      }

      // Recursively add transitive delegations
      totalPower += this.resolveSnapshotVotingPower(
        delegatorId,
        baseSnapshot,
        delegatesMap,
        delegationsMap,
        visited
      );
    }

    return totalPower;
  }

  /**
   * Get all members who have delegated to a given member (transitively).
   *
   * @param member - The member to find delegators for
   * @param visited - Set of already-visited member IDs
   * @returns Array of all delegators (direct and transitive)
   */
  static getAllDelegators(member: DAOMember, visited: Set<string> = new Set()): DAOMember[] {
    const delegators: DAOMember[] = [];

    if (visited.has(member.uniqueId)) {
      return delegators;
    }
    visited.add(member.uniqueId);

    for (const delegator of member.delegates) {
      if (!visited.has(delegator.uniqueId)) {
        delegators.push(delegator);
        // Recursively get delegators of delegators
        delegators.push(...this.getAllDelegators(delegator, visited));
      }
    }

    return delegators;
  }
}
