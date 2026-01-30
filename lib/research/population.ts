import type { SimulationSettings } from '../config/settings';

export interface PopulationDistributionEntry {
  archetype: string;
  percentage: number;
}

export interface PopulationSpec {
  totalMembers: number;
  distribution: PopulationDistributionEntry[];
}

export interface PopulationOverride {
  totalMembers?: number;
  distribution?: PopulationDistributionEntry[];
}

const ARCHETYPE_AGENT_MAP: Record<string, { agents: string[]; weights: number[] }> = {
  passive_holder: {
    agents: ['passive_members'],
    weights: [1],
  },
  active_voter: {
    agents: ['proposal_creators', 'delegators'],
    weights: [0.4, 0.6],
  },
  delegate: {
    agents: ['delegators', 'liquid_delegators', 'governance_experts'],
    weights: [0.4, 0.3, 0.3],
  },
  whale: {
    agents: ['investors', 'adaptive_investors'],
    weights: [0.6, 0.4],
  },
  governance_expert: {
    agents: ['governance_experts', 'proposal_creators'],
    weights: [0.7, 0.3],
  },
  security_council: {
    agents: ['validators', 'risk_managers', 'auditors'],
    weights: [0.4, 0.3, 0.3],
  },
  citizen: {
    agents: ['proposal_creators', 'delegators', 'passive_members'],
    weights: [0.3, 0.3, 0.4],
  },
  steward: {
    agents: ['governance_experts', 'proposal_creators', 'auditors'],
    weights: [0.4, 0.4, 0.2],
  },
  staker: {
    agents: ['stakers'],
    weights: [1],
  },
  builder: {
    agents: ['developers', 'service_providers'],
    weights: [0.7, 0.3],
  },
};

const AGENT_KEY_MAP: Record<string, keyof SimulationSettings> = {
  developers: 'num_developers',
  investors: 'num_investors',
  traders: 'num_traders',
  adaptive_investors: 'num_adaptive_investors',
  delegators: 'num_delegators',
  liquid_delegators: 'num_liquid_delegators',
  proposal_creators: 'num_proposal_creators',
  validators: 'num_validators',
  service_providers: 'num_service_providers',
  arbitrators: 'num_arbitrators',
  regulators: 'num_regulators',
  auditors: 'num_auditors',
  bounty_hunters: 'num_bounty_hunters',
  external_partners: 'num_external_partners',
  passive_members: 'num_passive_members',
  artists: 'num_artists',
  collectors: 'num_collectors',
  speculators: 'num_speculators',
  stakers: 'num_stakers',
  rl_traders: 'num_rl_traders',
  governance_experts: 'num_governance_experts',
  risk_managers: 'num_risk_managers',
  market_makers: 'num_market_makers',
  whistleblowers: 'num_whistleblowers',
};

const AGENT_COUNT_FIELDS: Array<keyof SimulationSettings> = [
  'num_developers',
  'num_investors',
  'num_traders',
  'num_adaptive_investors',
  'num_delegators',
  'num_liquid_delegators',
  'num_proposal_creators',
  'num_validators',
  'num_service_providers',
  'num_arbitrators',
  'num_regulators',
  'num_auditors',
  'num_bounty_hunters',
  'num_external_partners',
  'num_passive_members',
  'num_artists',
  'num_collectors',
  'num_speculators',
  'num_stakers',
  'num_rl_traders',
  'num_governance_experts',
  'num_risk_managers',
  'num_market_makers',
  'num_whistleblowers',
];

type AgentCountKey = (typeof AGENT_COUNT_FIELDS)[number];

export function buildAgentCounts(population: PopulationSpec): Partial<SimulationSettings> {
  const totalMembers = population.totalMembers;
  const distribution = population.distribution;

  const counts: Record<string, number> = {};
  for (const agentType of Object.keys(AGENT_KEY_MAP)) {
    counts[agentType] = 0;
  }

  for (const entry of distribution) {
    const archetypeMembers = Math.round(totalMembers * (entry.percentage / 100));
    const mapping = ARCHETYPE_AGENT_MAP[entry.archetype];
    if (!mapping) {
      continue;
    }

    for (let i = 0; i < mapping.agents.length; i++) {
      const agentType = mapping.agents[i];
      const weight = mapping.weights[i];
      counts[agentType] = (counts[agentType] || 0) + Math.round(archetypeMembers * weight);
    }
  }

  if (counts.proposal_creators < 1) counts.proposal_creators = 1;
  if (counts.delegators < 1) counts.delegators = 1;

  counts.traders = Math.max(1, Math.round(totalMembers * 0.02));
  counts.speculators = Math.max(1, Math.round(totalMembers * 0.02));
  counts.whistleblowers = Math.max(1, Math.round(totalMembers * 0.01));

  const result: Partial<Record<AgentCountKey, number>> = {};
  for (const [agentType, count] of Object.entries(counts)) {
    const key = AGENT_KEY_MAP[agentType];
    if (key) {
      (result as any)[key] = count;
    }
  }

  for (const key of AGENT_COUNT_FIELDS) {
    if (result[key] === undefined && key.startsWith('num_')) {
      result[key] = 0;
    }
  }

  return result as Partial<SimulationSettings>;
}

export function mergePopulation(
  base?: PopulationSpec,
  override?: PopulationOverride
): PopulationSpec | undefined {
  if (!base && !override) {
    return undefined;
  }

  const totalMembers = override?.totalMembers ?? base?.totalMembers;
  const distribution = override?.distribution ?? base?.distribution;

  if (totalMembers === undefined || !distribution) {
    throw new Error('Population config requires totalMembers and distribution');
  }

  return {
    totalMembers,
    distribution: JSON.parse(JSON.stringify(distribution)) as PopulationDistributionEntry[],
  };
}
