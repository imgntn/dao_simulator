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
    price_trajectory_rmse: number;
    voter_concentration_error: number;
    forum_activity_error: number;
  };
  overall_score: number; // 0-1, where 1 = perfect match
  details: Record<string, number>;
}

export interface SimulationMetrics {
  proposalsPerMonth: number;
  passRate: number;
  participationRate: number;
  priceHistory: number[];
  voterConcentration: number;
  forumTopicsPerMonth: number;
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
function priceRMSE(simPrices: number[], historicalAvgPrice: number): number {
  if (simPrices.length === 0) return 1.0;

  const simAvg = simPrices.reduce((a, b) => a + b, 0) / simPrices.length;
  // Compare average price level rather than point-by-point (since sim is stochastic)
  return relativeError(simAvg, historicalAvgPrice);
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
    price_trajectory_rmse: 0,
    voter_concentration_error: 0,
    forum_activity_error: 0,
  };

  const details: Record<string, number> = {};

  // 1. Proposal frequency error
  // For low-frequency DAOs (< 10 proposals/month), Poisson variance is significant.
  // Allow ±1 standard deviation (sqrt(λ)) tolerance before counting as error.
  const histProposalsPerMonth = historicalProfile.proposals.avg_proposals_per_month;
  if (histProposalsPerMonth < 10) {
    const tolerance = Math.sqrt(Math.max(histProposalsPerMonth, 0.5));
    const error = Math.max(0, Math.abs(simResults.proposalsPerMonth - histProposalsPerMonth) - tolerance)
      / Math.max(histProposalsPerMonth, 0.01);
    metrics.proposal_frequency_error = Math.min(error, 1);
  } else {
    metrics.proposal_frequency_error = relativeError(
      simResults.proposalsPerMonth,
      histProposalsPerMonth
    );
  }
  details['sim_proposals_per_month'] = simResults.proposalsPerMonth;
  details['hist_proposals_per_month'] = histProposalsPerMonth;

  // 2. Pass rate error
  const histPassRate = historicalProfile.proposals.pass_rate;
  metrics.pass_rate_error = relativeError(simResults.passRate, histPassRate);
  details['sim_pass_rate'] = simResults.passRate;
  details['hist_pass_rate'] = histPassRate;

  // 3. Participation rate error
  const histParticipation = historicalProfile.voting.avg_participation_rate;
  metrics.participation_rate_error = relativeError(
    simResults.participationRate,
    histParticipation
  );
  details['sim_participation_rate'] = simResults.participationRate;
  details['hist_participation_rate'] = histParticipation;

  // 4. Price trajectory RMSE (if market data available)
  if (historicalProfile.market) {
    metrics.price_trajectory_rmse = priceRMSE(
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
  metrics.voter_concentration_error = relativeError(
    simResults.voterConcentration,
    histConcentration
  );
  details['sim_voter_concentration'] = simResults.voterConcentration;
  details['hist_voter_concentration'] = histConcentration;

  // 6. Forum activity error
  // For low-activity forums (< 5 topics/month), Poisson variance is very high
  // relative to the mean. Use a tolerance-aware error that accounts for expected
  // stochastic variance: tolerance = sqrt(expected) / expected = 1/sqrt(expected).
  if (historicalProfile.forum) {
    const histForum = historicalProfile.forum.avg_topics_per_month;
    const simForum = simResults.forumTopicsPerMonth;
    if (histForum < 5) {
      // For low-activity forums, allow ±1 standard deviation (sqrt(λ)) of tolerance.
      // Scale the expected count to sim duration: monthly rate in a 720-step (30-day) sim.
      const tolerance = Math.sqrt(Math.max(histForum, 0.5));
      const error = Math.max(0, Math.abs(simForum - histForum) - tolerance) / Math.max(histForum, 0.01);
      metrics.forum_activity_error = Math.min(error, 1);
    } else {
      metrics.forum_activity_error = relativeError(simForum, histForum);
    }
    details['sim_forum_topics_per_month'] = simForum;
    details['hist_forum_topics_per_month'] = histForum;
  }

  // Calculate overall score (weighted average of 1 - error, clamped to [0, 1]).
  // If historical data is missing for a metric (value = 0), skip it and redistribute weight.
  const baseWeights: Record<string, number> = {
    proposal_frequency: 0.25,
    pass_rate: 0.20,
    participation_rate: 0.20,
    price_trajectory: 0.15,
    voter_concentration: 0.10,
    forum_activity: 0.10,
  };

  const metricScores: Record<string, number> = {
    proposal_frequency: 1 - Math.min(metrics.proposal_frequency_error, 1),
    pass_rate: 1 - Math.min(metrics.pass_rate_error, 1),
    participation_rate: 1 - Math.min(metrics.participation_rate_error, 1),
    price_trajectory: 1 - Math.min(metrics.price_trajectory_rmse, 1),
    voter_concentration: 1 - Math.min(metrics.voter_concentration_error, 1),
    forum_activity: 1 - Math.min(metrics.forum_activity_error, 1),
  };

  // Skip metrics where historical data is missing/zero (indicates no data, not 0%)
  const skipMetrics = new Set<string>();
  if (historicalProfile.proposals.pass_rate === 0) skipMetrics.add('pass_rate');
  if (!historicalProfile.market) skipMetrics.add('price_trajectory');
  if (!historicalProfile.forum) skipMetrics.add('forum_activity');
  if (historicalProfile.voting.voter_concentration === 0) skipMetrics.add('voter_concentration');

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
  const proposalsPerMonth = monthsSimulated > 0 ? totalProposals / monthsSimulated : 0;

  // Forum topics per month
  const forumTopics = modelVars.length > 0 && modelVars[modelVars.length - 1].forumTopics
    ? modelVars[modelVars.length - 1].forumTopics!
    : 0;
  const forumTopicsPerMonth = monthsSimulated > 0 ? forumTopics / monthsSimulated : 0;

  // Voter concentration from Gini
  const ginis = modelVars.map(mv => mv.gini);
  const voterConcentration = ginis.length > 0
    ? ginis.reduce((a, b) => a + b, 0) / ginis.length
    : 0.5;

  // Compute actual pass rate — approved / (approved + rejected), excluding expired.
  // Real DAOs compute pass rate only among proposals that went to a vote.
  // Expired/abandoned proposals (0 voters, quorum not met) are a separate engagement metric.
  let passRate = 0.5;
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
  let participationRate = 0.1;
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
