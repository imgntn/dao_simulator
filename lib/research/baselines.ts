import type { DAOSimulationConfig } from '../engine/simulation';
import type { PopulationSpec } from './population';

export interface BaselineConfig {
  id: string;
  name: string;
  config: DAOSimulationConfig;
  population?: PopulationSpec;
}

const COMPOUND_BASELINE: BaselineConfig = {
  id: 'compound',
  name: 'Compound-style baseline',
  config: {
    governance_rule: 'majority',
    governance_config: {
      quorumPercentage: 0.04,
      threshold: 0.5,
      convictionThreshold: 0.10,
      convictionHalfLife: 30,
    },
    token_emission_rate: 10,
    token_burn_rate: 0,
    staking_interest_rate: 0.03,
    slash_fraction: 0,
    reputation_decay_rate: 0.01,
    market_shock_frequency: 0.05,
    adaptive_learning_rate: 0.1,
    adaptive_epsilon: 0.1,
    violation_probability: 0.05,
    reputation_penalty: 5,
    comment_probability: 0.3,
    voting_activity: 0.25,
    external_partner_interact_probability: 0.1,
  },
  population: {
    totalMembers: 150,
    distribution: [
      { archetype: 'passive_holder', percentage: 40 },
      { archetype: 'active_voter', percentage: 25 },
      { archetype: 'delegate', percentage: 20 },
      { archetype: 'staker', percentage: 5 },
      { archetype: 'investor', percentage: 5 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },
};

const LIDO_BASELINE: BaselineConfig = {
  id: 'lido',
  name: 'Lido-style baseline',
  config: {
    governance_rule: 'majority',
    governance_config: {
      quorumPercentage: 0.05,
      threshold: 0.5,
      convictionThreshold: 0.10,
      convictionHalfLife: 30,
    },
    token_emission_rate: 10,
    token_burn_rate: 0,
    staking_interest_rate: 0.03,
    slash_fraction: 0,
    reputation_decay_rate: 0.01,
    market_shock_frequency: 0.05,
    adaptive_learning_rate: 0.1,
    adaptive_epsilon: 0.1,
    violation_probability: 0.05,
    reputation_penalty: 5,
    comment_probability: 0.3,
    voting_activity: 0.3,
    external_partner_interact_probability: 0.1,
  },
  population: {
    totalMembers: 200,
    distribution: [
      { archetype: 'passive_holder', percentage: 30 },
      { archetype: 'active_voter', percentage: 20 },
      { archetype: 'staker', percentage: 30 },
      { archetype: 'delegate', percentage: 15 },
      { archetype: 'governance_expert', percentage: 5 },
    ],
  },
};

const BASELINES: Record<string, BaselineConfig> = {
  compound: COMPOUND_BASELINE,
  lido: LIDO_BASELINE,
};

export function getBaselineConfig(id: string): BaselineConfig | undefined {
  return BASELINES[id];
}

export function listBaselineIds(): string[] {
  return Object.keys(BASELINES);
}
