/**
 * Accuracy Metrics
 *
 * Statistical comparison functions for validating calibrated simulations
 * against historical data from CalibrationProfiles.
 */

import type { CalibrationProfile } from '../digital-twins/calibration-loader';

// =============================================================================
// TYPES
// =============================================================================

export interface AccuracyReport {
  dao_id: string;
  period: { start: string; end: string };
  metrics: {
    proposal_frequency_error: number;
    pass_rate_error: number;
    participation_rate_error: number;
    price_level_error: number;
    voter_concentration_error: number;
    forum_activity_error: number;
  };
  overall_score: number; // 0-1, where 1 = perfect match
  details: Record<string, number>;
  /** Error dimensions backed by observations in both prediction and target. */
  available_metrics?: AccuracyMetricId[];
}

export type AccuracyMetricId = keyof AccuracyReport['metrics'];

export interface SimulationMetrics {
  proposalsPerMonth: number | null;
  passRate: number | null;
  participationRate: number | null;
  priceHistory: number[];
  voterConcentration: number | null;
  forumTopicsPerMonth: number | null;
  totalSteps: number;
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Calculate relative error: |simulated - actual| / max(actual, epsilon)
 */
function relativeError(simulated: number, actual: number, epsilon: number = 0.01): number {
  return Math.abs(simulated - actual) / Math.max(Math.abs(actual), epsilon);
}

/**
 * Calculate RMSE between two price series
 */
function priceLevelError(simPrices: number[], historicalAvgPrice: number): number {
  if (simPrices.length === 0) return 1.0;

  const simAvg = simPrices.reduce((a, b) => a + b, 0) / simPrices.length;
  // Compare average price level rather than point-by-point (since sim is stochastic)
  return relativeError(simAvg, historicalAvgPrice);
}

/** Symmetric relative error, bounded to [0, 1], for non-negative count rates. */
function symmetricRateError(simulated: number, actual: number): number {
  if (!Number.isFinite(simulated) || !Number.isFinite(actual)) return 1;
  if (simulated === 0 && actual === 0) return 0;
  return Math.min(
    1,
    (2 * Math.abs(simulated - actual))
      / Math.max(Math.abs(simulated) + Math.abs(actual), Number.EPSILON)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Calculate Gini coefficient for a set of values
 */
function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1) * sorted[i];
  }

  return Math.max(0, Math.min(1, (2 * numerator) / (n * sum) - (n + 1) / n));
}

// =============================================================================
// MAIN COMPARISON
// =============================================================================

/**
 * Compare simulation results against a historical CalibrationProfile.
 * Returns an AccuracyReport with per-metric errors and an overall score.
 */
export function compareToHistorical(
  simResults: SimulationMetrics,
  historicalProfile: CalibrationProfile
): AccuracyReport {
  const metrics: AccuracyReport['metrics'] = {
    proposal_frequency_error: 0,
    pass_rate_error: 0,
    participation_rate_error: 0,
    price_level_error: 0,
    voter_concentration_error: 0,
    forum_activity_error: 0,
  };

  const details: Record<string, number> = {};

  // 1. Proposal frequency error
  const histProposalsPerMonth = historicalProfile.proposals.avg_proposals_per_month;
  if (isFiniteNumber(histProposalsPerMonth)) {
    metrics.proposal_frequency_error = isFiniteNumber(simResults.proposalsPerMonth)
      ? symmetricRateError(simResults.proposalsPerMonth, histProposalsPerMonth)
      : 1;
    if (isFiniteNumber(simResults.proposalsPerMonth)) {
      details['sim_proposals_per_month'] = simResults.proposalsPerMonth;
    }
    details['hist_proposals_per_month'] = histProposalsPerMonth;
  }

  // 2. Pass rate error
  const histPassRate = historicalProfile.proposals.pass_rate;
  if (isFiniteNumber(histPassRate)) {
    metrics.pass_rate_error = isFiniteNumber(simResults.passRate)
      ? relativeError(simResults.passRate, histPassRate)
      : 1;
    if (isFiniteNumber(simResults.passRate)) {
      details['sim_pass_rate'] = simResults.passRate;
    }
    details['hist_pass_rate'] = histPassRate;
  }

  // 3. Participation rate error
  const histParticipation = historicalProfile.voting.avg_participation_rate;
  if (isFiniteNumber(histParticipation)) {
    metrics.participation_rate_error = isFiniteNumber(simResults.participationRate)
      ? relativeError(simResults.participationRate, histParticipation)
      : 1;
    if (isFiniteNumber(simResults.participationRate)) {
      details['sim_participation_rate'] = simResults.participationRate;
    }
    details['hist_participation_rate'] = histParticipation;
  }

  // 4. Mean price-level relative error (profiles do not contain a trajectory).
  if (historicalProfile.market) {
    metrics.price_level_error = priceLevelError(
      simResults.priceHistory,
      historicalProfile.market.avg_price_usd
    );
    details['sim_avg_price'] = simResults.priceHistory.length > 0
      ? simResults.priceHistory.reduce((a, b) => a + b, 0) / simResults.priceHistory.length
      : 0;
    details['hist_avg_price'] = historicalProfile.market.avg_price_usd;
  }

  // 5. Voter concentration error
  const histConcentration = historicalProfile.voting.voter_concentration;
  if (isFiniteNumber(histConcentration)) {
    metrics.voter_concentration_error = isFiniteNumber(simResults.voterConcentration)
      ? relativeError(simResults.voterConcentration, histConcentration)
      : 1;
    if (isFiniteNumber(simResults.voterConcentration)) {
      details['sim_voter_concentration'] = simResults.voterConcentration;
    }
    details['hist_voter_concentration'] = histConcentration;
  }

  // 6. Forum activity error
  if (
    historicalProfile.forum
    && isFiniteNumber(historicalProfile.forum.avg_topics_per_month)
  ) {
    const histForum = historicalProfile.forum.avg_topics_per_month;
    metrics.forum_activity_error = isFiniteNumber(simResults.forumTopicsPerMonth)
      ? symmetricRateError(simResults.forumTopicsPerMonth, histForum)
      : 1;
    if (isFiniteNumber(simResults.forumTopicsPerMonth)) {
      details['sim_forum_topics_per_month'] = simResults.forumTopicsPerMonth;
    }
    details['hist_forum_topics_per_month'] = histForum;
  }

  // Calculate overall score (weighted average of 1 - error, clamped to [0, 1]).
  // If a metric is unavailable, skip it and redistribute its weight.
  const baseWeights: Record<string, number> = {
    proposal_frequency: 0.25,
    pass_rate: 0.20,
    participation_rate: 0.20,
    price_level: 0.15,
    voter_concentration: 0.10,
    forum_activity: 0.10,
  };

  const metricScores: Record<string, number> = {
    proposal_frequency: 1 - Math.min(metrics.proposal_frequency_error, 1),
    pass_rate: 1 - Math.min(metrics.pass_rate_error, 1),
    participation_rate: 1 - Math.min(metrics.participation_rate_error, 1),
    price_level: 1 - Math.min(metrics.price_level_error, 1),
    voter_concentration: 1 - Math.min(metrics.voter_concentration_error, 1),
    forum_activity: 1 - Math.min(metrics.forum_activity_error, 1),
  };

  // Skip only unavailable metrics. Empirical zero is a valid observation.
  const skipMetrics = new Set<string>();
  if (!isFiniteNumber(histProposalsPerMonth)) {
    skipMetrics.add('proposal_frequency');
  }
  if (!isFiniteNumber(histPassRate)) {
    skipMetrics.add('pass_rate');
  }
  if (!isFiniteNumber(histParticipation)) {
    skipMetrics.add('participation_rate');
  }
  if (!historicalProfile.market) {
    skipMetrics.add('price_level');
  }
  if (
    !historicalProfile.forum
    || !isFiniteNumber(historicalProfile.forum.avg_topics_per_month)
  ) {
    skipMetrics.add('forum_activity');
  }
  if (!isFiniteNumber(histConcentration)) {
    skipMetrics.add('voter_concentration');
  }

  // Compute active weight sum and redistribute
  let activeWeightSum = 0;
  for (const [key, weight] of Object.entries(baseWeights)) {
    if (!skipMetrics.has(key)) activeWeightSum += weight;
  }

  let overall_score = 0;
  if (activeWeightSum > 0) {
    for (const [key, weight] of Object.entries(baseWeights)) {
      if (!skipMetrics.has(key)) {
        overall_score += (weight / activeWeightSum) * metricScores[key];
      }
    }
  }
  overall_score = Math.max(0, Math.min(1, overall_score));

  return {
    dao_id: historicalProfile.dao_id,
    period: { start: 'simulation', end: 'simulation' },
    metrics,
    overall_score,
    details,
    available_metrics: (
      Object.keys(metrics) as AccuracyMetricId[]
    ).filter(metric => !skipMetrics.has(metric.replace(/_error$/, ''))),
  };
}

/**
 * Extract SimulationMetrics from a completed simulation's data collector.
 * Accepts an optional proposals array to compute actual pass rate and participation.
 */
export function extractSimulationMetrics(
  dataCollector: {
    modelVars: Array<{
      step: number; price: number; numProposals: number; numMembers: number; gini: number;
      forumTopics?: number; proposalsApproved?: number; proposalsRejected?: number;
      proposalsExpired?: number; avgParticipationRate?: number;
    }>;
  },
  totalSteps: number,
  proposals?: Array<{ status: string; votes?: Map<string, unknown> }>,
  memberCount?: number
): SimulationMetrics {
  const modelVars = dataCollector.modelVars;

  // Price history
  const priceHistory = modelVars.map(mv => mv.price);

  // Proposal frequency: total proposals / months simulated
  const totalProposals = modelVars.length > 0
    ? modelVars[modelVars.length - 1].numProposals
    : 0;
  const monthsSimulated = totalSteps / (30 * 24); // 24 steps per day
  const proposalsPerMonth = monthsSimulated > 0 ? totalProposals / monthsSimulated : null;

  // Forum topics per month
  const finalForumTopics = modelVars.at(-1)?.forumTopics;
  const forumTopicsPerMonth = monthsSimulated > 0 && typeof finalForumTopics === 'number'
    ? finalForumTopics / monthsSimulated
    : null;

  // Voter concentration from Gini
  const ginis = modelVars.map(mv => mv.gini);
  const voterConcentration = ginis.length > 0
    ? ginis.reduce((a, b) => a + b, 0) / ginis.length
    : null;

  // Compute actual pass rate — approved / (approved + rejected), excluding expired.
  // Real DAOs compute pass rate only among proposals that went to a vote.
  // Expired/abandoned proposals (0 voters, quorum not met) are a separate engagement metric.
  let passRate: number | null = null;
  if (proposals && proposals.length > 0) {
    const voted = proposals.filter(p =>
      p.status === 'approved' || p.status === 'rejected'
    );
    if (voted.length > 0) {
      const approved = voted.filter(p => p.status === 'approved').length;
      passRate = approved / voted.length;
    }
  } else if (modelVars.length > 0) {
    const last = modelVars[modelVars.length - 1];
    if (last.proposalsApproved !== undefined) {
      const total = (last.proposalsApproved ?? 0) + (last.proposalsRejected ?? 0);
      if (total > 0) {
        passRate = last.proposalsApproved! / total;
      }
    }
  }

  // Compute actual participation rate — prefer proposals array, fall back to DataCollector fields.
  // Include ALL resolved proposals (even those with 0 voters) to match how historical
  // participation rates are computed (unconditional average across all proposals).
  let participationRate: number | null = null;
  if (proposals && proposals.length > 0 && memberCount && memberCount > 0) {
    const resolved = proposals.filter(p =>
      p.status === 'approved' || p.status === 'rejected' || p.status === 'expired'
    );
    if (resolved.length > 0) {
      const voterCounts = resolved.map(p => (p.votes ? p.votes.size : 0) / memberCount);
      participationRate = voterCounts.reduce((a, b) => a + b, 0) / voterCounts.length;
    }
  } else if (modelVars.length > 0) {
    const last = modelVars[modelVars.length - 1];
    if (last.avgParticipationRate !== undefined) {
      participationRate = last.avgParticipationRate;
    }
  }

  return {
    proposalsPerMonth,
    passRate,
    participationRate,
    priceHistory,
    voterConcentration,
    forumTopicsPerMonth,
    totalSteps,
  };
}
