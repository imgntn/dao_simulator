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
  const histProposalsPerMonth = historicalProfile.proposals.avg_proposals_per_month;
  metrics.proposal_frequency_error = relativeError(
    simResults.proposalsPerMonth,
    histProposalsPerMonth
  );
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
  if (historicalProfile.forum) {
    metrics.forum_activity_error = relativeError(
      simResults.forumTopicsPerMonth,
      historicalProfile.forum.avg_topics_per_month
    );
    details['sim_forum_topics_per_month'] = simResults.forumTopicsPerMonth;
    details['hist_forum_topics_per_month'] = historicalProfile.forum.avg_topics_per_month;
  }

  // Calculate overall score (weighted average of 1 - error, clamped to [0, 1])
  const weights = {
    proposal_frequency: 0.25,
    pass_rate: 0.20,
    participation_rate: 0.20,
    price_trajectory: 0.15,
    voter_concentration: 0.10,
    forum_activity: 0.10,
  };

  const overall_score = Math.max(0, Math.min(1,
    weights.proposal_frequency * (1 - Math.min(metrics.proposal_frequency_error, 1)) +
    weights.pass_rate * (1 - Math.min(metrics.pass_rate_error, 1)) +
    weights.participation_rate * (1 - Math.min(metrics.participation_rate_error, 1)) +
    weights.price_trajectory * (1 - Math.min(metrics.price_trajectory_rmse, 1)) +
    weights.voter_concentration * (1 - Math.min(metrics.voter_concentration_error, 1)) +
    weights.forum_activity * (1 - Math.min(metrics.forum_activity_error, 1))
  ));

  return {
    dao_id: historicalProfile.dao_id,
    period: { start: 'simulation', end: 'simulation' },
    metrics,
    overall_score,
    details,
  };
}

/**
 * Extract SimulationMetrics from a completed simulation's data collector
 */
export function extractSimulationMetrics(
  dataCollector: {
    modelVars: Array<{ step: number; price: number; numProposals: number; numMembers: number; gini: number; forumTopics?: number }>;
  },
  totalSteps: number
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

  return {
    proposalsPerMonth,
    passRate: 0.7, // Would need to track pass/fail counts
    participationRate: 0.3, // Would need to track voting participation
    priceHistory,
    voterConcentration,
    forumTopicsPerMonth,
    totalSteps,
  };
}
