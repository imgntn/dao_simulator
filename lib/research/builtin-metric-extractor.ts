/**
 * Authoritative built-in research metric extraction.
 *
 * Every execution backend delegates here so a metric name has exactly one
 * implementation and one scientific meaning.
 */

import type { DAOSimulation } from '../engine/simulation';
import { STEP_DURATION_HOURS } from '../config/constants';
import type { BuiltinMetricType } from './experiment-config';
import {
  delegationConcentrationHhi,
  proposalReachedQuorum,
  proposalTurnout,
  wealthRankMobility,
} from './metric-definitions';
import { captureTokenSupply } from './invariant-checker';

// =============================================================================
// HELPER FUNCTIONS FOR STATISTICAL CALCULATIONS
// =============================================================================

/**
 * Calculate Gini coefficient for an array of values
 * Returns value between 0 (perfect equality) and 1 (perfect inequality)
 */
function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  if (sum === 0) return 0;

  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }

  return giniSum / (n * sum);
}

/**
 * Calculate coefficient of variation (std / mean)
 */
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = values.length > 1
    ? squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
    : 0;
  const std = Math.sqrt(variance);

  return std / mean;
}


/**
 * Calculate linear regression slope (trend)
 */
function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Proposal statistics interface
 */
interface ProposalStats {
  total: number;
  passed: number;
  rejected: number;
  open: number;
  expired: number;
}

/**
 * Get proposal statuses categorized
 */
function getProposalStats(proposals: any[]): ProposalStats {
  const stats: ProposalStats = {
    total: proposals.length,
    passed: 0,
    rejected: 0,
    open: 0,
    expired: 0,
  };

  for (const p of proposals) {
    const status = p.status?.toLowerCase() || 'unknown';
    if (status === 'approved' || status === 'completed' || status === 'passed' || status === 'executed') {
      stats.passed++;
    } else if (status === 'rejected') {
      stats.rejected++;
    } else if (status === 'open' || status === 'active' || status === 'voting') {
      stats.open++;
    } else if (status === 'expired' || status === 'abandoned') {
      stats.expired++;
    }
  }

  return stats;
}

/**
 * Vote data interface
 */
interface VoteData {
  voterId: string;
  vote: boolean;
  weight: number;
}

/**
 * Get voting data from a proposal
 */
function getProposalVotes(proposal: any): VoteData[] {
  const votes: VoteData[] = [];
  const votesMap = proposal.votes;

  if (votesMap instanceof Map) {
    for (const [voterId, voteData] of votesMap) {
      votes.push({
        voterId,
        vote: voteData.vote,
        weight: voteData.weight || 1,
      });
    }
  } else if (Array.isArray(votesMap)) {
    for (const v of votesMap) {
      votes.push({
        voterId: v.voterId || v.id,
        vote: v.vote,
        weight: v.weight || 1,
      });
    }
  }

  return votes;
}

/**
 * Get total voting power (tokens + staked)
 */
function getTotalVotingPower(members: any[]): number {
  return members.reduce((sum, m) => sum + (m.tokens || 0) + (m.stakedTokens || 0), 0);
}

/**
 * Get member token holdings sorted descending
 */
function getMemberTokensSorted(members: any[]): { id: string; tokens: number }[] {
  return members
    .map(m => ({ id: m.uniqueId, tokens: (m.tokens || 0) + (m.stakedTokens || 0) }))
    .sort((a, b) => b.tokens - a.tokens);
}

interface LearningDiagnostics {
  qTableSize: number;
  stateCount: number;
  episodeCount: number;
  totalReward: number;
  explorationRate: number;
}

function getLearningDiagnostics(members: unknown[]): LearningDiagnostics[] {
  const diagnostics: LearningDiagnostics[] = [];
  for (const member of members) {
    const candidate = member as {
      getLearningStats?: () => Partial<LearningDiagnostics>;
    };
    if (typeof candidate.getLearningStats !== 'function') continue;
    const stats = candidate.getLearningStats();
    const values = [
      stats.qTableSize,
      stats.stateCount,
      stats.episodeCount,
      stats.totalReward,
      stats.explorationRate,
    ];
    if (!values.every(value => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error('Learning diagnostics contain a missing or non-finite value');
    }
    diagnostics.push(stats as LearningDiagnostics);
  }
  return diagnostics;
}

function meanLearningDiagnostic(
  diagnostics: LearningDiagnostics[],
  field: keyof LearningDiagnostics
): number {
  if (diagnostics.length === 0) return 0;
  return diagnostics.reduce((sum, item) => sum + item[field], 0) / diagnostics.length;
}

// =============================================================================

export function extractBuiltinMetric(
  simulation: DAOSimulation,
  metric: BuiltinMetricType
): number {
  const value = extractBuiltinMetricValue(simulation, metric);
  if (!Number.isFinite(value)) {
    throw new Error(`Builtin metric "${metric}" produced a non-finite value: ${value}`);
  }
  return value;
}

function extractBuiltinMetricValue(simulation: DAOSimulation, metric: BuiltinMetricType): number {
  const dao = simulation.dao;
  const dataCollector = simulation.dataCollector;
  const latestStats = dataCollector.getLatestStats();
  const history = dataCollector.history || [];
  const proposals = dao.proposals || [];
  const members = dao.members || [];

  switch (metric) {
    // =========================================================================
    // BASIC OUTCOME METRICS
    // =========================================================================

    case 'proposal_pass_rate': {
      const stats = getProposalStats(proposals);
      const resolved = stats.passed + stats.rejected;
      return resolved > 0 ? stats.passed / resolved : 0;
    }

    case 'average_turnout': {
      if (proposals.length === 0) return 0;
      const totalSupply = getTotalVotingPower(members);

      let totalTurnout = 0;
      for (const proposal of proposals) {
        totalTurnout += proposalTurnout(proposal, totalSupply);
      }
      return totalTurnout / proposals.length;
    }

    case 'final_treasury':
      return dao.treasury?.getTokenBalance?.(dao.tokenSymbol) ?? dao.treasury?.funds ?? 0;

    case 'final_token_price':
      return dao.treasury?.getTokenPrice?.(dao.tokenSymbol) ?? 1;

    case 'final_member_count':
      return members.length;

    case 'final_gini':
      return latestStats?.gini ?? calculateGini(members.map(m => m.tokens || 0));

    case 'final_reputation_gini':
      return latestStats?.repGini ?? calculateGini(members.map(m => m.reputation || 0));

    case 'total_proposals':
      return proposals.length;

    case 'total_projects':
      return dao.projects?.length ?? 0;

    case 'average_token_balance': {
      if (members.length === 0) return 0;
      const totalTokens = members.reduce((sum, m) => sum + (m.tokens || 0), 0);
      return totalTokens / members.length;
    }

    case 'proposal_completion_rate': {
      if (proposals.length === 0) return 0;
      const terminal = proposals.filter(proposal =>
        proposal.status === 'approved'
        || proposal.status === 'completed'
        || proposal.status === 'rejected'
      ).length;
      return terminal / proposals.length;
    }

    case 'median_time_to_decision': {
      const durations = proposals.flatMap(proposal => {
        const terminal = proposal.status === 'approved'
          || proposal.status === 'completed'
          || proposal.status === 'rejected'
          || proposal.status === 'expired';
        const resolvedTime = proposal.resolvedTime;
        return terminal
          && Number.isFinite(proposal.creationTime)
          && typeof resolvedTime === 'number'
          && Number.isFinite(resolvedTime)
          && resolvedTime >= proposal.creationTime
          ? [(resolvedTime - proposal.creationTime) * STEP_DURATION_HOURS]
          : [];
      }).sort((left, right) => left - right);
      if (durations.length === 0) return 0;
      const middle = Math.floor(durations.length / 2);
      return durations.length % 2 === 1
        ? durations[middle]
        : (durations[middle - 1] + durations[middle]) / 2;
    }

    // =========================================================================
    // LEARNING DIAGNOSTICS
    // =========================================================================

    case 'learning_agent_count':
      return getLearningDiagnostics(members).length;

    case 'learning_q_table_size_mean':
      return meanLearningDiagnostic(getLearningDiagnostics(members), 'qTableSize');

    case 'learning_state_count_mean':
      return meanLearningDiagnostic(getLearningDiagnostics(members), 'stateCount');

    case 'learning_episode_count_mean':
      return meanLearningDiagnostic(getLearningDiagnostics(members), 'episodeCount');

    case 'learning_exploration_rate_mean':
      return meanLearningDiagnostic(getLearningDiagnostics(members), 'explorationRate');

    case 'learning_total_reward_mean':
      return meanLearningDiagnostic(getLearningDiagnostics(members), 'totalReward');

    // =========================================================================
    // GOVERNANCE EFFICIENCY METRICS
    // =========================================================================

    case 'quorum_reach_rate': {
      if (proposals.length === 0) return 0;
      const totalSupply = getTotalVotingPower(members);
      const quorumThreshold = (simulation.governanceRule as { quorumPercentage?: number } | undefined)?.quorumPercentage ?? 0.04;

      let quorumMet = 0;
      for (const proposal of proposals) {
        if (proposalReachedQuorum(proposal, totalSupply, quorumThreshold)) {
          quorumMet++;
        }
      }
      return quorumMet / proposals.length;
    }

    case 'avg_margin_of_victory': {
      const resolvedProposals = proposals.filter(p =>
        p.status === 'approved' || p.status === 'completed' ||
        p.status === 'rejected'
      );
      if (resolvedProposals.length === 0) return 0;

      let totalMargin = 0;
      for (const p of resolvedProposals) {
        const total = (p.votesFor || 0) + (p.votesAgainst || 0);
        if (total > 0) {
          totalMargin += Math.abs((p.votesFor || 0) - (p.votesAgainst || 0)) / total;
        }
      }
      return totalMargin / resolvedProposals.length;
    }

    case 'avg_time_to_decision': {
      const decisionHours = proposals.flatMap(p => {
        const terminal =
          p.status === 'approved' || p.status === 'completed' ||
          p.status === 'rejected' || p.status === 'expired';
        const creationTime = p.creationTime;
        const resolvedTime = p.resolvedTime;
        return terminal &&
          Number.isFinite(creationTime) &&
          Number.isFinite(resolvedTime) &&
          resolvedTime !== undefined &&
          resolvedTime >= creationTime
          ? [(resolvedTime - creationTime) * STEP_DURATION_HOURS]
          : [];
      });
      if (decisionHours.length === 0) return 0;
      return decisionHours.reduce((sum, value) => sum + value, 0) / decisionHours.length;
    }

    case 'proposal_abandonment_rate': {
      const stats = getProposalStats(proposals);
      if (stats.total === 0) return 0;
      return stats.expired / stats.total;
    }

    case 'proposal_rejection_rate': {
      const stats = getProposalStats(proposals);
      const resolved = stats.passed + stats.rejected;
      return resolved > 0 ? stats.rejected / resolved : 0;
    }

    case 'governance_overhead': {
      const stats = getProposalStats(proposals);
      const resolved = stats.passed + stats.rejected;
      if (resolved === 0) return 0;

      let totalVotesCast = 0;
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        totalVotesCast += votes.length;
      }
      return totalVotesCast / resolved;
    }

    // =========================================================================
    // PARTICIPATION QUALITY METRICS
    // =========================================================================

    case 'unique_voter_count': {
      const uniqueVoters = new Set<string>();
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        for (const v of votes) {
          uniqueVoters.add(v.voterId);
        }
      }
      return uniqueVoters.size;
    }

    case 'voter_participation_rate': {
      if (proposals.length === 0) return 0;

      let totalRate = 0;
      let counted = 0;

      for (const p of proposals) {
        const votes = getProposalVotes(p);
        const eligible = p.snapshotTaken
          ? p.votingPowerSnapshot.size
          : members.length;
        if (eligible <= 0) continue;

        const uniqueVoters = new Set<string>(votes.map(v => v.voterId));
        totalRate += uniqueVoters.size / eligible;
        counted++;
      }

      return counted > 0 ? totalRate / counted : 0;
    }

    case 'voter_concentration_gini': {
      const voterCounts = new Map<string, number>();
      const eligibleVoters = new Set<string>(members.map(m => m.uniqueId));
      for (const p of proposals) {
        if (p.snapshotTaken && p.votingPowerSnapshot instanceof Map) {
          for (const memberId of p.votingPowerSnapshot.keys()) {
            eligibleVoters.add(memberId);
          }
        }
        const votes = getProposalVotes(p);
        for (const v of votes) {
          eligibleVoters.add(v.voterId);
          voterCounts.set(v.voterId, (voterCounts.get(v.voterId) || 0) + 1);
        }
      }
      const allMemberVotes = Array.from(
        eligibleVoters,
        memberId => voterCounts.get(memberId) || 0
      );
      return calculateGini(allMemberVotes);
    }

    case 'delegate_concentration': {
      return delegationConcentrationHhi(members);
    }

    case 'avg_votes_per_proposal': {
      if (proposals.length === 0) return 0;

      let totalVoters = 0;
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        totalVoters += votes.length;
      }
      return totalVoters / proposals.length;
    }

    case 'voter_retention_rate': {
      if (proposals.length < 2) return 0;

      const chronologicalProposals = [...proposals].sort(
        (a, b) => (a.creationTime ?? 0) - (b.creationTime ?? 0)
      );
      const midpoint = Math.floor(chronologicalProposals.length / 2);
      const firstHalfVoters = new Set<string>();
      const secondHalfVoters = new Set<string>();

      for (let i = 0; i < chronologicalProposals.length; i++) {
        const votes = getProposalVotes(chronologicalProposals[i]);
        for (const v of votes) {
          if (i < midpoint) {
            firstHalfVoters.add(v.voterId);
          } else {
            secondHalfVoters.add(v.voterId);
          }
        }
      }

      if (firstHalfVoters.size === 0) return 0;

      let retained = 0;
      for (const voter of firstHalfVoters) {
        if (secondHalfVoters.has(voter)) {
          retained++;
        }
      }
      return retained / firstHalfVoters.size;
    }

    case 'voting_power_utilization': {
      if (proposals.length === 0) return 0;
      const fallbackSupply = getTotalVotingPower(members);
      return proposals.reduce(
        (sum, proposal) => sum + proposalTurnout(proposal, fallbackSupply),
        0
      ) / proposals.length;
    }

    // =========================================================================
    // ECONOMIC HEALTH METRICS
    // =========================================================================

    case 'treasury_volatility': {
      const treasuryHistory = history
        .map(h => h.treasuryFunds)
        .filter((value): value is number => Number.isFinite(value));
      return calculateCV(treasuryHistory);
    }

    case 'treasury_growth_rate': {
      if (history.length < 2) return 0;
      const initial = history[0]?.treasuryFunds || 0;
      const final = history[history.length - 1]?.treasuryFunds || dao.treasury?.funds || 0;
      return initial > 0 ? (final - initial) / initial : 0;
    }

    case 'emergency_topup_total': {
      return simulation.totalEmergencyTopup || 0;
    }

    case 'staking_participation': {
      let totalTokens = 0;
      let stakedTokens = 0;
      for (const m of members) {
        totalTokens += (m.tokens || 0) + (m.stakedTokens || 0);
        stakedTokens += m.stakedTokens || 0;
      }
      return totalTokens > 0 ? stakedTokens / totalTokens : 0;
    }

    case 'token_concentration_gini': {
      const holdings = members.map(m => (m.tokens || 0) + (m.stakedTokens || 0));
      return calculateGini(holdings);
    }

    case 'avg_member_wealth': {
      if (members.length === 0) return 0;
      const totalWealth = members.reduce((sum, m) =>
        sum + (m.tokens || 0) + (m.stakedTokens || 0), 0);
      return totalWealth / members.length;
    }

    case 'wealth_mobility': {
      return wealthRankMobility(simulation.initialMemberTokenBalances, members);
    }

    case 'token_conservation_error': {
      const supply = captureTokenSupply(dao);
      const expected = simulation.initialTokenSupply + supply.minted - supply.burned;
      return Math.abs(supply.total - expected);
    }

    case 'treasury_survival_indicator': {
      const balances = history
        .map(entry => entry.treasuryFunds)
        .filter((value): value is number => Number.isFinite(value));
      if (balances.length === 0) {
        const finalBalance = dao.treasury?.funds;
        return Number.isFinite(finalBalance) && finalBalance > 0 ? 1 : 0;
      }
      return balances.every(balance => balance > 0) ? 1 : 0;
    }

    case 'max_treasury_drawdown': {
      const balances = history
        .map(entry => entry.treasuryFunds)
        .filter((value): value is number => Number.isFinite(value));
      if (balances.length < 2) return 0;
      let peak = balances[0];
      let maximum = 0;
      for (const balance of balances) {
        peak = Math.max(peak, balance);
        if (peak > 0) maximum = Math.max(maximum, (peak - balance) / peak);
      }
      return maximum;
    }

    case 'treasury_recovery_time': {
      const observations = history
        .filter(entry => Number.isFinite(entry.treasuryFunds) && Number.isFinite(entry.step))
        .map(entry => ({ step: entry.step, balance: entry.treasuryFunds as number }));
      if (observations.length < 2) return 0;
      let runningPeak = observations[0].balance;
      let activePeakIndex = 0;
      let drawdownPeakIndex = 0;
      let troughIndex = 0;
      let largestDrawdown = 0;
      for (let index = 1; index < observations.length; index++) {
        if (observations[index].balance > runningPeak) {
          runningPeak = observations[index].balance;
          activePeakIndex = index;
        }
        const drawdown = runningPeak > 0
          ? (runningPeak - observations[index].balance) / runningPeak
          : 0;
        if (drawdown > largestDrawdown) {
          largestDrawdown = drawdown;
          drawdownPeakIndex = activePeakIndex;
          troughIndex = index;
        }
      }
      if (largestDrawdown === 0) return 0;
      const target = observations[drawdownPeakIndex].balance;
      const recovery = observations
        .slice(troughIndex + 1)
        .find(entry => entry.balance >= target);
      const endStep = recovery?.step ?? observations.at(-1)!.step;
      return Math.max(0, endStep - observations[troughIndex].step) * STEP_DURATION_HOURS;
    }

    // =========================================================================
    // ATTACK RESISTANCE METRICS
    // =========================================================================

    case 'whale_influence': {
      if (proposals.length === 0) return 0;

      let totalRate = 0;
      let counted = 0;

      for (const p of proposals) {
        const votes = getProposalVotes(p);
        if (votes.length === 0) {
          totalRate += 0;
          counted++;
          continue;
        }

        let whaleIds: Set<string>;
        if (p.snapshotTaken && p.votingPowerSnapshot.size > 0) {
          const snapshotHoldings = Array.from(p.votingPowerSnapshot.entries())
            .map(([memberId, power]) => ({ memberId, power }))
            .sort((a, b) => b.power - a.power);
          const top10Count = Math.max(1, Math.ceil(snapshotHoldings.length * 0.1));
          whaleIds = new Set(snapshotHoldings.slice(0, top10Count).map(m => m.memberId));
        } else {
          const sortedMembers = getMemberTokensSorted(members);
          const top10Count = Math.max(1, Math.ceil(sortedMembers.length * 0.1));
          whaleIds = new Set(sortedMembers.slice(0, top10Count).map(m => m.id));
        }

        let whaleVotes = 0;
        let totalVotes = 0;
        for (const v of votes) {
          totalVotes += v.weight;
          if (whaleIds.has(v.voterId)) {
            whaleVotes += v.weight;
          }
        }

        totalRate += totalVotes > 0 ? whaleVotes / totalVotes : 0;
        counted++;
      }

      return counted > 0 ? totalRate / counted : 0;
    }

    case 'whale_proposal_rate': {
      if (proposals.length === 0) return 0;

      const sortedMembers = getMemberTokensSorted(members);
      const top10Count = Math.max(1, Math.ceil(sortedMembers.length * 0.1));
      const whaleIds = new Set(sortedMembers.slice(0, top10Count).map(m => m.id));

      let whaleProposals = 0;
      for (const p of proposals) {
        // Fix: Proposal class uses 'creator' field
        if (whaleIds.has(p.creator)) {
          whaleProposals++;
        }
      }

      return whaleProposals / proposals.length;
    }

    case 'governance_capture_risk': {
      // Measure voting power concentration affecting outcomes
      // Calculate what % of winning vote weight came from top 10% of voters
      const memberInfluence = new Map<string, number>();
      let totalInfluence = 0;

      for (const p of proposals) {
        // Only count resolved proposals
        if (p.status !== 'approved' && p.status !== 'rejected' &&
            p.status !== 'completed') {
          continue;
        }

        const votes = getProposalVotes(p);
        const isApproved = p.status === 'approved' || p.status === 'completed';

        for (const v of votes) {
          // Did this voter vote with the winning side?
          const votedWithWinner = (v.vote && isApproved) || (!v.vote && !isApproved);

          if (votedWithWinner) {
            memberInfluence.set(v.voterId, (memberInfluence.get(v.voterId) || 0) + v.weight);
            totalInfluence += v.weight;
          }
        }
      }

      if (totalInfluence === 0) return 0;

      // Sort influences descending and calculate top 10% concentration
      const influences = Array.from(memberInfluence.values()).sort((a, b) => b - a);
      const top10Count = Math.max(1, Math.ceil(influences.length * 0.1));
      const top10Influence = influences.slice(0, top10Count).reduce((a, b) => a + b, 0);

      // Return as 0-1 scale: what fraction of "winning influence" came from top 10%
      return top10Influence / totalInfluence;
    }

    case 'vote_buying_vulnerability': {
      const closeVotes = proposals.filter(p => {
        const total = (p.votesFor || 0) + (p.votesAgainst || 0);
        if (total === 0) return false;
        const margin = Math.abs((p.votesFor || 0) - (p.votesAgainst || 0)) / total;
        return margin < 0.1;
      });

      if (closeVotes.length === 0) return 0;

      let totalFlipCost = 0;
      for (const p of closeVotes) {
        const margin = Math.abs((p.votesFor || 0) - (p.votesAgainst || 0));
        totalFlipCost += margin / 2 + 1;
      }

      return totalFlipCost / closeVotes.length;
    }

    case 'single_entity_control': {
      const totalSupply = getTotalVotingPower(members);
      if (totalSupply === 0) return 0;

      let maxPower = 0;
      for (const m of members) {
        const power = (m.tokens || 0) + (m.stakedTokens || 0);
        maxPower = Math.max(maxPower, power);
      }

      return Math.max(0, Math.min(1, maxPower / totalSupply));
    }

    case 'collusion_threshold': {
      // Apply quadratic adjustment to token holdings for collusion calculation.
      // Raw tokens overstate whale power when quadratic voting or caps are in play.
      // Using sqrt-compressed power gives a more realistic collusion metric.
      const adjustedMembers = members
        .map(m => {
          const raw = (m.tokens || 0) + (m.stakedTokens || 0);
          // Sqrt compression reflects diminishing marginal voting power
          return { id: m.uniqueId, power: Math.sqrt(Math.max(0, raw)) };
        })
        .sort((a, b) => b.power - a.power);

      const totalPower = adjustedMembers.reduce((s, m) => s + m.power, 0);
      if (totalPower === 0 || adjustedMembers.length === 0) return 1;

      let accumulated = 0;
      let count = 0;

      for (const m of adjustedMembers) {
        accumulated += m.power;
        count++;
        if (accumulated > totalPower / 2) {
          break;
        }
      }

      return count / members.length;
    }

    // =========================================================================
    // TEMPORAL DYNAMICS METRICS
    // =========================================================================

    case 'participation_trend': {
      if (proposals.length < 2) return 0;

      const totalSupply = getTotalVotingPower(members);
      if (totalSupply === 0) return 0;

      const participationOverTime = proposals.map(p => {
        const votes = getProposalVotes(p);
        return votes.reduce((sum, v) => sum + v.weight, 0) / totalSupply;
      });

      return calculateSlope(participationOverTime);
    }

    case 'treasury_trend': {
      const treasuryHistory = history.map(h => h.treasuryFunds || 0);
      return calculateSlope(treasuryHistory);
    }

    case 'member_growth_rate': {
      if (history.length < 2) return 0;
      const initial = history[0]?.memberCount || members.length;
      const final = history[history.length - 1]?.memberCount || members.length;
      return initial > 0 ? (final - initial) / initial : 0;
    }

    case 'proposal_rate': {
      const steps = simulation.currentStep || 1;
      return (proposals.length / steps) * 100;
    }

    case 'governance_activity_index': {
      const stats = getProposalStats(proposals);
      const resolved = stats.passed + stats.rejected;
      const resolutionRate = stats.total > 0 ? resolved / stats.total : 0;

      const fallbackSupply = getTotalVotingPower(members);
      const avgParticipation = proposals.length > 0
        ? proposals.reduce(
            (sum, proposal) => sum + proposalTurnout(proposal, fallbackSupply),
            0
          ) / proposals.length
        : 0;

      const steps = simulation.currentStep || 1;
      const proposalsPer100Steps = (proposals.length / steps) * 100;

      return proposalsPer100Steps * avgParticipation * resolutionRate;
    }

    // =========================================================================
    // LLM AGENT METRICS
    // =========================================================================

    case 'llm_vote_consistency': {
      // % of LLM votes that match what rule-based voting would have chosen
      const { LLMAgent } = require('../../lib/agents/llm-agent');
      const llmAgents = members.filter((m: any) => m instanceof LLMAgent && m.llmVoting);
      if (llmAgents.length === 0) return 0;

      let totalDecisions = 0;
      let matchingDecisions = 0;
      for (const agent of llmAgents) {
        const llm = agent as any;
        if (!llm.llmVoting) continue;
        const history = llm.llmVoting.voteHistory || [];
        for (const record of history) {
          if (record.decision.vote === 'abstain') continue;
          totalDecisions++;
          // Compare with what rule-based would have done
          const proposal = proposals.find((p: any) => p.uniqueId === record.proposalId);
          if (proposal) {
            const ruleVote = llm.optimism > 0.5 ? 'yes' : 'no';
            if (record.decision.vote === ruleVote) matchingDecisions++;
          }
        }
      }
      return totalDecisions > 0 ? matchingDecisions / totalDecisions : 0;
    }

    case 'llm_cache_hit_rate': {
      if (!simulation.llmCache) return 0;
      const cacheStats = simulation.llmCache.stats;
      return cacheStats.hitRate;
    }

    case 'llm_avg_latency_ms': {
      if (!simulation.ollamaClient) return 0;
      return simulation.ollamaClient.avgLatencyMs;
    }

    default:
      return 0;
  }
}

/**
 * Extract a custom metric using an expression
 */
