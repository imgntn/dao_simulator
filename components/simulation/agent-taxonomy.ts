/**
 * Shared agent taxonomy for the simulator UI.
 *
 * The current Sanctum visualization uses halls rather than the archived
 * legacy renderer, but these groupings still provide a compact way to
 * organize controls, legends, and dashboard colors.
 */

export interface AgentGroupConfig {
  id: string;
  name: string;
  color: string;
  agentTypes: string[];
}

export const AGENT_GROUPS: AgentGroupConfig[] = [
  {
    id: 'market',
    name: 'Market Hall',
    color: '#f59e0b',
    agentTypes: [
      'Trader',
      'Investor',
      'AdaptiveInvestor',
      'Speculator',
      'RLTrader',
      'MarketMaker',
    ],
  },
  {
    id: 'governance',
    name: 'Governance Hall',
    color: '#8b5cf6',
    agentTypes: [
      'ProposalCreator',
      'GovernanceExpert',
      'GovernanceWhale',
      'Delegator',
      'LiquidDelegator',
      'Validator',
    ],
  },
  {
    id: 'workshop',
    name: 'Workshop',
    color: '#3b82f6',
    agentTypes: [
      'Developer',
      'ServiceProvider',
      'BountyHunter',
      'Artist',
      'Auditor',
    ],
  },
  {
    id: 'council',
    name: 'Council Hall',
    color: '#f97316',
    agentTypes: [
      'Regulator',
      'Arbitrator',
      'RiskManager',
      'Whistleblower',
      'ExternalPartner',
    ],
  },
  {
    id: 'observatory',
    name: 'Observatory',
    color: '#22d3ee',
    agentTypes: ['Collector', 'StakerAgent', 'PassiveMember'],
  },
];

/** Backward-compatible aliases for UI code that still uses floor terminology. */
export const FLOORS = AGENT_GROUPS;
export const AGENT_FLOORS = AGENT_GROUPS;

export const AGENT_FLOOR_MAP: Record<string, string> = {};
for (const group of AGENT_GROUPS) {
  for (const type of group.agentTypes) {
    AGENT_FLOOR_MAP[type] = group.id;
  }
}

export const AGENT_TYPE_INFO: Record<string, { displayName: string; description: string }> = {
  Trader: { displayName: 'Trader', description: 'Swaps tokens based on price momentum' },
  Investor: { displayName: 'Investor', description: 'Allocates capital across the DAO treasury' },
  AdaptiveInvestor: { displayName: 'Adaptive Investor', description: 'Adjusts investment strategy to market conditions' },
  Speculator: { displayName: 'Speculator', description: 'Makes high-risk bets on token price swings' },
  RLTrader: { displayName: 'RL Trader', description: 'Uses reinforcement learning to optimize trades' },
  MarketMaker: { displayName: 'Market Maker', description: 'Provides liquidity and stabilizes token price' },
  ProposalCreator: { displayName: 'Proposal Creator', description: 'Drafts and submits governance proposals' },
  GovernanceExpert: { displayName: 'Governance Expert', description: 'Analyzes proposals with deep governance knowledge' },
  GovernanceWhale: { displayName: 'Governance Whale', description: 'Large token holder with outsized voting power' },
  Delegator: { displayName: 'Delegator', description: 'Delegates voting power to trusted representatives' },
  LiquidDelegator: { displayName: 'Liquid Delegator', description: 'Dynamically re-delegates based on performance' },
  Validator: { displayName: 'Validator', description: 'Validates transactions and secures the network' },
  Developer: { displayName: 'Developer', description: 'Builds and maintains protocol infrastructure' },
  ServiceProvider: { displayName: 'Service Provider', description: 'Offers specialized services to the DAO' },
  BountyHunter: { displayName: 'Bounty Hunter', description: 'Completes tasks and bounties for rewards' },
  Artist: { displayName: 'Artist', description: 'Creates visual and cultural assets for the DAO' },
  Auditor: { displayName: 'Auditor', description: 'Reviews code and finances for security risks' },
  Regulator: { displayName: 'Regulator', description: 'Monitors compliance with DAO rules and norms' },
  Arbitrator: { displayName: 'Arbitrator', description: 'Resolves disputes between DAO members' },
  RiskManager: { displayName: 'Risk Manager', description: 'Assesses and mitigates financial and protocol risks' },
  Whistleblower: { displayName: 'Whistleblower', description: 'Flags suspicious activity and governance attacks' },
  ExternalPartner: { displayName: 'External Partner', description: 'Represents outside organizations collaborating with the DAO' },
  Collector: { displayName: 'Collector', description: 'Accumulates governance tokens and NFTs' },
  StakerAgent: { displayName: 'Staker', description: 'Stakes tokens to earn yield and secure the network' },
  PassiveMember: { displayName: 'Passive Member', description: 'Holds tokens but rarely participates in governance' },
};

export function getDisplayName(type: string): string {
  return AGENT_TYPE_INFO[type]?.displayName ?? type;
}

export const TYPE_COLOR_MAP: Record<string, string> = {
  Developer: '#3b82f6',
  Investor: '#10b981',
  Trader: '#f59e0b',
  AdaptiveInvestor: '#34d399',
  Delegator: '#8b5cf6',
  LiquidDelegator: '#a78bfa',
  ProposalCreator: '#ec4899',
  Validator: '#06b6d4',
  ServiceProvider: '#14b8a6',
  Arbitrator: '#f97316',
  Regulator: '#64748b',
  Auditor: '#0ea5e9',
  BountyHunter: '#84cc16',
  ExternalPartner: '#d946ef',
  PassiveMember: '#6b7280',
  Artist: '#f43f5e',
  Collector: '#a855f7',
  Speculator: '#eab308',
  RLTrader: '#22c55e',
  GovernanceExpert: '#14b8a6',
  GovernanceWhale: '#f43f5e',
  RiskManager: '#84cc16',
  MarketMaker: '#0891b2',
  Whistleblower: '#dc2626',
  StakerAgent: '#22d3ee',
};
