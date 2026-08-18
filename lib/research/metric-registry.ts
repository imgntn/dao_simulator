import type { BuiltinMetricType } from './experiment-config';

export type MetricObservation =
  | 'endpoint'
  | 'trajectory'
  | 'proposal-set'
  | 'event-log'
  | 'ecosystem-endpoint';

export type MetricEmptySetPolicy =
  | 'zero-is-observed-absence'
  | 'zero-is-undefined-denominator-sentinel';

export interface MetricDefinition {
  id: BuiltinMetricType;
  definitionVersion: string;
  construct: string;
  formula: string;
  numerator: string;
  denominator: string;
  unit: string;
  timeBasis: string;
  validRange: readonly [number | null, number | null];
  observation: MetricObservation;
  requiredState: readonly string[];
  interpretationLimits: string;
  acrossRunAggregation: 'distribution of replicate-level values';
  emptySetPolicy: MetricEmptySetPolicy;
  missingDataBehavior: string;
}

export const METRIC_REGISTRY_SCHEMA_VERSION = '1.2.0';

const FORMULAS: Record<BuiltinMetricType, string> = {
  proposal_pass_rate: 'approved_or_completed / (approved_or_completed + rejected)',
  average_turnout: 'mean over proposals of sum(vote weights) / proposal total-supply snapshot',
  final_treasury: 'final liquid DAO_TOKEN balance in the DAO treasury',
  final_token_price: 'final DAO_TOKEN oracle or marketplace price',
  final_member_count: 'number of DAO members at the final step',
  final_gini: 'Gini coefficient of final member liquid-token balances',
  final_reputation_gini: 'Gini coefficient of final member reputation',
  total_proposals: 'number of proposals created during the run',
  total_projects: 'number of projects present at the final step',
  average_token_balance: 'sum(final member liquid tokens) / final member count',
  proposal_completion_rate: 'approved_or_completed_or_rejected proposals / all proposals',
  median_time_to_decision: 'median over terminal proposals with resolution time of (resolvedStep - creationStep) * hours per step',
  quorum_reach_rate: 'proposals meeting their snapshotted quorum / all proposals',
  avg_margin_of_victory: 'mean over resolved proposals with votes of abs(votesFor - votesAgainst) / (votesFor + votesAgainst)',
  avg_time_to_decision: 'mean over terminal proposals with recorded resolution time of (resolvedStep - creationStep) * hours per step',
  proposal_abandonment_rate: 'expired proposals / all proposals',
  proposal_rejection_rate: 'rejected / (approved_or_completed + rejected)',
  governance_overhead: 'total unique vote records / number of approved_or_completed_or_rejected proposals',
  unique_voter_count: 'cardinality of member IDs appearing in any proposal vote map',
  voter_participation_rate: 'mean over proposals of unique voters / eligible voters in the proposal snapshot',
  voter_concentration_gini: 'Gini coefficient of per-member vote-record counts across the union of snapshotted eligible voters, cast voters, and final members',
  delegate_concentration: 'Herfindahl-Hirschman index of incoming delegated token shares',
  avg_votes_per_proposal: 'total proposal vote records / proposal count',
  voter_retention_rate: 'voters present in both chronological proposal halves / voters in first half',
  voting_power_utilization: 'mean over proposals of used vote weight / proposal total-supply snapshot',
  treasury_volatility: 'coefficient of variation of treasury balance across recorded steps',
  treasury_growth_rate: '(final recorded treasury - initial recorded treasury) / initial recorded treasury',
  emergency_topup_total: 'cumulative DAO_TOKEN minted by the emergency-topup policy',
  staking_participation: 'sum(staked tokens) / sum(liquid + staked tokens) across members',
  token_concentration_gini: 'Gini coefficient of final member liquid + staked token holdings',
  avg_member_wealth: 'sum(final member liquid + staked tokens) / final member count',
  wealth_mobility: 'mean absolute initial-to-final member rank displacement / maximum possible displacement',
  token_conservation_error: 'abs(accounted final supply - (initial supply + explicit mints - explicit burns))',
  treasury_survival_indicator: '1 if every recorded primary-token treasury balance is strictly positive, otherwise 0',
  max_treasury_drawdown: 'maximum over recorded steps of (running peak treasury - current treasury) / running peak treasury',
  treasury_recovery_time: 'hours from the largest-drawdown trough until recovery to its preceding peak, or until the final observation if unrecovered',
  whale_influence: 'mean over proposals of vote weight cast by top-decile token holders / all cast vote weight',
  whale_proposal_rate: 'proposals created by final top-decile token holders / all proposals',
  governance_capture_risk: 'Gini coefficient of proposal counts by creator, including zero-proposal members',
  vote_buying_vulnerability: 'mean over resolved proposals of abs(votesFor - votesAgainst) / 2',
  single_entity_control: 'maximum member voting power / total member voting power',
  collusion_threshold: 'smallest sorted member prefix whose voting power exceeds 50% / member count',
  participation_trend: 'ordinary-least-squares slope of recorded participation rate against simulation step',
  treasury_trend: 'ordinary-least-squares slope of recorded treasury balance against simulation step',
  member_growth_rate: '(final recorded member count - initial recorded member count) / initial recorded member count',
  proposal_rate: 'total proposals / completed steps * 100',
  governance_activity_index: 'proposals per 100 steps * snapshotted average turnout * terminal-decision fraction',
  token_price_change: '(final marketplace price - initial marketplace price) / initial marketplace price',
  token_price_volatility: 'coefficient of variation of the DAO marketplace-price trajectory',
  price_governance_correlation: 'Pearson correlation of price history and proposal-count history',
  final_market_rank: 'one-based final market-cap rank reported by the global marketplace',
  market_cap: 'final token price * final circulating supply',
  trading_volume: 'final marketplace rolling 24-hour token volume',
  net_member_flow: 'completed inbound member transfers - completed outbound member transfers',
  total_market_cap: 'sum of final market capitalizations across ecosystem DAOs',
  market_concentration: 'Herfindahl-Hirschman index of final DAO market-cap shares',
  price_dispersion: 'population variance of final DAO token prices',
  total_ecosystem_members: 'sum of final member counts across ecosystem DAOs',
  ecosystem_member_gini: 'Gini coefficient of final member counts across DAOs',
  dao_dominance_index: 'Herfindahl-Hirschman index of final DAO member-count shares',
  inter_dao_proposal_count: 'number of inter-DAO proposals present at the final step',
  inter_dao_proposal_success_rate: 'approved_or_executed inter-DAO proposals / all inter-DAO proposals',
  collaboration_proposal_rate: 'collaboration inter-DAO proposals / all inter-DAO proposals',
  treaty_proposal_rate: 'treaty inter-DAO proposals / all inter-DAO proposals',
  resource_sharing_rate: 'resource-sharing inter-DAO proposals / all inter-DAO proposals',
  joint_venture_rate: 'joint-venture inter-DAO proposals / all inter-DAO proposals',
  inter_dao_voting_participation: 'mean across DAO-proposal voting results of votes cast / eligible voters',
  cross_dao_approval_alignment: 'mean over inter-DAO proposals of 1 - 2 * min(DAO approval share, 1 - DAO approval share)',
  total_shared_budget: 'sum sharedBudget for approved or executed inter-DAO proposals',
  resource_flow_volume: 'sum resourceAmount for approved or executed inter-DAO proposals',
  ecosystem_treasury_total: 'sum of final primary-token treasury balances across DAOs',
  attack_attempts: 'count of recorded attack-attempt events against the DAO',
  successful_attacks: 'count of recorded successful attacks against the DAO',
  attack_success_rate: 'successful attacks / attack attempts',
  attack_detection_rate: 'detected attacks / attack attempts',
  attack_mitigation_rate: 'mitigated attacks / detected attacks',
  treasury_loss: 'max(0, initial primary-token treasury - final primary-token treasury)',
  malicious_proposal_pass_rate: 'approved_or_completed malicious proposals / all identified malicious proposals',
  veto_actions: 'count of recorded veto actions for the DAO',
  cross_dao_alerts: 'cardinality of unique ecosystem alert IDs, falling back to alert-event count',
  coordinated_defense_actions: 'count of recorded coordinated ecosystem-defense actions',
  ecosystem_survival_rate: 'DAOs with members > 0 and treasury > 0 / all ecosystem DAOs',
  ecosystem_recovery_time: 'mean DAO step of first return to initial treasury after a below-initial dip; final recorded step if unrecovered',
  participation_convergence: 'max(0, 1 - coefficient of variation of final DAO participation rates)',
  governance_quality_variance: 'population variance across DAOs of governance-capture-risk values',
  transferred_member_impact: 'absolute Pearson correlation of net member flows and final DAO participation rates',
  transfer_count: 'sum of completed member transfers across DAOs',
  transfer_origin_distribution: 'Herfindahl-Hirschman index of origin-DAO shares among inbound transfers',
  transfer_request_count: 'sum of member-transfer requests across DAOs',
  transfer_completion_rate: 'completed member transfers / requested member transfers',
  llm_vote_consistency: 'non-abstaining LLM decisions matching optimism-threshold rule vote / comparable LLM decisions',
  llm_cache_hit_rate: 'LLM response-cache hits / cache lookups',
  llm_avg_latency_ms: 'arithmetic mean latency of completed LLM requests in milliseconds',
  learning_agent_count: 'number of final DAO members exposing complete learning diagnostics',
  learning_q_table_size_mean: 'sum of final learned state-action entry counts / learning agent count',
  learning_state_count_mean: 'sum of final learned state counts / learning agent count',
  learning_episode_count_mean: 'sum of completed learning episode counts / learning agent count',
  learning_exploration_rate_mean: 'sum of final epsilon-greedy exploration rates / learning agent count',
  learning_total_reward_mean: 'sum of cumulative learning rewards / learning agent count',
};

const RATE_METRICS = new Set<BuiltinMetricType>([
  'proposal_pass_rate', 'average_turnout', 'quorum_reach_rate',
  'proposal_completion_rate', 'treasury_survival_indicator',
  'proposal_abandonment_rate', 'proposal_rejection_rate',
  'voter_participation_rate', 'voter_retention_rate', 'voting_power_utilization',
  'staking_participation', 'wealth_mobility', 'whale_influence',
  'whale_proposal_rate', 'single_entity_control', 'collusion_threshold',
  'market_concentration', 'ecosystem_member_gini', 'dao_dominance_index',
  'inter_dao_proposal_success_rate', 'collaboration_proposal_rate',
  'treaty_proposal_rate', 'resource_sharing_rate', 'joint_venture_rate',
  'inter_dao_voting_participation', 'cross_dao_approval_alignment',
  'attack_success_rate', 'attack_detection_rate', 'attack_mitigation_rate',
  'malicious_proposal_pass_rate', 'ecosystem_survival_rate',
  'participation_convergence', 'transferred_member_impact',
  'transfer_origin_distribution', 'transfer_completion_rate',
  'llm_vote_consistency', 'llm_cache_hit_rate',
  'learning_exploration_rate_mean',
]);

const GINI_HHI_METRICS = new Set<BuiltinMetricType>([
  'final_gini', 'final_reputation_gini', 'voter_concentration_gini',
  'delegate_concentration', 'token_concentration_gini',
  'governance_capture_risk',
]);

const CORRELATION_METRICS = new Set<BuiltinMetricType>([
  'price_governance_correlation',
]);

const TRAJECTORY_METRICS = new Set<BuiltinMetricType>([
  'treasury_volatility', 'treasury_growth_rate', 'participation_trend',
  'max_treasury_drawdown', 'treasury_recovery_time',
  'treasury_trend', 'member_growth_rate', 'token_price_change',
  'token_price_volatility', 'price_governance_correlation',
  'ecosystem_recovery_time',
]);

const EVENT_METRICS = new Set<BuiltinMetricType>([
  'emergency_topup_total', 'trading_volume', 'net_member_flow',
  'attack_attempts', 'successful_attacks', 'attack_success_rate',
  'attack_detection_rate', 'attack_mitigation_rate', 'veto_actions',
  'cross_dao_alerts', 'coordinated_defense_actions', 'transfer_count',
  'transfer_origin_distribution', 'transfer_request_count',
  'transfer_completion_rate', 'llm_cache_hit_rate', 'llm_avg_latency_ms',
  'learning_total_reward_mean',
]);

const PROPOSAL_METRICS = new Set<BuiltinMetricType>([
  'proposal_pass_rate', 'average_turnout', 'quorum_reach_rate',
  'proposal_completion_rate', 'median_time_to_decision',
  'avg_margin_of_victory', 'avg_time_to_decision',
  'proposal_abandonment_rate', 'proposal_rejection_rate',
  'governance_overhead', 'unique_voter_count', 'voter_participation_rate',
  'voter_concentration_gini', 'avg_votes_per_proposal',
  'voter_retention_rate', 'voting_power_utilization', 'whale_influence',
  'whale_proposal_rate', 'governance_capture_risk',
  'vote_buying_vulnerability', 'proposal_rate', 'governance_activity_index',
  'malicious_proposal_pass_rate', 'llm_vote_consistency',
]);

const ECOSYSTEM_METRICS = new Set<BuiltinMetricType>([
  'total_market_cap', 'market_concentration', 'price_dispersion',
  'total_ecosystem_members', 'ecosystem_member_gini', 'dao_dominance_index',
  'inter_dao_proposal_count', 'inter_dao_proposal_success_rate',
  'collaboration_proposal_rate', 'treaty_proposal_rate',
  'resource_sharing_rate', 'joint_venture_rate',
  'inter_dao_voting_participation', 'cross_dao_approval_alignment',
  'total_shared_budget', 'resource_flow_volume', 'ecosystem_treasury_total',
  'cross_dao_alerts', 'coordinated_defense_actions',
  'ecosystem_survival_rate', 'ecosystem_recovery_time',
  'participation_convergence', 'governance_quality_variance',
  'transferred_member_impact', 'transfer_count', 'transfer_request_count',
  'transfer_completion_rate',
]);

const UNDEFINED_DENOMINATOR_ZERO_METRICS = new Set<BuiltinMetricType>([
  'proposal_pass_rate', 'average_turnout', 'average_token_balance',
  'proposal_completion_rate', 'median_time_to_decision',
  'quorum_reach_rate', 'avg_margin_of_victory', 'avg_time_to_decision',
  'proposal_abandonment_rate', 'proposal_rejection_rate',
  'governance_overhead', 'voter_participation_rate',
  'voter_concentration_gini', 'delegate_concentration',
  'avg_votes_per_proposal', 'voter_retention_rate',
  'voting_power_utilization', 'treasury_volatility',
  'treasury_growth_rate', 'staking_participation',
  'max_treasury_drawdown', 'treasury_recovery_time',
  'token_concentration_gini', 'avg_member_wealth', 'wealth_mobility',
  'whale_influence', 'whale_proposal_rate', 'governance_capture_risk',
  'vote_buying_vulnerability', 'single_entity_control',
  'collusion_threshold', 'participation_trend', 'treasury_trend',
  'member_growth_rate', 'governance_activity_index',
  'token_price_change', 'token_price_volatility',
  'price_governance_correlation', 'market_concentration',
  'price_dispersion', 'ecosystem_member_gini', 'dao_dominance_index',
  'inter_dao_proposal_success_rate', 'collaboration_proposal_rate',
  'treaty_proposal_rate', 'resource_sharing_rate', 'joint_venture_rate',
  'inter_dao_voting_participation', 'cross_dao_approval_alignment',
  'attack_success_rate', 'attack_detection_rate', 'attack_mitigation_rate',
  'malicious_proposal_pass_rate', 'ecosystem_survival_rate',
  'ecosystem_recovery_time', 'participation_convergence',
  'governance_quality_variance', 'transferred_member_impact',
  'transfer_origin_distribution', 'transfer_completion_rate',
  'llm_vote_consistency', 'llm_cache_hit_rate', 'llm_avg_latency_ms',
  'learning_q_table_size_mean', 'learning_state_count_mean',
  'learning_episode_count_mean', 'learning_exploration_rate_mean',
  'learning_total_reward_mean',
]);

const UNIT_OVERRIDES: Partial<Record<BuiltinMetricType, string>> = {
  avg_time_to_decision: 'hours',
  median_time_to_decision: 'hours',
  proposal_rate: 'proposals per 100 simulation steps',
  governance_activity_index: 'turnout-weighted terminal proposals per 100 simulation steps',
  participation_trend: 'participation proportion per simulation step',
  treasury_trend: 'tokens per simulation step',
  token_conservation_error: 'tokens',
  vote_buying_vulnerability: 'voting-power units',
  trading_volume: 'tokens per rolling 24 hours',
  price_dispersion: 'squared price units',
  treasury_recovery_time: 'hours',
  learning_exploration_rate_mean: 'probability',
  learning_total_reward_mean: 'reward units per learning agent',
};

function definitionFor(id: BuiltinMetricType): MetricDefinition {
  const bounded01 = RATE_METRICS.has(id) || GINI_HHI_METRICS.has(id);
  const correlation = CORRELATION_METRICS.has(id);
  const inferredUnit = id === 'llm_avg_latency_ms'
    ? 'milliseconds'
    : bounded01 || correlation || id.includes('rate') || id.includes('change') ||
        id.includes('growth') || id.includes('volatility') ||
        id === 'avg_margin_of_victory'
      ? 'proportion'
      : id.includes('treasury') || id.includes('budget') || id.includes('wealth') ||
          id.includes('token_balance') || id === 'market_cap' ||
          id === 'total_market_cap' || id === 'resource_flow_volume'
        ? 'tokens'
        : id.includes('rate') || id.includes('change') || id.includes('growth')
          ? 'proportion'
          : 'count or index';
  const unit = UNIT_OVERRIDES[id] ?? inferredUnit;
  const validRange: readonly [number | null, number | null] = correlation
    ? [-1, 1]
    : bounded01
      ? [0, 1]
      : id.includes('change') || id.includes('growth') || id.includes('trend') ||
          id === 'net_member_flow'
        ? [null, null]
        : [0, null];
  const observation: MetricObservation = ECOSYSTEM_METRICS.has(id)
    ? 'ecosystem-endpoint'
    : EVENT_METRICS.has(id)
      ? 'event-log'
      : TRAJECTORY_METRICS.has(id)
        ? 'trajectory'
        : PROPOSAL_METRICS.has(id)
          ? 'proposal-set'
          : 'endpoint';
  const division = FORMULAS[id].split(' / ');
  const rawNumerator =
    division.length > 1 ? division.slice(0, -1).join(' / ') : FORMULAS[id];
  const rawDenominator =
    division.length > 1 ? division.at(-1)! : 'not applicable';
  const requiredState = observation === 'proposal-set'
    ? ['proposal records', 'proposal-time eligibility and voting-power snapshots']
    : observation === 'trajectory'
      ? ['ordered per-step data-collector history']
      : observation === 'event-log'
        ? ['typed event counters or subsystem telemetry']
        : observation === 'ecosystem-endpoint'
          ? ['stable-ID DAO states', 'global marketplace or inter-DAO state']
          : ['final DAO and member state'];

  return {
    id,
    definitionVersion: [
      'average_turnout', 'quorum_reach_rate', 'delegate_concentration',
      'proposal_completion_rate', 'median_time_to_decision',
      'wealth_mobility', 'token_conservation_error', 'voting_power_utilization',
      'avg_time_to_decision', 'voter_concentration_gini',
      'voter_retention_rate', 'governance_activity_index',
      'learning_agent_count', 'learning_q_table_size_mean',
      'learning_state_count_mean', 'learning_episode_count_mean',
      'learning_exploration_rate_mean', 'learning_total_reward_mean',
      'treasury_survival_indicator', 'max_treasury_drawdown',
      'treasury_recovery_time',
    ].includes(id) ? '2.0.0' : '1.0.0',
    construct: id.replaceAll('_', ' '),
    formula: FORMULAS[id],
    numerator: rawNumerator.length > 2 ? rawNumerator : `constant ${rawNumerator}`,
    denominator:
      rawDenominator.length > 2 ? rawDenominator : `constant ${rawDenominator}`,
    unit,
    timeBasis: observation === 'trajectory'
      ? 'entire recorded simulation horizon'
      : observation === 'event-log'
        ? 'cumulative over the simulation horizon'
        : 'end of run or the complete proposal set',
    validRange,
    observation,
    requiredState,
    interpretationLimits:
      'Descriptive model output under the declared scenario; it is not a causal estimate, welfare judgment, or empirical forecast without an identified design and external validation.',
    acrossRunAggregation: 'distribution of replicate-level values',
    emptySetPolicy: UNDEFINED_DENOMINATOR_ZERO_METRICS.has(id)
      ? 'zero-is-undefined-denominator-sentinel'
      : 'zero-is-observed-absence',
    missingDataBehavior: UNDEFINED_DENOMINATOR_ZERO_METRICS.has(id)
      ? 'When the required opportunity set, denominator, or trajectory is empty, the numeric compatibility value is 0. Analyses must report the corresponding opportunity count and distinguish this sentinel from an observed zero-valued estimand.'
      : 'A zero records an observed absence or zero count. Missing required simulator state is an error and must not be silently imputed.',
  };
}

export const BUILTIN_METRIC_IDS = Object.freeze(
  Object.keys(FORMULAS) as BuiltinMetricType[]
);

export const METRIC_REGISTRY: Readonly<Record<BuiltinMetricType, MetricDefinition>> =
  Object.freeze(
    Object.fromEntries(
      BUILTIN_METRIC_IDS.map(id => [id, Object.freeze(definitionFor(id))])
    ) as Record<BuiltinMetricType, MetricDefinition>
  );

export function getMetricDefinition(id: BuiltinMetricType): MetricDefinition {
  return METRIC_REGISTRY[id];
}
