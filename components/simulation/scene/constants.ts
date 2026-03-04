/**
 * Shared constants for the 3D skyscraper DAO visualization.
 */

export interface FloorConfig {
  id: string;
  name: string;
  yBase: number;
  height: number;
  color: string;
  agentTypes: string[];
}

export const FLOORS: FloorConfig[] = [
  {
    id: 'B1',
    name: 'Treasury Vault',
    yBase: -2,
    height: 2,
    color: '#d4a017',
    agentTypes: [],
  },
  {
    id: 'F1',
    name: 'Trading Floor',
    yBase: 0,
    height: 3,
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
    id: 'F2',
    name: 'Governance Chamber',
    yBase: 3,
    height: 3,
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
    id: 'F3',
    name: 'Workshop',
    yBase: 6,
    height: 3,
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
    id: 'F4',
    name: 'Council Room',
    yBase: 9,
    height: 3,
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
    id: 'F5',
    name: 'Observatory',
    yBase: 12,
    height: 2,
    color: '#22d3ee',
    agentTypes: ['Collector', 'StakerAgent', 'PassiveMember'],
  },
];

/** Map agent type → floor id (derived from FLOORS) */
export const AGENT_FLOOR_MAP: Record<string, string> = {};
for (const floor of FLOORS) {
  for (const t of floor.agentTypes) {
    AGENT_FLOOR_MAP[t] = floor.id;
  }
}

/** Get floor config by id */
export function getFloor(id: string): FloorConfig | undefined {
  return FLOORS.find(f => f.id === id);
}

/** Agent floors only (excludes basement) */
export const AGENT_FLOORS = FLOORS.filter(f => f.agentTypes.length > 0);

/** Building dimensions */
export const BUILDING = {
  width: 8,
  depth: 6,
  /** Top of the highest floor */
  topY: 14,
  /** Bottom of the basement */
  bottomY: -2,
};

/** Agent type → color */
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
