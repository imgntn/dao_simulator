// Configuration settings for the simulation
// Port from settings.py

import {
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

  // Behavior probabilities
  violation_probability: number;
  reputation_penalty: number;
  comment_probability: number;
  external_partner_interact_probability: number;

  // Economic parameters
  staking_interest_rate: number;
  slash_fraction: number;
  reputation_decay_rate: number;
  market_shock_frequency: number;
  token_emission_rate: number;
  token_burn_rate: number;

  // Learning parameters
  adaptive_learning_rate: number;
  adaptive_epsilon: number;

  // Governance
  governance_rule: string;

  // Features
  enable_marketing: boolean;
  marketing_level: string;
  enable_player: boolean;
}

/**
 * Default simulation settings
 */
export const defaultSettings: SimulationSettings = {
  num_developers: 10,
  num_investors: 5,
  num_traders: 0,
  num_adaptive_investors: 0,
  num_delegators: 5,
  num_liquid_delegators: 0,
  num_proposal_creators: 5,
  num_validators: 5,
  num_service_providers: 5,
  num_arbitrators: 2,
  num_regulators: 2,
  num_auditors: 0,
  num_bounty_hunters: 0,
  num_external_partners: 2,
  num_passive_members: 10,
  num_artists: 0,
  num_collectors: 0,
  num_speculators: 0,
  violation_probability: 0.1,
  reputation_penalty: 5,
  comment_probability: 0.5,
  external_partner_interact_probability: 0.0,
  staking_interest_rate: 0.0,
  slash_fraction: 0.0,
  reputation_decay_rate: 0.01,
  market_shock_frequency: 0,
  adaptive_learning_rate: 0.1,
  adaptive_epsilon: 0.1,
  governance_rule: 'majority',
  enable_marketing: false,
  marketing_level: 'auto',
  enable_player: false,
  token_emission_rate: DEFAULT_TOKEN_EMISSION_RATE,
  token_burn_rate: DEFAULT_TOKEN_BURN_RATE,
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
