// Configuration settings for the simulation
// Port from settings.py

import {
  DEFAULT_PRICE_VOLATILITY,
  DEFAULT_TOKEN_EMISSION_RATE,
  DEFAULT_TOKEN_BURN_RATE,
} from './constants';

export interface SimulationSettings {
  // Agent counts
  num_developers: number;
  num_investors: number;
  num_traders: number;
  num_adaptive_investors: number;
  num_delegators: number;
  num_liquid_delegators: number;
  num_proposal_creators: number;
  num_validators: number;
  num_service_providers: number;
  num_arbitrators: number;
  num_regulators: number;
  num_auditors: number;
  num_bounty_hunters: number;
  num_external_partners: number;
  num_passive_members: number;
  num_artists: number;
  num_collectors: number;
  num_speculators: number;
  num_stakers: number;
  num_rl_traders: number;
  num_governance_experts: number;
  num_governance_whales: number;
  num_risk_managers: number;
  num_market_makers: number;
  num_whistleblowers: number;

  num_llm_agents: number;
  num_llm_reporters: number;

  // Behavior probabilities
  violation_probability: number;
  reputation_penalty: number;
  comment_probability: number;
  proposal_creation_probability: number;
  proposal_duration_steps: number;
  proposal_duration_min_steps: number;
  proposal_duration_max_steps: number;
  voting_activity: number;  // 0-1 probability that an agent votes when given the chance
  external_partner_interact_probability: number;

  // Economic parameters
  staking_interest_rate: number;
  slash_fraction: number;
  reputation_decay_rate: number;
  market_shock_frequency: number;
  token_emission_rate: number;
  token_burn_rate: number;
  price_volatility: number;

  // Treasury policy
  treasury_stabilization_enabled: boolean;
  treasury_target_reserve: number;
  treasury_target_reserve_fraction: number;
  treasury_ema_alpha: number;
  treasury_buffer_fraction: number;
  treasury_buffer_fill_rate: number;
  treasury_emergency_topup_rate: number;
  treasury_max_spend_fraction: number;

  // Proposal lifecycle
  proposal_bond_fraction: number;
  proposal_bond_min: number;
  proposal_bond_max: number;
  proposal_inactivity_steps: number;
  proposal_temp_check_fraction: number;
  proposal_fast_track_min_steps: number;
  proposal_fast_track_approval: number;
  proposal_fast_track_quorum: number;

  // Participation incentives
  participation_target_rate: number;
  participation_boost_strength: number;
  participation_boost_decay: number;
  participation_boost_max: number;
  participation_inactivity_boost: number;
  participation_reward_per_vote: number;

  // Delegation dynamics
  delegation_lock_steps: number;

  // Voting power mitigation
  vote_power_cap_fraction: number;
  vote_power_quadratic_threshold: number;
  vote_power_velocity_window: number;
  vote_power_velocity_penalty: number;

  // Learning parameters (legacy)
  adaptive_learning_rate: number;
  adaptive_epsilon: number;

  // Q-learning configuration
  learning_enabled: boolean;
  learning_global_learning_rate: number;
  learning_discount_factor: number;
  learning_exploration_rate: number;
  learning_exploration_decay: number;
  learning_min_exploration: number;
  learning_persist_q_tables: boolean;
  learning_shared_experience: boolean;

  // Treasury revenue parameters
  treasuryProposalFee: number;
  treasuryStakingYield: number;
  treasuryMemberFee: number;
  treasuryTransactionFee: number;

  // Treasury emergency topup
  treasuryEmergencyTopupEnabled: boolean;

  // Vote herding
  voteHerdingFactor: number;

  // Governance
  governance_rule: string;

  /** Price oracle type: 'random_walk' (default), 'gbm', 'calibrated_gbm' (uses CalibrationProfile), 'historical_replay' (replays CSV data), 'fixed' */
  oracle_type: 'random_walk' | 'gbm' | 'calibrated_gbm' | 'historical_replay' | 'fixed';
  /** DAO ID whose market data to use for calibrated oracles (e.g. 'uniswap') */
  oracle_calibration_dao_id?: string;

  /** Enable forum discussion simulation (topics, posts, sentiment tracking) */
  forum_enabled: boolean;
  /** Weight [0-1] controlling how much forum sentiment influences voting decisions */
  forum_influence_weight: number;

  /** DAO ID to load CalibrationProfile for (enables all calibration features: tuned governance, agent distribution, oracle) */
  calibration_dao_id?: string;
  /** When true, replay exact historical event sequence; when false (default), use statistical matching (same distributions, randomized timing) */
  calibration_strict_replay?: boolean;
  /** When true, use DAO's real governance rule (from governance-mapping.ts) instead of majority+optimism hack */
  calibration_use_real_governance: boolean;

  // Advanced voting mechanisms
  /** Voting mechanism: 'default' | 'ranked-choice' | 'futarchy' */
  voting_mechanism: string;
  /** Futarchy: LMSR liquidity parameter (higher = less price impact) */
  futarchy_liquidity: number;
  /** Futarchy: YES price threshold for approval (0-1) */
  futarchy_threshold: number;
  /** Futarchy: steps after proposal creation before market resolves */
  futarchy_resolution_steps: number;

  // Enhanced liquid democracy
  /** Maximum delegation chain depth (0 = unlimited) */
  delegation_max_depth: number;
  /** Power decay per hop in delegation chain (0 = no decay) */
  delegation_decay_per_hop: number;
  /** Enable topic-specific delegation */
  delegation_topic_specific: boolean;

  // LLM agent configuration
  /** Enable LLM agent reasoning (requires Ollama) */
  llm_enabled: boolean;
  /** Ollama API base URL */
  llm_base_url: string;
  /** Default model for standard agents */
  llm_default_model: string;
  /** Premium model for key governance agents */
  llm_premium_model: string;
  /** Max parallel LLM requests per step */
  llm_max_concurrent: number;
  /** Request timeout in milliseconds */
  llm_timeout_ms: number;
  /** LLM temperature */
  llm_temperature: number;
  /** Cache LLM responses for reproducibility */
  llm_cache_enabled: boolean;
  /** LLM agent mode: 'disabled' | 'hybrid' | 'all' */
  llm_agent_mode: string;
  /** Fraction of agents using LLM in hybrid mode (0-1) */
  llm_hybrid_fraction: number;
  /** Enable LLM-generated forum posts */
  llm_forum_enabled: boolean;
  /** Max response tokens */
  llm_max_tokens: number;
  /** Ollama seed for reproducibility (syncs with sim seed if unset) */
  llm_seed?: number;
  /** Enable thinking/chain-of-thought mode for models that support it (e.g. gemma4, qwen3) */
  llm_enable_thinking: boolean;
  /** Ollama context window size (num_ctx). Lower = faster + less VRAM. 0 = model default. */
  llm_context_size: number;

  // Black swan / exogenous shock system
  /** Enable black swan events */
  black_swan_enabled: boolean;
  /** Expected events per 720 steps */
  black_swan_frequency: number;
  /** Multiplier on all severity values */
  black_swan_severity_scale: number;
  /** Which categories to include (default: all 6) */
  black_swan_categories: string[];
  /** Deterministic events for experiments (overrides random generation for these) */
  black_swan_scheduled_events?: Array<{
    step: number;
    category: string;
    severity: number;
  }>;
}

/**
 * Default simulation settings
 */
export const defaultSettings: SimulationSettings = {
  num_developers: 10,
  num_investors: 5,
  num_traders: 2,
  num_adaptive_investors: 2,
  num_delegators: 5,
  num_liquid_delegators: 2,
  num_proposal_creators: 5,
  num_validators: 5,
  num_service_providers: 3,
  num_arbitrators: 2,
  num_regulators: 2,
  num_auditors: 2,
  num_bounty_hunters: 2,
  num_external_partners: 2,
  num_passive_members: 10,
  num_artists: 2,
  num_collectors: 2,
  num_speculators: 2,
  num_stakers: 0,
  num_rl_traders: 2,
  num_governance_experts: 2,
  num_governance_whales: 0,
  num_risk_managers: 2,
  num_market_makers: 2,
  num_llm_agents: 0,
  num_llm_reporters: 0,
  num_whistleblowers: 1,
  violation_probability: 0.1,
  reputation_penalty: 5,
  comment_probability: 0.5,
  proposal_creation_probability: 0.005,
  proposal_duration_steps: 0,
  proposal_duration_min_steps: 10,
  proposal_duration_max_steps: 30,
  voting_activity: 0.3,  // Default 30% voting participation
  external_partner_interact_probability: 0.0,
  staking_interest_rate: 0.0,
  slash_fraction: 0.0,
  reputation_decay_rate: 0.01,
  market_shock_frequency: 0,
  adaptive_learning_rate: 0.1,
  adaptive_epsilon: 0.1,

  // Q-learning defaults
  learning_enabled: true,
  learning_global_learning_rate: 0.1,
  learning_discount_factor: 0.95,
  learning_exploration_rate: 0.3,
  learning_exploration_decay: 0.995,
  learning_min_exploration: 0.01,
  learning_persist_q_tables: true,
  learning_shared_experience: false,

  governance_rule: 'majority',
  token_emission_rate: DEFAULT_TOKEN_EMISSION_RATE,
  token_burn_rate: DEFAULT_TOKEN_BURN_RATE,
  price_volatility: DEFAULT_PRICE_VOLATILITY,

  treasury_stabilization_enabled: true,
  treasury_target_reserve: 10000,
  treasury_target_reserve_fraction: 0.6,
  treasury_ema_alpha: 0.05,
  treasury_buffer_fraction: 0.2,
  treasury_buffer_fill_rate: 0.5,
  treasury_emergency_topup_rate: 0.25,
  treasury_max_spend_fraction: 0.15,

  proposal_bond_fraction: 0.01,
  proposal_bond_min: 10,
  proposal_bond_max: 1000,
  proposal_inactivity_steps: 72,
  proposal_temp_check_fraction: 0.25,
  proposal_fast_track_min_steps: 6,
  proposal_fast_track_approval: 0.6,
  proposal_fast_track_quorum: 0.2,

  participation_target_rate: 0.25,
  participation_boost_strength: 0.6,
  participation_boost_decay: 0.1,
  participation_boost_max: 0.25,
  participation_inactivity_boost: 0.15,
  participation_reward_per_vote: 0.1,

  delegation_lock_steps: 48,

  vote_power_cap_fraction: 0.15,
  vote_power_quadratic_threshold: 250,
  vote_power_velocity_window: 72,
  vote_power_velocity_penalty: 0.5,

  treasuryProposalFee: 0.5,
  treasuryStakingYield: 0.001,
  treasuryMemberFee: 0.05,
  treasuryTransactionFee: 0.02,

  treasuryEmergencyTopupEnabled: true,

  voteHerdingFactor: 0.2,

  // Oracle defaults
  oracle_type: 'random_walk' as const,
  oracle_calibration_dao_id: undefined,

  // Forum defaults
  forum_enabled: false,
  forum_influence_weight: 0.3,

  // Calibration defaults
  calibration_dao_id: undefined,
  calibration_strict_replay: false,
  calibration_use_real_governance: false,

  // Advanced voting mechanism defaults
  voting_mechanism: 'default',
  futarchy_liquidity: 100,
  futarchy_threshold: 0.5,
  futarchy_resolution_steps: 50,

  // Enhanced liquid democracy defaults
  delegation_max_depth: 0,   // 0 = unlimited
  delegation_decay_per_hop: 0,  // 0 = no decay
  delegation_topic_specific: false,

  // LLM agent defaults
  llm_enabled: false,
  llm_base_url: 'http://localhost:11434',
  llm_default_model: 'qwen3:8b',
  llm_premium_model: 'qwen3:8b',
  llm_max_concurrent: 8,
  llm_timeout_ms: 30000,
  llm_temperature: 0.3,
  llm_cache_enabled: true,
  llm_agent_mode: 'disabled',
  llm_hybrid_fraction: 0.3,
  llm_forum_enabled: false,
  llm_max_tokens: 256,
  llm_seed: undefined,
  llm_enable_thinking: false,
  llm_context_size: 8192,

  // Black swan defaults
  black_swan_enabled: false,
  black_swan_frequency: 2,
  black_swan_severity_scale: 1.0,
  black_swan_categories: ['exploit', 'regulatory', 'key_person_exit', 'trust_collapse', 'market_contagion', 'social_attack'],
  black_swan_scheduled_events: undefined,
};

/**
 * Current simulation settings (mutable)
 */
export const settings: SimulationSettings = { ...defaultSettings };

/**
 * Update simulation settings
 */
export function updateSettings(
  updates: Partial<SimulationSettings>
): SimulationSettings {
  Object.assign(settings, updates);
  return settings;
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): SimulationSettings {
  Object.assign(settings, defaultSettings);
  return settings;
}

/**
 * Load settings from JSON object
 */
export function loadSettings(data: Record<string, any>): SimulationSettings {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Settings data must be an object');
  }

  // Validate that all keys exist in settings
  for (const key of Object.keys(data)) {
    if (!(key in settings)) {
      throw new Error(`Unknown setting: ${key}`);
    }
  }

  return updateSettings(data as Partial<SimulationSettings>);
}

/**
 * Export current settings as JSON
 */
export function exportSettings(): SimulationSettings {
  return { ...settings };
}
