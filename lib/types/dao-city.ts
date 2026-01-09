// DAO City - Multi-DAO Type Definitions

import type { SimulationSettings } from '../config/settings';

// =============================================================================
// DAO Configuration Types
// =============================================================================

export interface AgentCountConfig {
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
  num_rl_traders: number;
  num_governance_experts: number;
  num_risk_managers: number;
  num_market_makers: number;
  num_whistleblowers: number;
}

export interface DAOConfig {
  id: string;
  name: string;
  tokenSymbol: string;
  initialTreasuryFunding: number;
  governanceRule: string;
  agentCounts: Partial<AgentCountConfig>;
  color: string;
  // Optional DAO-specific settings
  violationProbability?: number;
  reputationPenalty?: number;
  commentProbability?: number;
  stakingInterestRate?: number;
  slashFraction?: number;
  reputationDecayRate?: number;
}

export interface GlobalMarketplaceConfig {
  initialLiquidity: number;
  volatility: number;
  priceUpdateFrequency: number;
  baseTokenSymbol?: string; // Reference token for pricing (e.g., "STABLE")
}

export interface DAOCityConfig {
  daos: DAOConfig[];
  globalMarketplaceConfig: GlobalMarketplaceConfig;
  bridgeFeeRate: number;
  bridgeDelay: number;
  enableInterDAOProposals: boolean;
  // Simulation settings applied to all DAOs
  baseSettings?: Partial<SimulationSettings>;
}

// =============================================================================
// Token & Marketplace Types
// =============================================================================

export interface TokenRanking {
  daoId: string;
  daoName: string;
  tokenSymbol: string;
  currentPrice: number;
  previousPrice: number;
  priceChange24h: number;
  priceChangePercent: number;
  volume24h: number;
  marketCap: number;
  rank: number;
  color: string;
}

export interface TokenPricePoint {
  step: number;
  price: number;
}

export interface TokenInfo {
  symbol: string;
  daoId: string;
  totalSupply: number;
  circulatingSupply: number;
  price: number;
  priceHistory: TokenPricePoint[];
}

export interface LiquidityPoolInfo {
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  totalLiquidity: number;
  fee: number;
}

// =============================================================================
// Member Transfer Types
// =============================================================================

export interface MemberTransferRequest {
  requestId: string;
  memberId: string;
  fromDaoId: string;
  toDaoId: string;
  requestStep: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  transferFee: number;
  cooldownSteps: number;
}

export interface MemberTransferResult {
  success: boolean;
  memberId: string;
  fromDaoId: string;
  toDaoId: string;
  fee: number;
  error?: string;
}

// =============================================================================
// Inter-DAO Proposal Types
// =============================================================================

export type InterDAOProposalType = 'collaboration' | 'treaty' | 'resource_sharing' | 'joint_venture';

export interface DAOVoteResult {
  daoId: string;
  votesFor: number;
  votesAgainst: number;
  totalEligibleVoters: number;
  quorumMet: boolean;
  approved: boolean | null; // null = pending
}

export interface InterDAOProposalData {
  uniqueId: string;
  title: string;
  description: string;
  proposalType: InterDAOProposalType;
  creatorDaoId: string;
  creatorMemberId: string;
  participatingDaos: string[];
  votingResults: Record<string, DAOVoteResult>;
  requiredApprovalCount: number;
  creationStep: number;
  votingPeriod: number;
  status: 'open' | 'approved' | 'rejected' | 'executed';
  // Proposal-specific data
  sharedBudget?: number;
  contributionRatios?: Record<string, number>;
  resourceType?: string;
  resourceAmount?: number;
}

// =============================================================================
// DAO City State Types
// =============================================================================

export interface DAOState {
  id: string;
  name: string;
  tokenSymbol: string;
  tokenPrice: number;
  treasuryBalance: number;
  memberCount: number;
  activeProposals: number;
  totalProposals: number;
  projectCount: number;
  guildCount: number;
  color: string;
}

export interface GlobalMarketplaceState {
  tokenCount: number;
  totalVolume24h: number;
  totalMarketCap: number;
  poolCount: number;
  rankings: TokenRanking[];
}

export interface BridgeState {
  fromDaoId: string;
  toDaoId: string;
  pendingTransfers: number;
  totalTransferred: number;
  feeRate: number;
}

export interface DAOCityState {
  currentStep: number;
  daos: DAOState[];
  globalMarketplace: GlobalMarketplaceState;
  interDaoProposals: InterDAOProposalData[];
  bridges: BridgeState[];
  recentTransfers: MemberTransferRequest[];
}

// =============================================================================
// Visualization Types
// =============================================================================

export interface DAOTowerPosition {
  daoId: string;
  x: number;
  y: number;
  z: number;
}

export interface DAOTowerData {
  daoId: string;
  name: string;
  tokenSymbol: string;
  color: string;
  position: [number, number, number];
  height: number; // Based on member count or treasury
  memberCount: number;
  treasuryBalance: number;
  tokenPrice: number;
  rank: number;
}

export interface DAOMemberCityData {
  id: string;
  daoId: string;
  type: string;
  activity: string;
  floor: number;
  tokens: number;
  reputation: number;
  isTransferring?: boolean;
  transferTargetDaoId?: string;
}

export interface InterDAOEdge {
  fromDaoId: string;
  toDaoId: string;
  type: 'bridge' | 'proposal' | 'transfer';
  weight: number;
  active: boolean;
}

export interface DAOCityNetworkData {
  towers: DAOTowerData[];
  interDaoEdges: InterDAOEdge[];
  membersByDao: Record<string, DAOMemberCityData[]>;
}

// =============================================================================
// Socket Event Types
// =============================================================================

export interface CityStepPayload {
  step: number;
  daos: DAOState[];
  mode: 'single' | 'multi';
}

export interface TokenRankingsPayload {
  rankings: TokenRanking[];
  totalMarketCap: number;
  totalVolume: number;
}

export interface InterDAOProposalsPayload {
  proposals: InterDAOProposalData[];
  activeCount: number;
}

export interface DAOUpdatePayload {
  daoId: string;
  state: DAOState;
  members: DAOMemberCityData[];
  proposals: any[];
  projects: any[];
  guilds: any[];
}

export interface MemberTransferPayload {
  transfer: MemberTransferRequest;
  result?: MemberTransferResult;
}

export interface BridgeActivityPayload {
  bridges: BridgeState[];
  recentTransfers: Array<{
    fromDaoId: string;
    toDaoId: string;
    amount: number;
    token: string;
    step: number;
  }>;
}

// =============================================================================
// Default Configurations
// =============================================================================

export const DEFAULT_AGENT_COUNTS: AgentCountConfig = {
  num_developers: 5,
  num_investors: 3,
  num_traders: 2,
  num_adaptive_investors: 1,
  num_delegators: 3,
  num_liquid_delegators: 1,
  num_proposal_creators: 3,
  num_validators: 3,
  num_service_providers: 2,
  num_arbitrators: 1,
  num_regulators: 1,
  num_auditors: 1,
  num_bounty_hunters: 1,
  num_external_partners: 1,
  num_passive_members: 5,
  num_artists: 1,
  num_collectors: 1,
  num_speculators: 1,
  num_rl_traders: 1,
  num_governance_experts: 1,
  num_risk_managers: 1,
  num_market_makers: 1,
  num_whistleblowers: 1,
};

export const DEFAULT_DAO_CONFIGS: DAOConfig[] = [
  {
    id: 'alpha',
    name: 'Alpha DAO',
    tokenSymbol: 'ALPHA',
    initialTreasuryFunding: 100000,
    governanceRule: 'majority',
    agentCounts: { ...DEFAULT_AGENT_COUNTS },
    color: '#4ADE80', // Green
  },
  {
    id: 'beta',
    name: 'Beta DAO',
    tokenSymbol: 'BETA',
    initialTreasuryFunding: 80000,
    governanceRule: 'supermajority',
    agentCounts: { ...DEFAULT_AGENT_COUNTS, num_developers: 8, num_traders: 4 },
    color: '#60A5FA', // Blue
  },
  {
    id: 'gamma',
    name: 'Gamma DAO',
    tokenSymbol: 'GAMMA',
    initialTreasuryFunding: 120000,
    governanceRule: 'quorum',
    agentCounts: { ...DEFAULT_AGENT_COUNTS, num_investors: 6, num_artists: 4 },
    color: '#F472B6', // Pink
  },
];

export const DEFAULT_CITY_CONFIG: DAOCityConfig = {
  daos: DEFAULT_DAO_CONFIGS,
  globalMarketplaceConfig: {
    initialLiquidity: 50000,
    volatility: 0.02,
    priceUpdateFrequency: 1,
    baseTokenSymbol: 'STABLE',
  },
  bridgeFeeRate: 0.01,
  bridgeDelay: 5,
  enableInterDAOProposals: true,
};
