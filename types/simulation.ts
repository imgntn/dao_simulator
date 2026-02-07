// Core type definitions for the DAO Simulation

export interface Agent {
  uniqueId: string;
  step(): void;
}

export interface Model {
  currentStep: number;
  schedule: Scheduler;
  step(): void;
}

export interface Scheduler {
  agents: Agent[];
  steps: number;
  add(agent: Agent): void;
  remove(agent: Agent): void;
  has(agent: Agent): boolean;
  step(): void | Promise<void>;
}

export interface EventData {
  event: string;
  step: number;
  [key: string]: any;
}

export type EventCallback = (data: EventData) => void;

export interface EventBus {
  subscribe(event: string, callback: EventCallback): void;
  unsubscribe(event: string, callback: EventCallback): void;
  publish(event: string, data: Omit<EventData, 'event'>): void;
}

export interface PriceOracle {
  getPrice(token: string): number;
  setPrice(token: string, price: number): void;
  updatePrice(token: string, step?: number, volatility?: number): void;
}

// Data Structure Types
export interface ProposalData {
  uniqueId: string;
  title: string;
  description?: string;
  proposalType: string;
  fundingGoal: number;
  currentFunding: number;
  creationTime: number;
  votingPeriod: number;
  duration?: number;
  status: 'open' | 'approved' | 'rejected' | 'completed' | 'expired';
  closed: boolean;
  votes: Map<string, { vote: boolean; weight: number }>;
  yesVotes: number;
  noVotes: number;
  creator?: string;
}

export interface ProjectData {
  uniqueId: string;
  title: string;
  description?: string;
  fundingGoal: number;
  currentFunding: number;
  duration: number;
  startTime: number;
  status: string;
  progress: number;
  members: string[];
  skills: string[];
}

export interface GuildData {
  name: string;
  members: string[];
  treasury: number;
  reputation: number;
  creator?: string;
}

export interface DisputeData {
  id: string;
  parties: string[];
  description: string;
  importance: number;
  resolved: boolean;
  relatedProject?: string;
  relatedMember?: string;
}

export interface ViolationData {
  id: string;
  violator: string;
  description: string;
  penalty: number;
  detected: boolean;
}

export interface NFTData {
  id: string;
  creator: string;
  title: string;
  price: number;
  listed: boolean;
  owner: string;
  royalty: number;
}

export interface LiquidityPoolData {
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
}

export interface MarketShockData {
  step: number;
  magnitude: number;
  duration: number;
}

export interface TreasuryData {
  tokens: Map<string, number>;
  lockedTokens: Map<string, number>;
  liquidityPools: Map<string, LiquidityPoolData>;
  oracle: PriceOracle;
}

export interface DAOData {
  name: string;
  proposals: ProposalData[];
  projects: ProjectData[];
  disputes: DisputeData[];
  violations: ViolationData[];
  members: string[];
  guilds: GuildData[];
  treasury: TreasuryData;
  currentStep: number;
}

// Agent Types
export interface DAOMemberData {
  uniqueId: string;
  tokens: number;
  reputation: number;
  location: string;
  guild?: string;
  votingStrategy: string;
  votes: Map<string, { vote: boolean; weight: number }>;
  delegations: Map<string, number>;
  stakedTokens: number;
}

export interface DeveloperData extends DAOMemberData {
  skills: string[];
  experienceLevel: number;
}

export interface InvestorData extends DAOMemberData {
  riskTolerance: number;
  investmentHistory: Array<{ proposalId: string; amount: number; return: number }>;
}

export interface TraderData extends DAOMemberData {
  tradingHistory: Array<{ tokenIn: string; tokenOut: string; amount: number }>;
  profitLoss: number;
}

// Settings
export interface SimulationSettings {
  numDevelopers: number;
  numInvestors: number;
  numTraders: number;
  numAdaptiveInvestors: number;
  numDelegators: number;
  numLiquidDelegators: number;
  numProposalCreators: number;
  numValidators: number;
  numServiceProviders: number;
  numArbitrators: number;
  numRegulators: number;
  numAuditors: number;
  numBountyHunters: number;
  numExternalPartners: number;
  numPassiveMembers: number;
  numArtists: number;
  numCollectors: number;
  numSpeculators: number;
  numStakers: number;
  violationProbability: number;
  reputationPenalty: number;
  commentProbability: number;
  proposalCreationProbability: number;
  proposalDurationSteps: number;
  proposalDurationMinSteps: number;
  proposalDurationMaxSteps: number;
  externalPartnerInteractProbability: number;
  stakingInterestRate: number;
  slashFraction: number;
  reputationDecayRate: number;
  marketShockFrequency: number;
  priceVolatility: number;
  adaptiveLearningRate: number;
  adaptiveEpsilon: number;
  governanceRule: string;
  enableMarketing: boolean;
  marketingLevel: string;
  enablePlayer: boolean;
  tokenEmissionRate: number;
  tokenBurnRate: number;
}

// Data Collection
export interface DataCollectorData {
  modelVars: any[];
  eventCounts: Map<string, number>;
  priceHistory: number[];
  giniHistory: number[];
  reputationGiniHistory: number[];
  avgTokenHistory: number[];
  delegationCentrality: Array<Map<string, number>>;
  tokenRankingHistory: Array<Array<[string, number]>>;
  influenceRankingHistory: Array<Array<[string, number]>>;
  achievements: Map<string, string>;
  campaignHistory: any[];
  history: Array<{
    step: number;
    memberCount: number;
    proposalCount: number;
    projectCount: number;
    tokenPrice: number;
    treasuryFunds: number;
  }>;
}

// WebSocket Events
export interface WebSocketMessage extends EventData {
  type: 'event' | 'snapshot' | 'update';
}

export interface SnapshotData {
  type: 'snapshot';
  step: number;
  agents: Array<{
    id: string;
    type: string;
    tokens: number;
    reputation: number;
    guild?: string;
  }>;
  proposals: Array<{
    id: string;
    title: string;
    status: string;
    fundingGoal: number;
    currentFunding: number;
    creationTime: number;
    votingPeriod: number;
  }>;
  projects: Array<{
    uniqueId: string;
    title: string;
    progress: number;
    duration: number;
    startTime: number;
    fundingGoal: number;
    currentFunding: number;
  }>;
}

// API Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StartSimulationRequest {
  settings?: Partial<SimulationSettings>;
}

export interface RunSimulationRequest {
  steps: number;
}

export interface PlayerVoteRequest {
  id: number;
  vote: boolean;
}

export interface PlayerCommentRequest {
  id: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface PlayerDelegateRequest {
  id: number;
  amount: number;
}

export interface PlayerSwapRequest {
  tokenIn: string;
  tokenOut: string;
  amount: number;
}

export interface PlayerLiquidityRequest {
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
}

export interface PlayerRemoveLiquidityRequest {
  tokenA: string;
  tokenB: string;
  share: number;
}
