// Learning module - Q-learning infrastructure for agents
// Provides LearningMixin, StateDiscretizer, and RewardAggregator

export {
  LearningMixin,
  LearningConfig,
  QTable,
  LearningState,
  DEFAULT_LEARNING_CONFIG,
} from './learning-mixin';

export {
  StateDiscretizer,
  PriceBucket,
  TrendBucket,
  ParticipationBucket,
  TreasuryBucket,
  ProposalPhaseBucket,
  VolatilityBucket,
  RiskBucket,
  AllocationBucket,
  ActivityBucket,
} from './state-discretizer';

export {
  RewardAggregator,
  AgentCategory,
  RewardSignal,
  REWARD_MAPPINGS,
  createRewardAggregator,
} from './reward-aggregator';
