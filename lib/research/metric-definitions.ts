import type { Proposal } from '../data-structures/proposal';
import type { DAOMember } from '../agents/base';

export function proposalTurnout(proposal: Proposal, currentVotingPower: number): number {
  const denominator = proposal.snapshotTaken && proposal.totalSupplySnapshot > 0
    ? proposal.totalSupplySnapshot
    : currentVotingPower;
  if (denominator <= 0) return 0;
  return ((proposal.votesFor || 0) + (proposal.votesAgainst || 0)) / denominator;
}

export function proposalReachedQuorum(
  proposal: Proposal,
  currentVotingPower: number,
  currentQuorumThreshold: number
): boolean {
  const threshold = proposal.snapshotTaken
    ? proposal.quorumThresholdSnapshot
    : currentQuorumThreshold;
  return proposalTurnout(proposal, currentVotingPower) >= threshold;
}

export function delegationConcentrationHhi(members: DAOMember[]): number {
  const incoming = new Map<string, number>();
  let totalDelegated = 0;
  for (const member of members) {
    for (const [delegateId, rawAmount] of member.delegations) {
      const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
      if (amount === 0) continue;
      incoming.set(delegateId, (incoming.get(delegateId) ?? 0) + amount);
      totalDelegated += amount;
    }
  }
  if (totalDelegated === 0) return 0;
  return Array.from(incoming.values()).reduce((hhi, amount) => {
    const share = amount / totalDelegated;
    return hhi + share * share;
  }, 0);
}

export function wealthRankMobility(
  initialBalances: Map<string, number>,
  members: DAOMember[]
): number {
  const currentBalances = new Map(
    members.map((member) => [
      member.uniqueId,
      (member.tokens || 0) + (member.stakedTokens || 0),
    ])
  );
  const memberIds = Array.from(initialBalances.keys()).filter((id) => currentBalances.has(id));
  const count = memberIds.length;
  if (count < 2) return 0;

  const ranks = (balances: Map<string, number>): Map<string, number> => {
    const ordered = [...memberIds].sort((a, b) => {
      const difference = (balances.get(b) ?? 0) - (balances.get(a) ?? 0);
      return difference !== 0 ? difference : a.localeCompare(b);
    });
    return new Map(ordered.map((id, index) => [id, index]));
  };
  const initialRanks = ranks(initialBalances);
  const currentRanks = ranks(currentBalances);
  const displacement = memberIds.reduce(
    (sum, id) => sum + Math.abs(initialRanks.get(id)! - currentRanks.get(id)!),
    0
  );
  const maximumDisplacement = Math.floor(count * count / 2);
  return maximumDisplacement > 0 ? displacement / maximumDisplacement : 0;
}
