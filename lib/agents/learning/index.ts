// Learning module - Q-learning infrastructure for agents
// Provides LearningMixin, StateDiscretizer, RewardAggregator, and RewardShaper

export {
  LearningMixin,
  DEFAULT_LEARNING_CONFIG,
} from './learning-mixin';

export type {
  LearningConfig,
  QTable,
  LearningState,
  Transition,
} from './learning-mixin';

export {
  StateDiscretizer,
} from './state-discretizer';

export type {
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
  REWARD_MAPPINGS,
  createRewardAggregator,
} from './reward-aggregator';

export type {
  AgentCategory,
  RewardSignal,
} from './reward-aggregator';

export {
  RewardShaper,
  PotentialFunctions,
  createGovernanceShaper,
  createFinancialShaper,
  createCommunityShaper,
} from './reward-shaper';

export type {
  PotentialContext,
  PotentialFunction,
} from './reward-shaper';

// Tier 3: Advanced Methods

export {
  SharedLearningCoordinator,
} from './shared-learning';

export type {
  AgentGroup,
  SharedLearningConfig,
  CrossCategorySignal,
} from './shared-learning';

export {
  PolicyGradientMixin,
} from './policy-gradient';

export type {
  PolicyGradientConfig,
  PolicyGradientState,
} from './policy-gradient';

export {
  NeuralNetwork,
} from './neural-network';

export type {
  ActivationFunction,
  LayerDef,
  NetworkState,
} from './neural-network';

export {
  DQNMixin,
} from './dqn-mixin';

export type {
  DQNConfig,
  DQNState,
} from './dqn-mixin';

export {
  HierarchicalRLMixin,
} from './hierarchical-rl';

export type {
  Option,
  HierarchicalConfig,
  HierarchicalState,
} from './hierarchical-rl';

export {
  OpponentModel,
} from './opponent-model';

export type {
  OpponentObservation,
  OpponentModelConfig,
  OpponentModelState,
} from './opponent-model';
