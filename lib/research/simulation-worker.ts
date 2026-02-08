/**
 * Simulation Worker
 *
 * Worker thread script that runs individual simulations.
 * Communicates with main thread via message passing.
 */

import { parentPort, workerData } from 'worker_threads';
import { DAOSimulation } from '../engine/simulation';
import { resolveSimulationConfig, type ResearchConfig } from './config-resolver';
import { setSeed } from '../utils/random';
import type { RunResult, MetricConfig, BuiltinMetricType, TimelineEntry, SimulationOverrides } from './experiment-config';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkerTask {
  taskId: number;
  config: ResearchConfig;
  simConfig: SimulationOverrides;
  seed: number;
  stepsPerRun: number;
  metrics: MetricConfig[];
  includeTimeline: boolean;
  sweepValue?: number | string | boolean;
  runIndex: number;
  experimentName: string;
}

export interface WorkerResult {
  taskId: number;
  success: boolean;
  result?: RunResult;
  error?: string;
}

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
    .map(m => ({ id: m.uniqueId, tokens: (m.tokens || 0) + (m.stakedTokens || 0) }))
    .sort((a, b) => b.tokens - a.tokens);
}

// =============================================================================
// WORKER IMPLEMENTATION
// =============================================================================

if (parentPort) {
  const port = parentPort;

  port.on('message', async (task: WorkerTask) => {
    try {
      const result = await runSimulation(task);
      port.postMessage({
        taskId: task.taskId,
        success: true,
        result,
      } as WorkerResult);
    } catch (error) {
      port.postMessage({
        taskId: task.taskId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as WorkerResult);
    }
  });
}

/**
 * Run a single simulation in the worker
 */
async function runSimulation(task: WorkerTask): Promise<RunResult> {
  const runStartTime = Date.now();

  // Set random seed for reproducibility
  setSeed(task.seed);

  // Convert to simulation config
  const simConfig = resolveSimulationConfig(task.config, task.seed, task.simConfig);

  // Create and run simulation
  const simulation = new DAOSimulation(simConfig);
  await simulation.run(task.stepsPerRun);

  // Signal end of learning episode (decays exploration, increments episode counts)
  simulation.endLearningEpisode();

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
    config: simConfig,
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
  // Explicit builtin metric
  if (metricConfig.type === 'builtin' && metricConfig.builtin) {
    return extractBuiltinMetric(simulation, metricConfig.builtin);
  }

  // Custom expression metric
  if (metricConfig.type === 'custom' && metricConfig.expression) {
    return extractCustomMetric(simulation, metricConfig.expression);
  }

  // If no type specified, try to infer from name as builtin
  if (!metricConfig.type && metricConfig.name) {
    const builtinName = metricConfig.name.toLowerCase().replace(/\s+/g, '_') as BuiltinMetricType;
    try {
      return extractBuiltinMetric(simulation, builtinName);
    } catch {
      // Not a valid builtin metric, fall through to return 0
    }
  }

  return 0;
}

/**
 * Extract a builtin metric - comprehensive implementation matching fork-worker.ts
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
      return dao.treasury?.getTokenBalance?.('DAO_TOKEN') ?? dao.treasury?.funds ?? 0;

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
      if (proposals.length === 0) return 0;
      const totalSupply = getTotalVotingPower(members);
      const quorumThreshold = (simulation as any).governanceRule?.quorumPercentage
        ?? simulation.dao?.votingPowerPolicy?.capFraction
        ?? 0.04;

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
      const resolvedProposals = proposals.filter(p =>
        p.status === 'approved' || p.status === 'completed' ||
        p.status === 'rejected' ||
        p.status === 'expired'
      );
      if (resolvedProposals.length === 0) return 0;

      let totalTime = 0;
      for (const p of resolvedProposals) {
        const creationTime = p.creationTime || 0;
        const resolvedTime = p.resolvedTime ?? simulation.currentStep;
        totalTime += resolvedTime - creationTime;
      }
      return totalTime / resolvedProposals.length;
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
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        for (const v of votes) {
          voterCounts.set(v.voterId, (voterCounts.get(v.voterId) || 0) + 1);
        }
      }

      const allMemberVotes = members.map(m => voterCounts.get(m.uniqueId) || 0);
      return calculateGini(allMemberVotes);
    }

    case 'delegate_concentration': {
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
      const totalSupply = getTotalVotingPower(members);
      if (totalSupply === 0 || proposals.length === 0) return 0;

      let totalUsed = 0;
      for (const p of proposals) {
        const votes = getProposalVotes(p);
        totalUsed += votes.reduce((sum, v) => sum + v.weight, 0);
      }

      return totalUsed / (totalSupply * proposals.length);
    }

    // =========================================================================
    // ECONOMIC HEALTH METRICS
    // =========================================================================

    case 'treasury_volatility': {
      const treasuryHistory = history.map(h => h.treasuryFunds || 0);
      return calculateCV(treasuryHistory);
    }

    case 'treasury_growth_rate': {
      if (history.length < 2) return 0;
      const initial = history[0]?.treasuryFunds || 0;
      const final = history[history.length - 1]?.treasuryFunds || dao.treasury?.funds || 0;
      return initial > 0 ? (final - initial) / initial : 0;
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
      const holdings = getMemberTokensSorted(members);
      if (holdings.length < 2) return 0;

      const gini = calculateGini(holdings.map(h => h.tokens));
      return 1 - gini;
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
        if (whaleIds.has(p.creator)) {
          whaleProposals++;
        }
      }

      return whaleProposals / proposals.length;
    }

    case 'governance_capture_risk': {
      const memberInfluence = new Map<string, number>();
      let totalInfluence = 0;

      for (const p of proposals) {
        if (p.status !== 'approved' && p.status !== 'rejected' &&
            p.status !== 'completed') {
          continue;
        }

        const votes = getProposalVotes(p);
        const isApproved = p.status === 'approved' || p.status === 'completed';

        for (const v of votes) {
          const votedWithWinner = (v.vote && isApproved) || (!v.vote && !isApproved);

          if (votedWithWinner) {
            memberInfluence.set(v.voterId, (memberInfluence.get(v.voterId) || 0) + v.weight);
            totalInfluence += v.weight;
          }
        }
      }

      if (totalInfluence === 0) return 0;

      const influences = Array.from(memberInfluence.values()).sort((a, b) => b - a);
      const top10Count = Math.max(1, Math.ceil(influences.length * 0.1));
      const top10Influence = influences.slice(0, top10Count).reduce((a, b) => a + b, 0);

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

      return proposalRate * avgParticipation * resolutionRate;
    }

    case 'emergency_topup_total':
      return (simulation as any).totalEmergencyTopup || 0;

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

  const modelVarsByStep = new Map<number, any>();
  for (const mv of modelVars) {
    modelVarsByStep.set(mv.step, mv);
  }

  return history.map((entry) => {
    const mv = modelVarsByStep.get(entry.step);
    return {
      step: entry.step,
      memberCount: entry.memberCount,
      proposalCount: entry.proposalCount,
      projectCount: entry.projectCount,
      tokenPrice: entry.tokenPrice,
      treasuryFunds: entry.treasuryFunds,
      gini: mv?.gini ?? 0,
      reputationGini: mv?.repGini ?? 0,
    };
  });
}
