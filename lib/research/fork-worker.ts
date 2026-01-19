/**
 * Fork Worker
 *
 * Child process script for parallel simulation execution.
 * Designed for use with child_process.fork() for better TypeScript compatibility.
 *
 * Includes comprehensive metric extraction for academic research validity.
 */

import { DAOSimulation, type DAOSimulationConfig } from '../engine/simulation';
import { toSimulationConfig } from '../dao-designer/builder';
import { setSeed } from '../utils/random';
import type { RunResult, MetricConfig, BuiltinMetricType, TimelineEntry } from './experiment-config';
import type { WorkerTask, WorkerResult } from './simulation-worker';

// =============================================================================
// PROCESS MESSAGE HANDLER
// =============================================================================

process.on('message', async (task: WorkerTask) => {
  try {
    const result = await runSimulation(task);
    process.send!({
      taskId: task.taskId,
      success: true,
      result,
    } as WorkerResult);
  } catch (error) {
    process.send!({
      taskId: task.taskId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResult);
  }
});

// Signal ready
process.send?.({ type: 'ready' });

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
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
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
 * Get proposal statuses categorized
 */
interface ProposalStats {
  total: number;
  passed: number;
  rejected: number;
  open: number;
  expired: number;
}

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
    if (status === 'approved' || status === 'passed' || status === 'executed') {
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
 * Get voting data from a proposal
 */
interface VoteData {
  voterId: string;
  vote: boolean;
  weight: number;
}

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
    .map(m => ({ id: m.uniqueId || m.id, tokens: (m.tokens || 0) + (m.stakedTokens || 0) }))
    .sort((a, b) => b.tokens - a.tokens);
}

// =============================================================================
// MAIN SIMULATION RUNNER
// =============================================================================

/**
 * Run a single simulation
 */
async function runSimulation(task: WorkerTask): Promise<RunResult> {
  const runStartTime = Date.now();

  // Set random seed for reproducibility
  setSeed(task.seed);

  // Convert to simulation config
  const simConfig = toSimulationConfig(task.daoConfig);
  simConfig.seed = task.seed;

  // Apply simulation overrides
  if (task.simConfig.checkpointInterval !== undefined) {
    simConfig.checkpointInterval = task.simConfig.checkpointInterval;
  }
  if (task.simConfig.eventLogging !== undefined) {
    simConfig.eventLogging = task.simConfig.eventLogging;
  }

  // Disable IndexedDB for workers
  simConfig.useIndexedDB = false;

  // Create and run simulation
  const simulation = new DAOSimulation(simConfig);
  await simulation.run(task.stepsPerRun);

  // Collect metrics
  const metrics = collectMetrics(simulation, task.metrics);

  // Collect timeline if requested
  let timeline: TimelineEntry[] | undefined;
  if (task.includeTimeline) {
    timeline = collectTimeline(simulation);
  }

  const runEndTime = Date.now();

  // Build run ID
  const sweepPart = task.sweepValue !== undefined ? `-${String(task.sweepValue).replace(/\./g, '_')}` : '';
  const runId = `${task.experimentName}${sweepPart}-run-${String(task.runIndex + 1).padStart(3, '0')}`;

  return {
    runId,
    experimentName: task.experimentName,
    sweepValue: task.sweepValue,
    runIndex: task.runIndex,
    config: task.daoConfig,
    seed: task.seed,
    metrics,
    timeline,
    startedAt: new Date(runStartTime).toISOString(),
    completedAt: new Date(runEndTime).toISOString(),
    durationMs: runEndTime - runStartTime,
    stepsCompleted: task.stepsPerRun,
  };
}

/**
 * Collect metrics from a completed simulation
 */
function collectMetrics(simulation: DAOSimulation, metricConfigs: MetricConfig[]): Record<string, number> {
  const metrics: Record<string, number> = {};

  for (const metricConfig of metricConfigs) {
    const value = extractMetric(simulation, metricConfig);
    metrics[metricConfig.name] = value;
  }

  return metrics;
}

/**
 * Extract a single metric from the simulation
 */
function extractMetric(simulation: DAOSimulation, metricConfig: MetricConfig): number {
  if (metricConfig.type === 'builtin' && metricConfig.builtin) {
    return extractBuiltinMetric(simulation, metricConfig.builtin);
  }

  if (metricConfig.type === 'custom' && metricConfig.expression) {
    return extractCustomMetric(simulation, metricConfig.expression);
  }

  return 0;
}

// =============================================================================
// BUILTIN METRIC EXTRACTION
// =============================================================================

/**
 * Extract a builtin metric - comprehensive implementation
 */
function extractBuiltinMetric(simulation: DAOSimulation, metric: BuiltinMetricType): number {
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
      if (totalSupply === 0) return 0;

      let totalTurnout = 0;
      for (const proposal of proposals) {
        const votes = getProposalVotes(proposal);
        const votingPower = votes.reduce((sum, v) => sum + v.weight, 0);
        totalTurnout += votingPower / totalSupply;
      }
      return totalTurnout / proposals.length;
    }

    case 'final_treasury':
      return dao.treasury?.funds ?? 0;

    case 'final_token_price':
      return dao.treasury?.getTokenPrice?.('DAO_TOKEN') ?? 1;

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

    // =========================================================================
    // GOVERNANCE EFFICIENCY METRICS
    // =========================================================================

    case 'quorum_reach_rate': {
      // % of proposals that had enough participation to potentially pass
      if (proposals.length === 0) return 0;
      const totalSupply = getTotalVotingPower(members);
      const quorumThreshold = 0.04; // Default 4% quorum

      let quorumMet = 0;
      for (const proposal of proposals) {
        const votes = getProposalVotes(proposal);
        const votingPower = votes.reduce((sum, v) => sum + v.weight, 0);
        if (votingPower / totalSupply >= quorumThreshold) {
          quorumMet++;
        }
      }
      return quorumMet / proposals.length;
    }

    case 'avg_margin_of_victory': {
      // Average |votesFor - votesAgainst| / totalVotes
      const resolvedProposals = proposals.filter(p =>
        p.status === 'approved' || p.status === 'passed' ||
        p.status === 'executed' || p.status === 'rejected'
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
      // Average steps from creation to resolution
      const resolvedProposals = proposals.filter(p =>
        p.status === 'approved' || p.status === 'passed' ||
        p.status === 'executed' || p.status === 'rejected'
      );
      if (resolvedProposals.length === 0) return 0;

      let totalTime = 0;
      for (const p of resolvedProposals) {
        const creationTime = p.creationTime || 0;
        const resolvedTime = p.resolvedTime || p.executedTime || simulation.currentStep;
        totalTime += resolvedTime - creationTime;
      }
      return totalTime / resolvedProposals.length;
    }

    case 'proposal_abandonment_rate': {
      // % of proposals that expired without resolution
      const stats = getProposalStats(proposals);
      if (stats.total === 0) return 0;
      return (stats.expired + stats.open) / stats.total;
    }

    case 'proposal_rejection_rate': {
      // % of resolved proposals that were rejected
      const stats = getProposalStats(proposals);
      const resolved = stats.passed + stats.rejected;
      return resolved > 0 ? stats.rejected / resolved : 0;
    }

    case 'governance_overhead': {
      // Total votes cast / proposals resolved
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
      // Number of distinct members who voted at least once
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
      // unique_voters / total_members
      const uniqueVoters = new Set<string>();
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        for (const v of votes) {
          uniqueVoters.add(v.voterId);
        }
      }
      return members.length > 0 ? uniqueVoters.size / members.length : 0;
    }

    case 'voter_concentration_gini': {
      // Gini coefficient of voting activity (votes cast per member)
      const voterCounts = new Map<string, number>();
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        for (const v of votes) {
          voterCounts.set(v.voterId, (voterCounts.get(v.voterId) || 0) + 1);
        }
      }

      // Include non-voters as 0
      const allMemberVotes = members.map(m => voterCounts.get(m.uniqueId || m.id) || 0);
      return calculateGini(allMemberVotes);
    }

    case 'delegate_concentration': {
      // % of total votes controlled by top 10% of voters (by voting power used)
      const voterPower = new Map<string, number>();
      let totalPower = 0;

      for (const p of proposals) {
        const votes = getProposalVotes(p);
        for (const v of votes) {
          voterPower.set(v.voterId, (voterPower.get(v.voterId) || 0) + v.weight);
          totalPower += v.weight;
        }
      }

      if (totalPower === 0) return 0;

      const sortedPowers = Array.from(voterPower.values()).sort((a, b) => b - a);
      const top10Count = Math.max(1, Math.ceil(sortedPowers.length * 0.1));
      const top10Power = sortedPowers.slice(0, top10Count).reduce((a, b) => a + b, 0);

      return top10Power / totalPower;
    }

    case 'avg_votes_per_proposal': {
      // Average number of unique voters per proposal
      if (proposals.length === 0) return 0;

      let totalVoters = 0;
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        totalVoters += votes.length;
      }
      return totalVoters / proposals.length;
    }

    case 'voter_retention_rate': {
      // % of voters who voted in both first and last half of proposals
      if (proposals.length < 2) return 0;

      const midpoint = Math.floor(proposals.length / 2);
      const firstHalfVoters = new Set<string>();
      const secondHalfVoters = new Set<string>();

      for (let i = 0; i < proposals.length; i++) {
        const votes = getProposalVotes(proposals[i]);
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
      // % of total voting power actually used across all proposals
      const totalSupply = getTotalVotingPower(members);
      if (totalSupply === 0 || proposals.length === 0) return 0;

      let totalUsed = 0;
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        totalUsed += votes.reduce((sum, v) => sum + v.weight, 0);
      }

      // Normalize by number of proposals (max utilization = 1 per proposal)
      return totalUsed / (totalSupply * proposals.length);
    }

    // =========================================================================
    // ECONOMIC HEALTH METRICS
    // =========================================================================

    case 'treasury_volatility': {
      // Coefficient of variation of treasury over time
      const treasuryHistory = history.map(h => h.treasuryFunds || 0);
      return calculateCV(treasuryHistory);
    }

    case 'treasury_growth_rate': {
      // (final - initial) / initial
      if (history.length < 2) return 0;
      const initial = history[0]?.treasuryFunds || 0;
      const final = history[history.length - 1]?.treasuryFunds || dao.treasury?.funds || 0;
      return initial > 0 ? (final - initial) / initial : 0;
    }

    case 'staking_participation': {
      // stakedTokens / totalTokens
      let totalTokens = 0;
      let stakedTokens = 0;
      for (const m of members) {
        totalTokens += (m.tokens || 0) + (m.stakedTokens || 0);
        stakedTokens += m.stakedTokens || 0;
      }
      return totalTokens > 0 ? stakedTokens / totalTokens : 0;
    }

    case 'token_concentration_gini': {
      // Same as final_gini but explicit
      const holdings = members.map(m => (m.tokens || 0) + (m.stakedTokens || 0));
      return calculateGini(holdings);
    }

    case 'avg_member_wealth': {
      // Average tokens per member
      if (members.length === 0) return 0;
      const totalWealth = members.reduce((sum, m) =>
        sum + (m.tokens || 0) + (m.stakedTokens || 0), 0);
      return totalWealth / members.length;
    }

    case 'wealth_mobility': {
      // How much token rankings changed (requires tracking initial state)
      // Approximation: measure current Gini vs theoretical max change
      // 0 = no mobility, 1 = complete reshuffling
      const holdings = getMemberTokensSorted(members);
      if (holdings.length < 2) return 0;

      // Use inverse of rank correlation as proxy
      // Higher Gini = less mobility typically
      const gini = calculateGini(holdings.map(h => h.tokens));
      return 1 - gini; // Simplified: high inequality = low mobility
    }

    // =========================================================================
    // ATTACK RESISTANCE METRICS
    // =========================================================================

    case 'whale_influence': {
      // % of total votes from top 10% token holders
      const sortedMembers = getMemberTokensSorted(members);
      const top10Count = Math.max(1, Math.ceil(sortedMembers.length * 0.1));
      const whaleIds = new Set(sortedMembers.slice(0, top10Count).map(m => m.id));

      let whaleVotes = 0;
      let totalVotes = 0;

      for (const p of proposals) {
        const votes = getProposalVotes(p);
        for (const v of votes) {
          totalVotes += v.weight;
          if (whaleIds.has(v.voterId)) {
            whaleVotes += v.weight;
          }
        }
      }

      return totalVotes > 0 ? whaleVotes / totalVotes : 0;
    }

    case 'whale_proposal_rate': {
      // % of proposals created by top 10% holders
      if (proposals.length === 0) return 0;

      const sortedMembers = getMemberTokensSorted(members);
      const top10Count = Math.max(1, Math.ceil(sortedMembers.length * 0.1));
      const whaleIds = new Set(sortedMembers.slice(0, top10Count).map(m => m.id));

      let whaleProposals = 0;
      for (const p of proposals) {
        if (whaleIds.has(p.proposer || p.createdBy)) {
          whaleProposals++;
        }
      }

      return whaleProposals / proposals.length;
    }

    case 'governance_capture_risk': {
      // Concentration of proposal creation (Gini of proposals per member)
      const proposerCounts = new Map<string, number>();
      for (const p of proposals) {
        const proposer = p.proposer || p.createdBy || 'unknown';
        proposerCounts.set(proposer, (proposerCounts.get(proposer) || 0) + 1);
      }

      // Include non-proposers as 0
      const allMemberProposals = members.map(m =>
        proposerCounts.get(m.uniqueId || m.id) || 0
      );
      return calculateGini(allMemberProposals);
    }

    case 'vote_buying_vulnerability': {
      // Average tokens needed to flip a close vote (< 10% margin)
      const closeVotes = proposals.filter(p => {
        const total = (p.votesFor || 0) + (p.votesAgainst || 0);
        if (total === 0) return false;
        const margin = Math.abs((p.votesFor || 0) - (p.votesAgainst || 0)) / total;
        return margin < 0.1;
      });

      if (closeVotes.length === 0) return 0;

      let totalFlipCost = 0;
      for (const p of closeVotes) {
        // Tokens needed to flip = margin / 2 + 1
        const margin = Math.abs((p.votesFor || 0) - (p.votesAgainst || 0));
        totalFlipCost += margin / 2 + 1;
      }

      return totalFlipCost / closeVotes.length;
    }

    case 'single_entity_control': {
      // Max % of votes any single member could cast
      const totalSupply = getTotalVotingPower(members);
      if (totalSupply === 0) return 0;

      let maxPower = 0;
      for (const m of members) {
        const power = (m.tokens || 0) + (m.stakedTokens || 0);
        maxPower = Math.max(maxPower, power);
      }

      return maxPower / totalSupply;
    }

    case 'collusion_threshold': {
      // Min % of members needed to control >50% of votes
      const sortedMembers = getMemberTokensSorted(members);
      const totalSupply = getTotalVotingPower(members);
      if (totalSupply === 0 || sortedMembers.length === 0) return 1;

      let accumulated = 0;
      let count = 0;

      for (const m of sortedMembers) {
        accumulated += m.tokens;
        count++;
        if (accumulated > totalSupply / 2) {
          break;
        }
      }

      return count / members.length;
    }

    // =========================================================================
    // TEMPORAL DYNAMICS METRICS
    // =========================================================================

    case 'participation_trend': {
      // Slope of participation over time
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
      // Slope of treasury over time
      const treasuryHistory = history.map(h => h.treasuryFunds || 0);
      return calculateSlope(treasuryHistory);
    }

    case 'member_growth_rate': {
      // (final - initial) / initial members
      if (history.length < 2) return 0;
      const initial = history[0]?.memberCount || members.length;
      const final = history[history.length - 1]?.memberCount || members.length;
      return initial > 0 ? (final - initial) / initial : 0;
    }

    case 'proposal_rate': {
      // Proposals per 100 steps
      const steps = simulation.currentStep || 1;
      return (proposals.length / steps) * 100;
    }

    case 'governance_activity_index': {
      // Composite: normalized(proposals) * participation * resolution_rate
      const stats = getProposalStats(proposals);
      const resolved = stats.passed + stats.rejected;
      const resolutionRate = stats.total > 0 ? resolved / stats.total : 0;

      const totalSupply = getTotalVotingPower(members);
      let avgParticipation = 0;
      if (proposals.length > 0 && totalSupply > 0) {
        for (const p of proposals) {
          const votes = getProposalVotes(p);
          avgParticipation += votes.reduce((sum, v) => sum + v.weight, 0) / totalSupply;
        }
        avgParticipation /= proposals.length;
      }

      const steps = simulation.currentStep || 1;
      const proposalRate = proposals.length / steps;

      // Combine into composite index (all 0-1 range)
      return proposalRate * avgParticipation * resolutionRate;
    }

    default:
      return 0;
  }
}

/**
 * Extract a custom metric using an expression
 */
function extractCustomMetric(simulation: DAOSimulation, expression: string): number {
  try {
    const dao = simulation.dao;
    const dataCollector = simulation.dataCollector;
    const proposals = dao.proposals;
    const members = dao.members;

    // eslint-disable-next-line no-new-func
    const fn = new Function('dao', 'dataCollector', 'proposals', 'members', `return ${expression}`);
    const result = fn(dao, dataCollector, proposals, members);

    return typeof result === 'number' ? result : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Collect timeline data from simulation
 */
function collectTimeline(simulation: DAOSimulation): TimelineEntry[] {
  const history = simulation.dataCollector.history;
  const modelVars = simulation.dataCollector.modelVars;

  return history.map((entry, index) => ({
    step: entry.step,
    memberCount: entry.memberCount,
    proposalCount: entry.proposalCount,
    projectCount: entry.projectCount,
    tokenPrice: entry.tokenPrice,
    treasuryFunds: entry.treasuryFunds,
    gini: modelVars[index]?.gini ?? 0,
    reputationGini: modelVars[index]?.repGini ?? 0,
  }));
}
