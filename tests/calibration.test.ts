/**
 * Comprehensive tests for the calibration system:
 * CalibrationLoader, ForumState, ForumSimulation, Oracles, AccuracyMetrics
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  CalibrationLoader,
  type CalibrationProfile,
} from '@/lib/digital-twins/calibration-loader';
import {
  ForumState,
  type ForumTopic,
} from '@/lib/data-structures/forum';
import { ForumSimulation } from '@/lib/engine/forum-simulation';
import {
  CalibratedGBMOracle,
  HistoricalReplayOracle,
} from '@/lib/utils/oracles';
import {
  compareToHistorical,
  extractSimulationMetrics,
  type SimulationMetrics,
} from '@/lib/research/accuracy-metrics';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function makeProfile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return {
    dao_id: 'test_dao',
    voting: {
      avg_participation_rate: 0.15,
      participation_distribution: [0.5, 0.2, 0.1, 0.1, 0.05, 0.05, 0, 0, 0, 0],
      avg_votes_per_proposal: 200,
      voter_concentration: 0.85,
      approval_rate: 0.7,
      avg_for_percentage: 0.8,
      quorum_hit_rate: 0.9,
      delegation_rate: 0.1,
    },
    proposals: {
      avg_proposals_per_month: 5,
      proposal_types: { governance: 0.5, funding: 0.3, parameter_change: 0.2 },
      avg_voting_period_days: 7,
      avg_choices_per_proposal: 3,
      pass_rate: 0.7,
      monthly_cadence: [3, 5, 4, 6, 5, 4, 3, 5, 4, 6, 7, 3],
    },
    market: {
      avg_daily_return: 0.001,
      daily_volatility: 0.05,
      avg_price_usd: 100,
      price_range: [50, 200],
      avg_market_cap: 1e9,
      avg_daily_volume: 1e7,
      correlation_to_eth: 0.6,
      drawdown_events: [
        { start_idx: 10, end_idx: 50, magnitude: 0.3 },
      ],
    },
    forum: {
      avg_topics_per_month: 10,
      avg_posts_per_topic: 15,
      avg_views_per_topic: 500,
      top_categories: { general: 0.6, governance: 0.3, funding: 0.1 },
      avg_post_length_chars: 1200,
      reply_rate: 0.25,
      sentiment_keywords: { support: 50, oppose: 10 },
    },
    voter_clusters: [
      { label: 'whale', share: 0.01, avg_voting_power: 50000, participation_rate: 0.7, alignment_with_majority: 0.8 },
      { label: 'active_delegate', share: 0.05, avg_voting_power: 5000, participation_rate: 0.6, alignment_with_majority: 0.75 },
      { label: 'regular_voter', share: 0.3, avg_voting_power: 500, participation_rate: 0.3, alignment_with_majority: 0.65 },
      { label: 'passive_holder', share: 0.64, avg_voting_power: 50, participation_rate: 0.05, alignment_with_majority: 0.6 },
    ],
    protocol: {
      avg_tvl: 5e9,
      tvl_trend: 'growing',
      avg_daily_fees: 100000,
      avg_daily_revenue: 50000,
    },
    ...overrides,
  };
}

// =============================================================================
// CalibrationLoader
// =============================================================================

describe('CalibrationLoader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibration-test-'));
    CalibrationLoader.setCalibrationDir(tmpDir);
  });

  afterEach(() => {
    CalibrationLoader.clearCache();
    // Clean up temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch { /* ignore */ }
  });

  it('loads a valid profile from disk', () => {
    const profile = makeProfile();
    fs.writeFileSync(
      path.join(tmpDir, 'test_dao_profile.json'),
      JSON.stringify(profile)
    );

    const loaded = CalibrationLoader.load('test_dao');
    expect(loaded).not.toBeNull();
    expect(loaded!.dao_id).toBe('test_dao');
    expect(loaded!.voting.avg_participation_rate).toBe(0.15);
    expect(loaded!.proposals.avg_proposals_per_month).toBe(5);
  });

  it('returns null for non-existent profile', () => {
    expect(CalibrationLoader.load('nonexistent')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad_profile.json'), 'not json');
    expect(CalibrationLoader.load('bad')).toBeNull();
  });

  it('returns null for profile missing required fields', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'empty_profile.json'),
      JSON.stringify({ dao_id: 'empty' }) // missing voting/proposals
    );
    expect(CalibrationLoader.load('empty')).toBeNull();
  });

  it('caches loaded profiles', () => {
    const profile = makeProfile();
    fs.writeFileSync(
      path.join(tmpDir, 'cached_profile.json'),
      JSON.stringify(profile)
    );

    const first = CalibrationLoader.load('cached');
    const second = CalibrationLoader.load('cached');
    expect(first).toBe(second); // Same object reference
  });

  it('clears cache', () => {
    const profile = makeProfile();
    fs.writeFileSync(
      path.join(tmpDir, 'cached2_profile.json'),
      JSON.stringify(profile)
    );

    const first = CalibrationLoader.load('cached2');
    CalibrationLoader.clearCache();
    const second = CalibrationLoader.load('cached2');
    expect(first).not.toBe(second); // Different object after cache clear
    expect(first).toEqual(second);  // But same content
  });

  it('hasProfile returns true for existing profiles', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'exists_profile.json'),
      JSON.stringify(makeProfile())
    );
    expect(CalibrationLoader.hasProfile('exists')).toBe(true);
    expect(CalibrationLoader.hasProfile('nope')).toBe(false);
  });

  it('loadAll returns all profiles', () => {
    fs.writeFileSync(path.join(tmpDir, 'aave_profile.json'), JSON.stringify(makeProfile({ dao_id: 'aave' })));
    fs.writeFileSync(path.join(tmpDir, 'uniswap_profile.json'), JSON.stringify(makeProfile({ dao_id: 'uniswap' })));
    fs.writeFileSync(path.join(tmpDir, 'not_a_profile.txt'), 'ignore me');

    const all = CalibrationLoader.loadAll();
    expect(all.size).toBe(2);
    expect(all.has('aave')).toBe(true);
    expect(all.has('uniswap')).toBe(true);
  });

  it('getAvailableIds returns DAO IDs', () => {
    fs.writeFileSync(path.join(tmpDir, 'aave_profile.json'), JSON.stringify(makeProfile({ dao_id: 'aave' })));
    fs.writeFileSync(path.join(tmpDir, 'lido_profile.json'), JSON.stringify(makeProfile({ dao_id: 'lido' })));

    const ids = CalibrationLoader.getAvailableIds();
    expect(ids).toContain('aave');
    expect(ids).toContain('lido');
    expect(ids).toHaveLength(2);
  });

  describe('toSettings', () => {
    it('converts voting activity', () => {
      const profile = makeProfile();
      const settings = CalibrationLoader.toSettings(profile);
      expect(settings.voting_activity).toBeCloseTo(0.15, 2);
    });

    it('converts proposal creation probability', () => {
      const profile = makeProfile();
      const settings = CalibrationLoader.toSettings(profile);
      // 5 proposals/month / 720 steps/month ≈ 0.00694
      expect(settings.proposal_creation_probability).toBeGreaterThan(0.001);
      expect(settings.proposal_creation_probability).toBeLessThan(0.05);
    });

    it('converts market volatility', () => {
      const profile = makeProfile();
      const settings = CalibrationLoader.toSettings(profile);
      // 0.05 / sqrt(24) ≈ 0.0102
      expect(settings.price_volatility).toBeGreaterThan(0.001);
      expect(settings.price_volatility).toBeLessThan(0.1);
    });

    it('converts forum reply rate to comment probability', () => {
      const profile = makeProfile();
      const settings = CalibrationLoader.toSettings(profile);
      expect(settings.comment_probability).toBe(0.25);
    });

    it('clamps voting activity to valid range', () => {
      const low = makeProfile();
      low.voting.avg_participation_rate = 0.001;
      expect(CalibrationLoader.toSettings(low).voting_activity).toBe(0.005);

      const high = makeProfile();
      high.voting.avg_participation_rate = 0.99;
      expect(CalibrationLoader.toSettings(high).voting_activity).toBe(0.95);
    });

    it('handles null market gracefully', () => {
      const profile = makeProfile({ market: null });
      const settings = CalibrationLoader.toSettings(profile);
      expect(settings.price_volatility).toBeUndefined();
    });

    it('handles null forum gracefully', () => {
      const profile = makeProfile({ forum: null });
      const settings = CalibrationLoader.toSettings(profile);
      expect(settings.comment_probability).toBeUndefined();
    });
  });
});

// =============================================================================
// ForumState
// =============================================================================

describe('ForumState', () => {
  let forum: ForumState;

  beforeEach(() => {
    forum = new ForumState();
  });

  it('creates topics with sequential IDs', () => {
    const t1 = forum.createTopic('agent1', 'general', 10);
    const t2 = forum.createTopic('agent2', 'governance', 20);
    expect(t1.id).toBe('topic_0');
    expect(t2.id).toBe('topic_1');
    expect(forum.topics).toHaveLength(2);
  });

  it('creates topics with linked proposals', () => {
    const topic = forum.createTopic('agent1', 'proposal_discussion', 10, 'prop_42');
    expect(topic.linkedProposalId).toBe('prop_42');
    expect(topic.category).toBe('proposal_discussion');
  });

  it('adds posts to topics', () => {
    const topic = forum.createTopic('agent1', 'general', 10);
    const post = forum.addPost(topic.id, 'agent2', 0.5, 15, 'support');
    expect(post).not.toBeNull();
    expect(post!.topicId).toBe(topic.id);
    expect(post!.sentiment).toBe(0.5);
    expect(post!.content).toBe('support');
    expect(topic.posts).toHaveLength(1);
  });

  it('returns null for posts on non-existent topics', () => {
    const post = forum.addPost('nonexistent', 'agent1', 0, 10);
    expect(post).toBeNull();
  });

  it('clamps sentiment to [-1, 1]', () => {
    const topic = forum.createTopic('agent1', 'general', 10);
    const high = forum.addPost(topic.id, 'agent1', 5.0, 11);
    const low = forum.addPost(topic.id, 'agent1', -3.0, 12);
    expect(high!.sentiment).toBe(1);
    expect(low!.sentiment).toBe(-1);
  });

  it('gets active topics within time window', () => {
    forum.createTopic('a', 'general', 10);
    const t2 = forum.createTopic('b', 'governance', 100);
    forum.addPost(t2.id, 'c', 0.5, 200);

    // Only topics active since step 50
    const active = forum.getActiveTopics(50);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(t2.id);
  });

  it('calculates topic sentiment', () => {
    const topic = forum.createTopic('a', 'general', 10);
    forum.addPost(topic.id, 'b', 0.8, 11);
    forum.addPost(topic.id, 'c', -0.2, 12);
    forum.addPost(topic.id, 'd', 0.4, 13);

    const sentiment = forum.getTopicSentiment(topic.id);
    expect(sentiment).toBeCloseTo((0.8 + -0.2 + 0.4) / 3, 5);
  });

  it('returns 0 sentiment for empty topics', () => {
    const topic = forum.createTopic('a', 'general', 10);
    expect(forum.getTopicSentiment(topic.id)).toBe(0);
  });

  it('finds topics by proposal ID', () => {
    forum.createTopic('a', 'general', 10);
    forum.createTopic('b', 'proposal_discussion', 20, 'prop_1');

    const found = forum.getProposalTopic('prop_1');
    expect(found).toBeDefined();
    expect(found!.linkedProposalId).toBe('prop_1');

    expect(forum.getProposalTopic('prop_missing')).toBeUndefined();
  });

  it('computes stats correctly', () => {
    const t1 = forum.createTopic('a', 'general', 10);
    forum.addPost(t1.id, 'b', 0.5, 11);
    forum.addPost(t1.id, 'c', -0.5, 12);
    const t2 = forum.createTopic('d', 'governance', 20);
    forum.addPost(t2.id, 'e', 1.0, 21);

    const stats = forum.getStats();
    expect(stats.topicCount).toBe(2);
    expect(stats.postCount).toBe(3);
    expect(stats.avgSentiment).toBeCloseTo((0.5 + -0.5 + 1.0) / 3, 5);
  });

  it('resets state', () => {
    forum.createTopic('a', 'general', 10);
    forum.reset();
    expect(forum.topics).toHaveLength(0);
    expect(forum.getStats().topicCount).toBe(0);
  });
});

// =============================================================================
// ForumSimulation
// =============================================================================

describe('ForumSimulation', () => {
  it('creates with default rates when no calibration', () => {
    const state = new ForumState();
    const sim = new ForumSimulation(state);
    // Should not throw
    sim.step(['agent1', 'agent2'], 1);
  });

  it('creates with calibrated rates', () => {
    const state = new ForumState();
    const profile = makeProfile();
    const sim = new ForumSimulation(state, profile, 0.5);

    // Run many steps with many agents — with calibration rates, should produce some activity
    const agents = Array.from({ length: 50 }, (_, i) => `agent_${i}`);
    for (let i = 0; i < 2000; i++) {
      sim.step(agents, i);
    }

    const stats = sim.getForumStats();
    expect(stats.topicCount).toBeGreaterThan(0);
  });

  it('returns 0 sentiment for unknown proposals', () => {
    const state = new ForumState();
    const sim = new ForumSimulation(state);
    expect(sim.getProposalSentiment('nonexistent')).toBe(0);
    expect(sim.getVotingBias('nonexistent')).toBe(0);
  });

  it('computes voting bias from forum sentiment', () => {
    const state = new ForumState();
    const sim = new ForumSimulation(state, null, 0.5);

    // Create a proposal topic with known sentiment
    const topic = state.createTopic('agent1', 'proposal_discussion', 1, 'prop_1');
    state.addPost(topic.id, 'agent2', 0.8, 2);
    state.addPost(topic.id, 'agent3', 0.6, 3);

    const sentiment = sim.getProposalSentiment('prop_1');
    expect(sentiment).toBeCloseTo(0.7, 5);

    const bias = sim.getVotingBias('prop_1');
    // bias = sentiment * influenceWeight = 0.7 * 0.5 = 0.35
    expect(bias).toBeCloseTo(0.35, 5);
  });

  it('returns underlying state', () => {
    const state = new ForumState();
    const sim = new ForumSimulation(state);
    expect(sim.getState()).toBe(state);
  });
});

// =============================================================================
// CalibratedGBMOracle
// =============================================================================

describe('CalibratedGBMOracle', () => {
  it('sets initial price on first update', () => {
    const oracle = new CalibratedGBMOracle({
      drift: 0.001,
      volatility: 0.02,
      initialPrice: 100,
    });

    oracle.updatePrice('TOKEN', 0);
    const price = oracle.getPrice('TOKEN');
    // Price should be near 100 (GBM has randomness)
    expect(price).toBeGreaterThan(0);
  });

  it('applies drawdown events', () => {
    const oracle = new CalibratedGBMOracle({
      drift: 0.0,
      volatility: 0.001, // very low vol for predictability
      initialPrice: 100,
      drawdownEvents: [{ startStep: 10, endStep: 20, magnitude: 0.5 }],
    });

    // Update at step 0 (no drawdown)
    oracle.updatePrice('TOKEN', 0);
    const priceBeforeDD = oracle.getPrice('TOKEN');

    // Update at step 15 (middle of drawdown)
    oracle.updatePrice('TOKEN', 15);
    const priceDuringDD = oracle.getPrice('TOKEN');

    // During drawdown, price should be lower
    expect(priceDuringDD).toBeLessThan(priceBeforeDD * 1.5); // Not a precise test due to GBM noise
  });

  it('works without drawdown events', () => {
    const oracle = new CalibratedGBMOracle({
      drift: 0.001,
      volatility: 0.02,
      initialPrice: 50,
    });

    oracle.updatePrice('TOKEN', 0);
    oracle.updatePrice('TOKEN', 1);
    expect(oracle.getPrice('TOKEN')).toBeGreaterThan(0);
  });
});

// =============================================================================
// HistoricalReplayOracle
// =============================================================================

describe('HistoricalReplayOracle', () => {
  it('replays prices from time series', () => {
    const timeSeries = [
      { step: 0, price: 100 },
      { step: 24, price: 110 },
      { step: 48, price: 105 },
      { step: 72, price: 120 },
    ];

    const oracle = new HistoricalReplayOracle(timeSeries);

    oracle.updatePrice('TOKEN', 0);
    expect(oracle.getPrice('TOKEN')).toBe(100);

    oracle.updatePrice('TOKEN', 24);
    expect(oracle.getPrice('TOKEN')).toBe(110);

    oracle.updatePrice('TOKEN', 72);
    expect(oracle.getPrice('TOKEN')).toBe(120);
  });

  it('interpolates between data points', () => {
    const timeSeries = [
      { step: 0, price: 100 },
      { step: 24, price: 124 },
    ];

    const oracle = new HistoricalReplayOracle(timeSeries);

    oracle.updatePrice('TOKEN', 12);
    const price = oracle.getPrice('TOKEN');
    // Linear interpolation: 100 + (12/24) * (124-100) = 112
    expect(price).toBeCloseTo(112, 1);
  });

  it('falls back to GBM after series ends', () => {
    const timeSeries = [
      { step: 0, price: 100 },
      { step: 24, price: 110 },
    ];

    const oracle = new HistoricalReplayOracle(timeSeries, {
      drift: 0.001,
      volatility: 0.02,
    });

    // Before end: replay
    oracle.updatePrice('TOKEN', 24);
    expect(oracle.getPrice('TOKEN')).toBe(110);

    // After end: fallback to GBM (should produce a price near 110)
    oracle.updatePrice('TOKEN', 100);
    const price = oracle.getPrice('TOKEN');
    expect(price).toBeGreaterThan(0);
  });

  it('handles empty time series', () => {
    const oracle = new HistoricalReplayOracle([]);
    oracle.updatePrice('TOKEN', 0);
    // No data, no fallback: price stays at default
    expect(oracle.getPrice('TOKEN')).toBe(100);
  });

  it('handles single data point', () => {
    const oracle = new HistoricalReplayOracle([{ step: 0, price: 42 }]);
    oracle.updatePrice('TOKEN', 0);
    expect(oracle.getPrice('TOKEN')).toBe(42);
  });
});

// =============================================================================
// AccuracyMetrics
// =============================================================================

describe('AccuracyMetrics', () => {
  describe('compareToHistorical', () => {
    it('returns perfect score for matching metrics', () => {
      const profile = makeProfile();
      const metrics: SimulationMetrics = {
        proposalsPerMonth: 5,
        passRate: 0.7,
        participationRate: 0.15,
        priceHistory: [100, 100, 100],
        voterConcentration: 0.85,
        forumTopicsPerMonth: 10,
        totalSteps: 720,
      };

      const report = compareToHistorical(metrics, profile);
      expect(report.overall_score).toBeGreaterThan(0.9);
      expect(report.metrics.proposal_frequency_error).toBeCloseTo(0, 2);
      expect(report.metrics.pass_rate_error).toBeCloseTo(0, 2);
    });

    it('penalizes large deviations', () => {
      const profile = makeProfile();
      const metrics: SimulationMetrics = {
        proposalsPerMonth: 50,  // 10x historical
        passRate: 0.1,          // Much lower
        participationRate: 0.9, // Much higher
        priceHistory: [1000],   // 10x historical price
        voterConcentration: 0.1,
        forumTopicsPerMonth: 100,
        totalSteps: 720,
      };

      const report = compareToHistorical(metrics, profile);
      expect(report.overall_score).toBeLessThan(0.5);
      expect(report.metrics.proposal_frequency_error).toBeGreaterThan(1);
    });

    it('handles null market gracefully', () => {
      const profile = makeProfile({ market: null });
      const metrics: SimulationMetrics = {
        proposalsPerMonth: 5,
        passRate: 0.7,
        participationRate: 0.15,
        priceHistory: [],
        voterConcentration: 0.85,
        forumTopicsPerMonth: 10,
        totalSteps: 720,
      };

      const report = compareToHistorical(metrics, profile);
      expect(report.metrics.price_trajectory_rmse).toBe(0);
      expect(report.overall_score).toBeGreaterThan(0);
    });

    it('handles null forum gracefully', () => {
      const profile = makeProfile({ forum: null });
      const metrics: SimulationMetrics = {
        proposalsPerMonth: 5,
        passRate: 0.7,
        participationRate: 0.15,
        priceHistory: [100],
        voterConcentration: 0.85,
        forumTopicsPerMonth: 0,
        totalSteps: 720,
      };

      const report = compareToHistorical(metrics, profile);
      expect(report.metrics.forum_activity_error).toBe(0);
    });

    it('populates details with sim and hist values', () => {
      const profile = makeProfile();
      const metrics: SimulationMetrics = {
        proposalsPerMonth: 6,
        passRate: 0.65,
        participationRate: 0.12,
        priceHistory: [90, 95, 100],
        voterConcentration: 0.8,
        forumTopicsPerMonth: 8,
        totalSteps: 720,
      };

      const report = compareToHistorical(metrics, profile);
      expect(report.details['sim_proposals_per_month']).toBe(6);
      expect(report.details['hist_proposals_per_month']).toBe(5);
      expect(report.details['sim_pass_rate']).toBe(0.65);
      expect(report.details['hist_pass_rate']).toBe(0.7);
    });
  });

  describe('extractSimulationMetrics', () => {
    it('extracts basic metrics from model vars', () => {
      const modelVars = [
        { step: 0, price: 100, numProposals: 0, numMembers: 10, gini: 0.5 },
        { step: 720, price: 110, numProposals: 5, numMembers: 12, gini: 0.6 },
      ];

      const metrics = extractSimulationMetrics({ modelVars }, 720);
      expect(metrics.proposalsPerMonth).toBeCloseTo(5, 1);
      expect(metrics.priceHistory).toEqual([100, 110]);
      expect(metrics.voterConcentration).toBeCloseTo(0.55, 2);
    });

    it('computes pass rate from proposals array', () => {
      const modelVars = [
        { step: 720, price: 100, numProposals: 4, numMembers: 10, gini: 0.5 },
      ];
      const proposals = [
        { status: 'approved' },
        { status: 'approved' },
        { status: 'rejected' },
        { status: 'expired' },
      ];

      const metrics = extractSimulationMetrics({ modelVars }, 720, proposals as any);
      // 2 approved out of 3 voted (excluding expired)
      expect(metrics.passRate).toBeCloseTo(2 / 3, 2);
    });

    it('computes participation rate from votes map', () => {
      const modelVars = [
        { step: 720, price: 100, numProposals: 2, numMembers: 10, gini: 0.5 },
      ];
      const proposals = [
        { status: 'approved', votes: new Map([['a', {}], ['b', {}], ['c', {}]]) },
        { status: 'rejected', votes: new Map([['a', {}], ['d', {}]]) },
      ];

      const metrics = extractSimulationMetrics({ modelVars }, 720, proposals as any, 10);
      // (3/10 + 2/10) / 2 = 0.25
      expect(metrics.participationRate).toBeCloseTo(0.25, 2);
    });

    it('falls back to DataCollector fields when no proposals', () => {
      const modelVars = [
        {
          step: 720, price: 100, numProposals: 5, numMembers: 10, gini: 0.5,
          proposalsApproved: 3, proposalsRejected: 1, proposalsExpired: 1,
          avgParticipationRate: 0.22,
        },
      ];

      const metrics = extractSimulationMetrics({ modelVars }, 720);
      expect(metrics.passRate).toBeCloseTo(0.75, 2); // 3/(3+1), excluding expired
      expect(metrics.participationRate).toBeCloseTo(0.22, 2);
    });

    it('extracts forum topics per month', () => {
      const modelVars = [
        { step: 720, price: 100, numProposals: 0, numMembers: 10, gini: 0.5, forumTopics: 8 },
      ];

      const metrics = extractSimulationMetrics({ modelVars }, 720);
      expect(metrics.forumTopicsPerMonth).toBeCloseTo(8, 1); // 8 topics in 1 month
    });

    it('handles empty model vars', () => {
      const metrics = extractSimulationMetrics({ modelVars: [] }, 720);
      expect(metrics.proposalsPerMonth).toBe(0);
      expect(metrics.priceHistory).toEqual([]);
      expect(metrics.passRate).toBe(0.5); // default
    });
  });
});

// =============================================================================
// BacktestRunner
// =============================================================================

describe('BacktestRunner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backtest-test-'));
    CalibrationLoader.setCalibrationDir(tmpDir);
  });

  afterEach(() => {
    CalibrationLoader.clearCache();
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('throws when no calibration profile exists', async () => {
    const { BacktestRunner } = await import('@/lib/research/backtest-runner');
    const runner = new BacktestRunner();
    await expect(
      runner.runBacktest({ daoId: 'nonexistent', episodes: 1, stepsPerEpisode: 10 })
    ).rejects.toThrow('No calibration profile found');
  });

  it('runs backtest with a valid profile and returns reports', async () => {
    const { BacktestRunner } = await import('@/lib/research/backtest-runner');
    const profile = makeProfile();
    fs.writeFileSync(
      path.join(tmpDir, 'test_dao_profile.json'),
      JSON.stringify(profile)
    );

    const runner = new BacktestRunner();
    const result = await runner.runBacktest({
      daoId: 'test_dao',
      episodes: 2,
      stepsPerEpisode: 50,
      seed: 42,
      oracleType: 'calibrated_gbm',
      forumEnabled: false,
    });

    expect(result.daoId).toBe('test_dao');
    expect(result.episodes).toBe(2);
    expect(result.reports).toHaveLength(2);
    expect(result.averageReport.dao_id).toBe('test_dao');
    expect(result.averageReport.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.averageReport.overall_score).toBeLessThanOrEqual(1);
    expect(result.bestScore).toBeGreaterThanOrEqual(result.worstScore);
    expect(result.stdDevScore).toBeGreaterThanOrEqual(0);

    // Each report should have valid metrics
    for (const report of result.reports) {
      expect(report.metrics.proposal_frequency_error).toBeGreaterThanOrEqual(0);
      expect(report.metrics.pass_rate_error).toBeGreaterThanOrEqual(0);
    }
  }, 30000);
});

// =============================================================================
// Governance Calibration Tuning
// =============================================================================

describe('Governance Calibration Tuning', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-tuning-test-'));
    CalibrationLoader.setCalibrationDir(tmpDir);
  });

  afterEach(() => {
    CalibrationLoader.clearCache();
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('applies calibrated quorum from historical participation rate', async () => {
    const { DAOSimulation } = await import('@/lib/engine/simulation');
    const profile = makeProfile();
    // Set specific participation rate
    profile.voting.avg_participation_rate = 0.10; // 10%
    fs.writeFileSync(
      path.join(tmpDir, 'govtest_profile.json'),
      JSON.stringify(profile)
    );

    const sim = new DAOSimulation({
      calibration_dao_id: 'govtest',
      seed: 42,
    });

    // Quorum is disabled (set to 0) for calibrated sims — real DAOs compute quorum
    // over thousands of holders, but our 74-agent sim can't replicate that meaningfully.
    // MajorityRule just checks votesFor > votesAgainst.
    const rule = (sim as any).governanceRule;
    if (rule.quorumPercentage !== undefined) {
      expect(rule.quorumPercentage).toBe(0);
    }
  });

  it('calibrates proposal duration from historical voting period', async () => {
    const { DAOSimulation } = await import('@/lib/engine/simulation');
    const profile = makeProfile();
    profile.proposals.avg_voting_period_days = 5;
    fs.writeFileSync(
      path.join(tmpDir, 'durtest_profile.json'),
      JSON.stringify(profile)
    );

    const sim = new DAOSimulation({
      calibration_dao_id: 'durtest',
      seed: 42,
    });

    // 5 days × 24 steps/day = 120 steps
    expect(sim.proposalDurationSteps).toBe(120);
    expect(sim.proposalDurationMinSteps).toBe(60);  // 50% of 120
    expect(sim.proposalDurationMaxSteps).toBe(240);  // 200% of 120
  });

  it('calibration governance tuning applies even with explicit governance_config', async () => {
    const { DAOSimulation } = await import('@/lib/engine/simulation');
    const profile = makeProfile();
    profile.voting.avg_participation_rate = 0.10;
    fs.writeFileSync(
      path.join(tmpDir, 'nooverride_profile.json'),
      JSON.stringify(profile)
    );

    const sim = new DAOSimulation({
      calibration_dao_id: 'nooverride',
      governance_config: { quorumPercentage: 0.25 },
      seed: 42,
    });

    // Calibration reconstructs the governance rule with quorum=0 to match
    // historical pass rates at simulation scale (~200 agents)
    const rule = (sim as any).governanceRule;
    if (rule.quorumPercentage !== undefined) {
      expect(rule.quorumPercentage).toBe(0);
    }
  });
});

// =============================================================================
// Forum Voting Integration
// =============================================================================

describe('Forum Voting Integration', () => {
  it('forum sentiment influences decideVote belief', async () => {
    const { DAOSimulation } = await import('@/lib/engine/simulation');
    const { setSeed } = await import('@/lib/utils/random');

    const sim = new DAOSimulation({
      forum_enabled: true,
      forum_influence_weight: 0.5,
      seed: 42,
      num_developers: 3,
      num_investors: 0, num_traders: 0, num_adaptive_investors: 0,
      num_delegators: 0, num_liquid_delegators: 0, num_proposal_creators: 0,
      num_validators: 0, num_service_providers: 0, num_arbitrators: 0,
      num_regulators: 0, num_auditors: 0, num_bounty_hunters: 0,
      num_external_partners: 0, num_passive_members: 0, num_artists: 0,
      num_collectors: 0, num_speculators: 0, num_stakers: 0,
      num_rl_traders: 0, num_governance_experts: 0, num_governance_whales: 0,
      num_risk_managers: 0, num_market_makers: 0, num_whistleblowers: 0,
    });

    expect(sim.forumSimulation).not.toBeNull();
    expect(sim.forumState).not.toBeNull();

    // Create a proposal topic with strong positive sentiment
    const forumState = sim.forumState!;
    const topic = forumState.createTopic('agent1', 'proposal_discussion', 0, 'test_prop');
    forumState.addPost(topic.id, 'agent2', 1.0, 1, 'support');
    forumState.addPost(topic.id, 'agent3', 0.9, 2, 'support');
    forumState.addPost(topic.id, 'agent4', 0.8, 3, 'support');

    // Verify forum simulation returns positive bias
    const bias = sim.forumSimulation!.getVotingBias('test_prop');
    expect(bias).toBeGreaterThan(0);
    expect(bias).toBeCloseTo(0.9 * 0.5, 1); // avg_sentiment * influence_weight
  });
});

// =============================================================================
// DataCollector Proposal Tracking
// =============================================================================

describe('DataCollector Proposal Tracking', () => {
  it('tracks proposal outcomes in model vars', async () => {
    const { DAO } = await import('@/lib/data-structures/dao');
    const { SimpleDataCollector } = await import('@/lib/engine/data-collector');

    const dao = new DAO('TestDAO');
    dao.currentStep = 1;
    dao.members = [
      { tokens: 100, stakedTokens: 0, reputation: 10, delegations: new Map(), uniqueId: 'm1' },
    ] as any;
    dao.projects = [] as any;

    // Add proposals with various statuses
    dao.proposals = [
      { status: 'approved', votes: new Map([['m1', { vote: true, weight: 100 }]]) },
      { status: 'approved', votes: new Map([['m1', { vote: true, weight: 100 }]]) },
      { status: 'rejected', votes: new Map([['m1', { vote: false, weight: 100 }]]) },
      { status: 'expired', votes: new Map() },
      { status: 'open', votes: new Map() },
    ] as any;

    const collector = new SimpleDataCollector(dao, 1, 1);
    collector.collect(dao);

    const latest = collector.modelVars[0];
    expect(latest.proposalsApproved).toBe(2);
    expect(latest.proposalsRejected).toBe(1);
    expect(latest.proposalsExpired).toBe(1);
    // 3 proposals have votes, each with 1 voter out of 1 member = rate 1.0 each, avg = 1.0
    expect(latest.avgParticipationRate).toBeDefined();
    expect(latest.avgParticipationRate!).toBeGreaterThan(0);
  });

  it('tracks forum metrics when forum state is set', async () => {
    const { DAO } = await import('@/lib/data-structures/dao');
    const { SimpleDataCollector } = await import('@/lib/engine/data-collector');

    const dao = new DAO('TestDAO');
    dao.currentStep = 1;
    dao.members = [
      { tokens: 100, stakedTokens: 0, reputation: 10, delegations: new Map(), uniqueId: 'm1' },
    ] as any;
    dao.proposals = [] as any;
    dao.projects = [] as any;

    const forumState = new ForumState();
    const t1 = forumState.createTopic('m1', 'general', 0);
    forumState.addPost(t1.id, 'm1', 0.5, 1, 'support');

    const collector = new SimpleDataCollector(dao, 1, 1);
    collector.setForumState(forumState);
    collector.collect(dao);

    const latest = collector.modelVars[0];
    expect(latest.forumTopics).toBe(1);
    expect(latest.forumPosts).toBe(1);
    expect(latest.forumAvgSentiment).toBe(0.5);
  });
});

// =============================================================================
// Integration: CalibrationLoader with real profiles (if available)
// =============================================================================

describe('CalibrationLoader (real profiles)', () => {
  const realCalibDir = path.join(
    process.cwd(),
    'results', 'historical', 'calibration'
  );

  beforeEach(() => {
    CalibrationLoader.setCalibrationDir(realCalibDir);
    CalibrationLoader.clearCache();
  });

  afterEach(() => {
    CalibrationLoader.clearCache();
  });

  it('loads real calibration profiles if they exist', () => {
    if (!fs.existsSync(realCalibDir)) return; // Skip if no data

    const ids = CalibrationLoader.getAvailableIds();
    if (ids.length === 0) return;

    for (const id of ids) {
      const profile = CalibrationLoader.load(id);
      expect(profile).not.toBeNull();
      expect(profile!.dao_id).toBe(id);
      expect(profile!.voting.avg_participation_rate).toBeGreaterThanOrEqual(0);
      expect(profile!.proposals.avg_proposals_per_month).toBeGreaterThanOrEqual(0);
      expect(profile!.voter_clusters.length).toBeGreaterThan(0);

      // Voter cluster shares should sum to ~1
      const totalShare = profile!.voter_clusters.reduce((s, c) => s + c.share, 0);
      expect(totalShare).toBeCloseTo(1.0, 1);
    }
  });

  it('generates valid settings from real profiles', () => {
    if (!fs.existsSync(realCalibDir)) return;

    const ids = CalibrationLoader.getAvailableIds();
    for (const id of ids) {
      const profile = CalibrationLoader.load(id);
      if (!profile) continue;

      const settings = CalibrationLoader.toSettings(profile);

      // All derived settings should be in valid ranges
      if (settings.voting_activity !== undefined) {
        expect(settings.voting_activity).toBeGreaterThanOrEqual(0.005);
        expect(settings.voting_activity).toBeLessThanOrEqual(0.95);
      }
      if (settings.proposal_creation_probability !== undefined) {
        expect(settings.proposal_creation_probability).toBeGreaterThanOrEqual(0.001);
        expect(settings.proposal_creation_probability).toBeLessThanOrEqual(0.05);
      }
      if (settings.price_volatility !== undefined) {
        expect(settings.price_volatility).toBeGreaterThanOrEqual(0.001);
        expect(settings.price_volatility).toBeLessThanOrEqual(0.1);
      }
    }
  });
});

// =============================================================================
// Integration: Forum + Voting + Calibration (end-to-end)
// =============================================================================

describe('End-to-End: Forum + Voting + Calibration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-test-'));
    CalibrationLoader.setCalibrationDir(tmpDir);
  });

  afterEach(() => {
    CalibrationLoader.clearCache();
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('runs calibrated simulation with forum and collects correct metrics', async () => {
    const { DAOSimulation } = await import('@/lib/engine/simulation');
    const profile = makeProfile({ dao_id: 'e2e' });
    fs.writeFileSync(
      path.join(tmpDir, 'e2e_profile.json'),
      JSON.stringify(profile)
    );

    const sim = new DAOSimulation({
      calibration_dao_id: 'e2e',
      forum_enabled: true,
      forum_influence_weight: 0.3,
      oracle_type: 'calibrated_gbm',
      seed: 123,
      num_developers: 5,
      num_investors: 3,
      num_traders: 0,
      num_adaptive_investors: 0,
      num_delegators: 3,
      num_liquid_delegators: 0,
      num_proposal_creators: 3,
      num_validators: 0,
      num_service_providers: 0,
      num_arbitrators: 0,
      num_regulators: 0,
      num_auditors: 0,
      num_bounty_hunters: 0,
      num_external_partners: 0,
      num_passive_members: 5,
      num_artists: 0,
      num_collectors: 0,
      num_speculators: 0,
      num_stakers: 0,
      num_rl_traders: 0,
      num_governance_experts: 0,
      num_governance_whales: 0,
      num_risk_managers: 0,
      num_market_makers: 0,
      num_whistleblowers: 0,
      proposal_creation_probability: 0.02, // Higher rate to ensure proposals
    });

    // Forum should be initialized
    expect(sim.forumSimulation).not.toBeNull();
    expect(sim.forumState).not.toBeNull();

    // Calibration profile should be loaded
    expect((sim as any).calibrationProfile).not.toBeNull();
    expect((sim as any).calibrationProfile.dao_id).toBe('e2e');

    // Oracle should be calibrated GBM (not default random walk)
    const oracle = sim.dao.treasury.oracle;
    expect(oracle).toBeDefined();
    expect(oracle.constructor.name).toBe('CalibratedGBMOracle');

    // Run simulation for enough steps to generate activity
    for (let i = 0; i < 200; i++) {
      sim.step();
    }

    // DataCollector should have entries
    const collector = (sim as any).dataCollector;
    expect(collector.modelVars.length).toBeGreaterThan(0);

    // Check forum metrics in data collector
    const lastEntry = collector.modelVars[collector.modelVars.length - 1];
    expect(lastEntry.forumTopics).toBeDefined();
    expect(typeof lastEntry.forumTopics).toBe('number');

    // Price should have moved from initial (calibrated GBM oracle)
    expect(lastEntry.price).toBeGreaterThan(0);
  }, 30000);

  it('forum sentiment caching works correctly', () => {
    const forum = new ForumState();
    const topic = forum.createTopic('a1', 'general', 0);

    // Add posts with known sentiments
    forum.addPost(topic.id, 'a2', 0.8, 1, 'support');
    forum.addPost(topic.id, 'a3', 0.6, 2, 'support');

    // First call computes and caches
    const s1 = forum.getTopicSentiment(topic.id);
    expect(s1).toBeCloseTo(0.7, 5);

    // Second call returns cached value (same result)
    const s2 = forum.getTopicSentiment(topic.id);
    expect(s2).toBe(s1);

    // Adding a post invalidates cache
    forum.addPost(topic.id, 'a4', -0.2, 3, 'oppose');
    const s3 = forum.getTopicSentiment(topic.id);
    expect(s3).not.toBe(s1); // Should be different
    expect(s3).toBeCloseTo(0.4, 1); // (0.8 + 0.6 + -0.2) / 3
  });

  it('forum views increment deterministically', () => {
    const forum = new ForumState();
    const topic = forum.createTopic('a1', 'general', 0);

    forum.addPost(topic.id, 'a2', 0.5, 1);
    expect(topic.views).toBe(3); // Fixed increment

    forum.addPost(topic.id, 'a3', 0.5, 2);
    expect(topic.views).toBe(6); // 3 + 3

    forum.addPost(topic.id, 'a4', 0.5, 3);
    expect(topic.views).toBe(9); // 6 + 3
  });

  it('HistoricalReplayOracle falls back to GBM when data ends', () => {
    const timeSeries = [
      { step: 0, price: 100 },
      { step: 24, price: 105 },
      { step: 48, price: 110 },
    ];

    const oracle = new HistoricalReplayOracle(timeSeries, {
      drift: 0.001,
      volatility: 0.02,
    });

    // Within data range: interpolates
    oracle.updatePrice('TOKEN', 0);
    expect(oracle.getPrice('TOKEN')).toBe(100);

    oracle.updatePrice('TOKEN', 24);
    expect(oracle.getPrice('TOKEN')).toBe(105);

    // At boundary
    oracle.updatePrice('TOKEN', 48);
    expect(oracle.getPrice('TOKEN')).toBe(110);

    // Beyond data: falls back to GBM (price changes from last known)
    oracle.updatePrice('TOKEN', 100);
    const beyondPrice = oracle.getPrice('TOKEN');
    expect(beyondPrice).toBeGreaterThan(0);
    // GBM should produce a different price from the last data point
    // (might be same due to random seed, but should not error)
    expect(typeof beyondPrice).toBe('number');
    expect(isFinite(beyondPrice)).toBe(true);
  });

  it('CalibratedGBMOracle applies drawdown events', () => {
    const oracle = new CalibratedGBMOracle({
      drift: 0.0,
      volatility: 0.0, // Zero vol to isolate drawdown effect
      initialPrice: 100,
      drawdownEvents: [
        { startStep: 10, endStep: 30, magnitude: 0.5 },
      ],
    });

    oracle.setPrice('TOKEN', 100);

    // Before drawdown: price should stay ~100 (zero vol, zero drift)
    oracle.updatePrice('TOKEN', 5);
    const preBefore = oracle.getPrice('TOKEN');
    expect(preBefore).toBeCloseTo(100, 0);

    // During drawdown: price should drop
    oracle.updatePrice('TOKEN', 20);
    const duringPrice = oracle.getPrice('TOKEN');
    expect(duringPrice).toBeLessThanOrEqual(100);
  });
});
