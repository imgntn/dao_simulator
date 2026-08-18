import { describe, expect, it } from 'vitest';
import type { DAOSimulation } from '../lib/engine/simulation';
import { extractBuiltinMetric } from '../lib/research/builtin-metric-extractor';

function metricFixture(): DAOSimulation {
  const members = [
    {
      uniqueId: 'alice',
      tokens: 10,
      stakedTokens: 0,
      reputation: 0,
      delegations: new Map([['delegate-a', 30]]),
    },
    {
      uniqueId: 'bob',
      tokens: 100,
      stakedTokens: 0,
      reputation: 0,
      delegations: new Map([['delegate-b', 10]]),
    },
  ];
  const proposals = [
    {
      status: 'rejected',
      votesFor: 30,
      votesAgainst: 20,
      snapshotTaken: true,
      totalSupplySnapshot: 100,
      quorumThresholdSnapshot: 0.6,
      creationTime: 0,
      resolvedTime: 24,
      votingPowerSnapshot: new Map([
        ['alice', 70],
        ['bob', 20],
        ['carol', 5],
        ['dave', 5],
      ]),
      votes: new Map([
        ['alice', { vote: true, weight: 30 }],
      ]),
    },
    {
      status: 'approved',
      votesFor: 60,
      votesAgainst: 20,
      snapshotTaken: true,
      totalSupplySnapshot: 200,
      quorumThresholdSnapshot: 0.3,
      creationTime: 10,
      votingPowerSnapshot: new Map([
        ['alice', 100],
        ['bob', 100],
      ]),
      votes: new Map(),
    },
  ];

  return {
    dao: {
      tokenSymbol: 'DAO_TOKEN',
      members,
      proposals,
      projects: [],
      treasury: {},
    },
    dataCollector: {
      history: [],
      getLatestStats: () => undefined,
    },
    governanceRule: { quorumPercentage: 0.04 },
    currentStep: 100,
    initialMemberTokenBalances: new Map([
      ['alice', 100],
      ['bob', 10],
    ]),
  } as unknown as DAOSimulation;
}

describe('authoritative built-in metric extraction', () => {
  it('uses creation-time proposal snapshots for turnout, utilization, and quorum', () => {
    const simulation = metricFixture();

    expect(extractBuiltinMetric(simulation, 'average_turnout')).toBeCloseTo(0.45);
    expect(extractBuiltinMetric(simulation, 'voting_power_utilization')).toBeCloseTo(0.45);
    expect(extractBuiltinMetric(simulation, 'quorum_reach_rate')).toBeCloseTo(0.5);
  });

  it('reports decision time in hours and excludes terminal records without resolution time', () => {
    expect(extractBuiltinMetric(metricFixture(), 'avg_time_to_decision')).toBe(24);
  });

  it('reports proposal completion and median decision time from terminal records', () => {
    const simulation = metricFixture();
    simulation.dao.proposals.push({
      status: 'completed',
      creationTime: 20,
      resolvedTime: 68,
      votes: new Map(),
    } as typeof simulation.dao.proposals[number]);

    expect(extractBuiltinMetric(simulation, 'proposal_completion_rate')).toBe(1);
    expect(extractBuiltinMetric(simulation, 'median_time_to_decision')).toBe(36);
  });

  it('measures treasury survival, maximum drawdown, and recovery in declared time units', () => {
    const simulation = metricFixture();
    Object.defineProperty(simulation.dataCollector, 'history', { value: [
      { step: 0, treasuryFunds: 100 },
      { step: 10, treasuryFunds: 120 },
      { step: 20, treasuryFunds: 60 },
      { step: 30, treasuryFunds: 90 },
      { step: 40, treasuryFunds: 120 },
    ] });

    expect(extractBuiltinMetric(simulation, 'treasury_survival_indicator')).toBe(1);
    expect(extractBuiltinMetric(simulation, 'max_treasury_drawdown')).toBeCloseTo(0.5);
    expect(extractBuiltinMetric(simulation, 'treasury_recovery_time')).toBe(20);
  });

  it('uses snapshotted eligible voters, including inactive and exited members', () => {
    expect(extractBuiltinMetric(metricFixture(), 'voter_concentration_gini')).toBeCloseTo(0.75);
  });

  it('scales governance activity to participatory resolved proposals per 100 steps', () => {
    expect(extractBuiltinMetric(metricFixture(), 'governance_activity_index')).toBeCloseTo(0.9);
  });

  it('defines delegate concentration as HHI of incoming delegation', () => {
    const simulation = metricFixture();

    expect(extractBuiltinMetric(simulation, 'delegate_concentration')).toBeCloseTo(0.625);
  });

  it('defines wealth mobility as normalized rank displacement', () => {
    const simulation = metricFixture();

    expect(extractBuiltinMetric(simulation, 'wealth_mobility')).toBe(1);
  });

  it('rejects non-finite extraction values before aggregation or export', () => {
    const simulation = metricFixture();
    simulation.dao.treasury.getTokenPrice = () => Number.NaN;

    expect(() => extractBuiltinMetric(simulation, 'final_token_price')).toThrow(
      'produced a non-finite value'
    );
  });

  it('extracts complete, per-agent learning diagnostics from final state', () => {
    const simulation = metricFixture();
    const stats = [
      { qTableSize: 4, stateCount: 2, episodeCount: 3, totalReward: -2, explorationRate: 0.2 },
      { qTableSize: 8, stateCount: 4, episodeCount: 5, totalReward: 6, explorationRate: 0.1 },
    ];
    simulation.dao.members.forEach((member, index) => {
      (member as typeof member & { getLearningStats: () => typeof stats[number] })
        .getLearningStats = () => stats[index];
    });

    expect(extractBuiltinMetric(simulation, 'learning_agent_count')).toBe(2);
    expect(extractBuiltinMetric(simulation, 'learning_q_table_size_mean')).toBe(6);
    expect(extractBuiltinMetric(simulation, 'learning_state_count_mean')).toBe(3);
    expect(extractBuiltinMetric(simulation, 'learning_episode_count_mean')).toBe(4);
    expect(extractBuiltinMetric(simulation, 'learning_exploration_rate_mean')).toBeCloseTo(0.15);
    expect(extractBuiltinMetric(simulation, 'learning_total_reward_mean')).toBe(2);
  });
});
