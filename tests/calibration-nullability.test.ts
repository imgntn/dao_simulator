import { describe, expect, it } from 'vitest';

import {
  CalibrationLoader,
  type CalibrationProfile,
} from '@/lib/digital-twins/calibration-loader';
import {
  compareToHistorical,
  extractSimulationMetrics,
  type SimulationMetrics,
} from '@/lib/research/accuracy-metrics';

function profileWithUnavailableEstimands(): CalibrationProfile {
  return {
    dao_id: 'missing-data-dao',
    voting: {
      avg_participation_rate: null,
      participation_distribution: [],
      avg_votes_per_proposal: null,
      voter_concentration: null,
      approval_rate: null,
      avg_for_percentage: null,
      quorum_hit_rate: null,
      delegation_rate: null,
    },
    proposals: {
      avg_proposals_per_month: null,
      proposal_types: {},
      avg_voting_period_days: null,
      avg_choices_per_proposal: null,
      pass_rate: null,
      monthly_cadence: [],
    },
    market: null,
    forum: {
      avg_topics_per_month: null,
      avg_posts_per_topic: null,
      avg_views_per_topic: null,
      top_categories: {},
      avg_post_length_chars: null,
      reply_rate: null,
      sentiment_keywords: {},
    },
    voter_clusters: [],
    protocol: null,
  };
}

describe('calibration missing-data semantics', () => {
  it('does not convert unavailable empirical values into simulator settings', () => {
    const settings = CalibrationLoader.toSettings(
      profileWithUnavailableEstimands()
    );

    expect(settings.voting_activity).toBeUndefined();
    expect(settings.proposal_creation_probability).toBeUndefined();
    expect(settings.comment_probability).toBeUndefined();
    expect(settings.price_volatility).toBeUndefined();
    expect(settings.voteHerdingFactor).toBeUndefined();
  });

  it('excludes unavailable comparison dimensions from accuracy scoring', () => {
    const simulated: SimulationMetrics = {
      proposalsPerMonth: 4,
      passRate: 0.7,
      participationRate: 0.2,
      priceHistory: [],
      voterConcentration: 0.4,
      forumTopicsPerMonth: 3,
      totalSteps: 720,
    };

    const report = compareToHistorical(
      simulated,
      profileWithUnavailableEstimands()
    );

    expect(report.overall_score).toBe(0);
    expect(report.details).toEqual({});
    expect(report.available_metrics).toEqual([]);
  });

  it('treats empirical zero as observed rather than missing', () => {
    const profile = profileWithUnavailableEstimands();
    profile.proposals.avg_proposals_per_month = 0;
    profile.proposals.pass_rate = 0;
    profile.voting.avg_participation_rate = 0;
    profile.voting.voter_concentration = 0;
    profile.forum!.avg_topics_per_month = 0;

    const report = compareToHistorical(
      {
        proposalsPerMonth: 0,
        passRate: 0,
        participationRate: 0,
        priceHistory: [],
        voterConcentration: 0,
        forumTopicsPerMonth: 0,
        totalSteps: 720,
      },
      profile
    );

    expect(report.overall_score).toBe(1);
    expect(report.available_metrics).toEqual([
      'proposal_frequency_error',
      'pass_rate_error',
      'participation_rate_error',
      'voter_concentration_error',
      'forum_activity_error',
    ]);
    expect(report.details.hist_pass_rate).toBe(0);
    expect(report.details.hist_participation_rate).toBe(0);
    expect(report.details.hist_forum_topics_per_month).toBe(0);
  });

  it('returns null for simulation outcomes with no eligible observation', () => {
    const extracted = extractSimulationMetrics(
      {
        modelVars: [{
          step: 1,
          price: 1,
          numProposals: 0,
          numMembers: 10,
          gini: 0,
          forumTopics: 0,
        }],
      },
      720,
      [],
      10
    );

    expect(extracted.passRate).toBeNull();
    expect(extracted.participationRate).toBeNull();
    expect(extracted.voterConcentration).toBe(0);
    expect(extracted.forumTopicsPerMonth).toBe(0);
  });

  it('penalizes an unavailable prediction when the historical target is observed', () => {
    const profile = profileWithUnavailableEstimands();
    profile.proposals.pass_rate = 0.6;

    const report = compareToHistorical(
      {
        proposalsPerMonth: null,
        passRate: null,
        participationRate: null,
        priceHistory: [],
        voterConcentration: null,
        forumTopicsPerMonth: null,
        totalSteps: 0,
      },
      profile
    );

    expect(report.metrics.pass_rate_error).toBe(1);
    expect(report.available_metrics).toEqual(['pass_rate_error']);
    expect(report.overall_score).toBe(0);
  });
});
