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

  // Learning parameters
  adaptive_learning_rate: number;
  adaptive_epsilon: number;

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
