# Blockchain Integration & Backtesting Platform

## Executive Summary

Integrate real blockchain data to transform the DAO Simulator from a theoretical model into an **empirically validated governance research platform**. This enables:

- **Backtesting**: Replay historical governance events to validate simulation accuracy
- **Live Sync**: Keep digital twins synchronized with their real-world counterparts
- **Prediction**: Forecast governance outcomes based on current on-chain state
- **Calibration**: Tune agent parameters using real voting behavior data

---

## Why Blockchain Integration Matters

### Current Limitation
Our digital twins are based on *documented* governance rules, but governance is shaped by:
- Actual token distributions (not theoretical ones)
- Real delegate behavior patterns
- Historical participation rates
- Treasury dynamics and market conditions

### With Real Data
| Capability | Without Integration | With Integration |
|------------|--------------------|--------------------|
| Token distribution | Estimated/synthetic | Actual on-chain balances |
| Delegate behavior | Archetype-based | Calibrated from voting history |
| Participation rates | Configured guess | Measured from real votes |
| Proposal outcomes | Simulated | Validated against reality |
| Governance changes | Manual updates | Auto-synced |

---

## Data Sources Architecture

### Primary Data Sources

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BLOCKCHAIN DATA SOURCES                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   ARCHIVE RPC   │  │    INDEXERS     │  │   GOVERNANCE    │        │
│  │     NODES       │  │                 │  │     APIs        │        │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤        │
│  │ • Alchemy       │  │ • The Graph     │  │ • Tally         │        │
│  │ • Infura        │  │ • Dune Analytics│  │ • Boardroom     │        │
│  │ • QuickNode     │  │ • Flipside      │  │ • Snapshot      │        │
│  │ • Chainstack    │  │ • Covalent      │  │ • DeepDAO       │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│           │                    │                    │                  │
│           └────────────────────┼────────────────────┘                  │
│                                ▼                                        │
│                    ┌─────────────────────┐                             │
│                    │   UNIFIED DATA API  │                             │
│                    └─────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Types by Source

| Data Type | Primary Source | Backup Source | Update Frequency |
|-----------|---------------|---------------|------------------|
| Token balances | RPC / The Graph | Dune | Real-time / Hourly |
| Delegations | RPC / The Graph | Tally | Real-time / Hourly |
| Proposals | The Graph / Tally | Boardroom | Real-time |
| Votes | The Graph / Tally | Dune | Real-time |
| Snapshot votes | Snapshot API | Boardroom | Real-time |
| Treasury | RPC / DefiLlama | Dune | Hourly |
| Forum activity | Discourse API | Manual | Daily |
| Token prices | CoinGecko / DeFiLlama | Chainlink | Minute |

---

## Supported DAOs & Contracts

### Ethereum Mainnet

| DAO | Governor Contract | Token Contract | Timelock | Subgraph |
|-----|------------------|----------------|----------|----------|
| **Uniswap** | `0x408ED6354d4973f66138C91495F2f2FCbd8724C3` | `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984` | `0x1a9C8182C09F50C8318d769245beA52c32BE35BC` | ✅ |
| **Compound** | `0xc0Da02939E1441F497fd74F78cE7Decb17B66529` | `0xc00e94Cb662C3520282E6f5717214004A7f26888` | `0x6d903f6003cca6255D85CcA4D3B5E5146dC33925` | ✅ |
| **Aave** | `0xEC568fffba86c094cf06b22134B23074DFE2252c` | `0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9` | Multiple | ✅ |
| **ENS** | `0x323A76393544d5ecca80cd6ef2A560C6a395b7E3` | `0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72` | `0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7` | ✅ |
| **Gitcoin** | `0xDbD27635A534A3d3169Ef0498beB56Fb9c937489` | `0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F` | `0x57a8865cfB1eCEf7253c27da6B4BC3dAEE5Be518` | ✅ |
| **Lido** | Aragon Voting | `0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32` | Aragon Agent | ✅ |
| **MakerDAO** | DSChief | `0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2` | DSPause | Custom |

### Layer 2

| DAO | Chain | Governor | Token | Bridge |
|-----|-------|----------|-------|--------|
| **Arbitrum** | Arbitrum One | `0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9` | `0x912CE59144191C1204E64559FE8253a0e49E6548` | L1→L2 |
| **Optimism** | OP Mainnet | `0xcDF27F107725988f2261Ce2256bDfCdE8B382B10` | `0x4200000000000000000000000000000000000042` | L1→L2 |

### Off-Chain Governance

| Platform | DAOs Using | Data Available |
|----------|------------|----------------|
| **Snapshot** | All 9 twins | Proposals, votes, strategies, spaces |
| **Discourse** | Most DAOs | Forum posts, discussions, sentiment |

---

## Data Models

### Core Interfaces

```typescript
// ===== Blockchain State Types =====

interface OnChainGovernanceState {
  daoId: string;
  blockNumber: number;
  timestamp: Date;

  // Token state
  tokenState: {
    totalSupply: bigint;
    circulatingSupply: bigint;
    holders: TokenHolder[];
    topHolders: TokenHolder[];  // Top 100
  };

  // Delegation state
  delegationState: {
    totalDelegated: bigint;
    delegates: DelegateInfo[];
    delegationGraph: DelegationEdge[];
  };

  // Governance parameters
  governanceParams: {
    proposalThreshold: bigint;
    quorumVotes: bigint;
    votingDelay: number;      // blocks
    votingPeriod: number;     // blocks
    timelockDelay: number;    // seconds
  };

  // Treasury
  treasury: {
    nativeBalance: bigint;
    tokenBalances: TokenBalance[];
    totalValueUSD: number;
  };
}

interface TokenHolder {
  address: string;
  balance: bigint;
  votingPower: bigint;        // May differ due to delegation
  delegatedTo: string | null;
  isDelegating: boolean;
  isDelegate: boolean;
}

interface DelegateInfo {
  address: string;
  delegatedVotes: bigint;
  delegatorCount: number;
  votingParticipation: number;  // 0-1
  proposalsCreated: number;
  proposalsVotedOn: number;
  recentVotes: VoteRecord[];
}

interface DelegationEdge {
  from: string;
  to: string;
  amount: bigint;
  timestamp: Date;
}

// ===== Historical Data Types =====

interface HistoricalProposal {
  id: string;
  daoId: string;
  proposalNumber: number;

  // Content
  title: string;
  description: string;
  ipfsHash?: string;

  // Lifecycle
  proposer: string;
  createdBlock: number;
  createdTimestamp: Date;
  startBlock: number;
  endBlock: number;
  executedBlock?: number;
  cancelledBlock?: number;

  // Voting
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  quorumVotes: bigint;

  // Outcome
  state: ProposalState;
  passed: boolean;
  executed: boolean;

  // Actions
  targets: string[];
  values: bigint[];
  calldatas: string[];
  signatures: string[];

  // Metadata
  snapshotId?: string;        // If temp check on Snapshot
  forumUrl?: string;
  category?: string;
}

type ProposalState =
  | 'Pending'
  | 'Active'
  | 'Canceled'
  | 'Defeated'
  | 'Succeeded'
  | 'Queued'
  | 'Expired'
  | 'Executed';

interface HistoricalVote {
  proposalId: string;
  voter: string;
  support: 0 | 1 | 2;         // Against, For, Abstain
  weight: bigint;
  reason?: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
}

interface SnapshotProposal {
  id: string;
  space: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: string;           // Block number
  state: 'pending' | 'active' | 'closed';
  scores: number[];
  scores_total: number;
  votes: number;
  quorum: number;
  author: string;
}

interface SnapshotVote {
  id: string;
  voter: string;
  choice: number | number[];  // Single or multiple choice
  vp: number;                 // Voting power
  created: number;
  reason?: string;
}

// ===== Time Series Data =====

interface GovernanceMetrics {
  timestamp: Date;
  daoId: string;

  // Participation
  activeVoters7d: number;
  activeVoters30d: number;
  averageParticipationRate: number;

  // Proposals
  proposalsCreated7d: number;
  proposalsPassed7d: number;
  proposalsDefeated7d: number;
  averageVotingTurnout: number;

  // Delegation
  delegationRate: number;      // % of supply delegated
  activeDelegates: number;
  delegateConcentration: number; // Gini coefficient

  // Treasury
  treasuryValueUSD: number;
  treasuryChange7d: number;

  // Token
  tokenPriceUSD: number;
  tokenPriceChange7d: number;
  holderCount: number;
}
```

### Sync State Tracking

```typescript
interface SyncState {
  daoId: string;

  // Last synced positions
  lastSyncedBlock: number;
  lastSyncedTimestamp: Date;
  lastSnapshotSync: Date;
  lastForumSync: Date;

  // Sync health
  status: 'healthy' | 'degraded' | 'failed';
  lastError?: string;
  consecutiveFailures: number;

  // Data freshness
  dataLag: number;            // seconds behind chain
  pendingUpdates: number;
}

interface SyncJob {
  id: string;
  daoId: string;
  type: 'full' | 'incremental' | 'backfill';

  // Range
  fromBlock?: number;
  toBlock?: number;
  fromDate?: Date;
  toDate?: Date;

  // Progress
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;           // 0-100
  itemsProcessed: number;
  itemsTotal: number;

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}
```

---

## Backtesting Framework

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKTESTING ENGINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    HISTORICAL DATA STORE                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │   │
│  │  │ Proposals │  │   Votes   │  │  Holders  │  │ Delegates │    │   │
│  │  │  Archive  │  │  Archive  │  │ Snapshots │  │  History  │    │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    STATE RECONSTRUCTOR                           │   │
│  │                                                                  │   │
│  │  "What did the DAO look like at block 18,500,000?"              │   │
│  │                                                                  │   │
│  │  • Token distribution at block N                                │   │
│  │  • Delegation graph at block N                                  │   │
│  │  • Active proposals at block N                                  │   │
│  │  • Treasury state at block N                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    SIMULATION RUNNER                             │   │
│  │                                                                  │   │
│  │  1. Initialize digital twin with historical state               │   │
│  │  2. Inject historical proposal                                  │   │
│  │  3. Run simulation through voting period                        │   │
│  │  4. Record predicted outcome                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    OUTCOME COMPARATOR                            │   │
│  │                                                                  │   │
│  │  Predicted: PASSED (62% For)  │  Actual: PASSED (58% For)       │   │
│  │  Predicted Turnout: 15%       │  Actual Turnout: 12%            │   │
│  │  Error: 4% vote share, 3% turnout                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Backtest Configuration

```typescript
interface BacktestConfig {
  name: string;
  description: string;

  // Target
  daoId: string;

  // Time range
  fromBlock: number;
  toBlock: number;
  // OR
  fromDate: Date;
  toDate: Date;

  // Proposal filter
  proposalFilter?: {
    minVotes?: number;
    minParticipation?: number;
    categories?: string[];
    excludeIds?: string[];
  };

  // Simulation settings
  simulationConfig: {
    stepsPerBlock: number;      // Simulation granularity
    agentCalibration: 'default' | 'historical' | 'custom';
    randomSeed?: number;
    runs: number;               // For Monte Carlo
  };

  // What to measure
  metrics: BacktestMetric[];
}

type BacktestMetric =
  | 'outcome_accuracy'          // Did we predict pass/fail correctly?
  | 'vote_share_error'          // MAE on for/against percentages
  | 'turnout_error'             // MAE on participation rate
  | 'quorum_prediction'         // Did we predict quorum reached?
  | 'timing_accuracy'           // When did vote conclude vs prediction
  | 'delegate_behavior'         // Did key delegates vote as predicted?
  | 'whale_influence';          // Did whales behave as expected?

interface BacktestResult {
  config: BacktestConfig;

  // Overall metrics
  proposalsAnalyzed: number;
  outcomeAccuracy: number;      // % correct pass/fail
  avgVoteShareError: number;    // Mean absolute error
  avgTurnoutError: number;

  // Per-proposal results
  proposalResults: ProposalBacktestResult[];

  // Insights
  insights: BacktestInsight[];

  // Calibration recommendations
  calibrationSuggestions: CalibrationSuggestion[];
}

interface ProposalBacktestResult {
  proposalId: string;
  proposalTitle: string;

  // Actual outcome
  actualOutcome: 'passed' | 'defeated' | 'cancelled';
  actualForPercent: number;
  actualAgainstPercent: number;
  actualTurnout: number;

  // Predicted outcome (mean of runs)
  predictedOutcome: 'passed' | 'defeated';
  predictedForPercent: number;
  predictedAgainstPercent: number;
  predictedTurnout: number;

  // Confidence intervals (from Monte Carlo)
  forPercentCI: [number, number];     // 95% CI
  turnoutCI: [number, number];

  // Errors
  outcomeCorrect: boolean;
  voteShareError: number;
  turnoutError: number;

  // Analysis
  divergenceReasons?: string[];
}

interface BacktestInsight {
  type: 'pattern' | 'anomaly' | 'calibration';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  evidence: any;
  recommendation?: string;
}

interface CalibrationSuggestion {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  rationale: string;
  expectedImprovement: number;
}
```

### Backtesting Use Cases

#### 1. Model Validation
```typescript
// "How accurate is our Uniswap model?"
const validation: BacktestConfig = {
  name: 'Uniswap Model Validation 2024',
  daoId: 'uniswap',
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-12-31'),
  simulationConfig: {
    stepsPerBlock: 1,
    agentCalibration: 'default',
    runs: 100,
  },
  metrics: ['outcome_accuracy', 'vote_share_error', 'turnout_error'],
};
```

#### 2. Agent Calibration
```typescript
// "Tune whale behavior based on real voting patterns"
const calibration: BacktestConfig = {
  name: 'Whale Calibration',
  daoId: 'compound',
  fromBlock: 18000000,
  toBlock: 19000000,
  proposalFilter: {
    minVotes: 1000000,  // Only significant proposals
  },
  simulationConfig: {
    agentCalibration: 'historical',
    runs: 50,
  },
  metrics: ['whale_influence', 'delegate_behavior'],
};
```

#### 3. Counterfactual Analysis
```typescript
// "What if Arbitrum had 3% quorum instead of 5%?"
const counterfactual: BacktestConfig = {
  name: 'Arbitrum Quorum Counterfactual',
  daoId: 'arbitrum',
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-06-01'),
  simulationConfig: {
    agentCalibration: 'historical',
    runs: 200,
    // Override governance params
    parameterOverrides: {
      'quorumConfig.baseQuorumPercent': 3,  // Changed from 5
    },
  },
  metrics: ['outcome_accuracy', 'quorum_prediction'],
};
```

---

## Real-Time Sync System

### Sync Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME SYNC SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│  │  EVENT      │     │   POLLING   │     │   WEBHOOK   │              │
│  │  LISTENER   │     │   SERVICE   │     │   RECEIVER  │              │
│  │             │     │             │     │             │              │
│  │ • New blocks│     │ • Hourly    │     │ • Snapshot  │              │
│  │ • Logs      │     │ • Daily     │     │ • Tally     │              │
│  │ • Pending TX│     │ • Treasury  │     │ • Custom    │              │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘              │
│         │                   │                   │                      │
│         └───────────────────┼───────────────────┘                      │
│                             ▼                                          │
│                    ┌─────────────────┐                                 │
│                    │   EVENT QUEUE   │                                 │
│                    │    (Redis)      │                                 │
│                    └────────┬────────┘                                 │
│                             │                                          │
│         ┌───────────────────┼───────────────────┐                      │
│         ▼                   ▼                   ▼                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│  │  PROPOSAL   │     │  VOTE       │     │  STATE      │              │
│  │  PROCESSOR  │     │  PROCESSOR  │     │  PROCESSOR  │              │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘              │
│         │                   │                   │                      │
│         └───────────────────┼───────────────────┘                      │
│                             ▼                                          │
│                    ┌─────────────────┐                                 │
│                    │  TWIN UPDATER   │                                 │
│                    │                 │                                 │
│                    │ Apply deltas to │                                 │
│                    │  digital twins  │                                 │
│                    └────────┬────────┘                                 │
│                             │                                          │
│                             ▼                                          │
│                    ┌─────────────────┐                                 │
│                    │  NOTIFICATION   │                                 │
│                    │    SERVICE      │                                 │
│                    │                 │                                 │
│                    │ • WebSocket     │                                 │
│                    │ • UI Updates    │                                 │
│                    │ • Alerts        │                                 │
│                    └─────────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sync Strategies

#### Event-Driven (Real-Time)
```typescript
interface EventDrivenSync {
  // Subscribe to contract events
  subscriptions: {
    proposalCreated: boolean;
    voteCast: boolean;
    proposalQueued: boolean;
    proposalExecuted: boolean;
    delegateChanged: boolean;
  };

  // Processing
  batchSize: number;          // Events per batch
  processingDelay: number;    // Wait for finality (blocks)

  // Error handling
  retryAttempts: number;
  backoffMultiplier: number;
}
```

#### Polling (Periodic)
```typescript
interface PollingSync {
  // Intervals
  intervals: {
    tokenHolders: '1h' | '6h' | '24h';
    delegations: '1h' | '6h' | '24h';
    treasury: '1h' | '6h' | '24h';
    governanceParams: '24h' | '7d';
    snapshotProposals: '15m' | '1h';
    forumActivity: '1h' | '6h' | '24h';
    tokenPrice: '1m' | '5m' | '15m';
  };

  // Reconciliation
  fullReconciliation: '24h' | '7d';  // Deep sync
}
```

### Digital Twin Updates

```typescript
interface TwinUpdateEvent {
  daoId: string;
  updateType: TwinUpdateType;
  timestamp: Date;
  blockNumber?: number;

  // The update payload
  payload: any;

  // Source tracking
  source: 'on-chain' | 'snapshot' | 'forum' | 'api';
  sourceId?: string;
}

type TwinUpdateType =
  // Proposals
  | 'proposal_created'
  | 'proposal_voted'
  | 'proposal_state_changed'
  | 'proposal_executed'

  // Delegation
  | 'delegation_changed'
  | 'voting_power_changed'

  // Governance
  | 'quorum_changed'
  | 'threshold_changed'
  | 'timelock_changed'

  // Treasury
  | 'treasury_transfer'
  | 'treasury_balance_changed'

  // Membership
  | 'holder_count_changed'
  | 'delegate_activated'
  | 'delegate_deactivated';

class TwinSyncService {
  // Apply a single update
  async applyUpdate(event: TwinUpdateEvent): Promise<void>;

  // Batch update
  async applyUpdates(events: TwinUpdateEvent[]): Promise<void>;

  // Full reconciliation
  async reconcile(daoId: string, onChainState: OnChainGovernanceState): Promise<void>;

  // Get current sync state
  getSyncState(daoId: string): SyncState;

  // Subscribe to updates
  onUpdate(callback: (event: TwinUpdateEvent) => void): void;
}
```

---

## Implementation Phases

### Phase 1: Data Infrastructure (4-6 weeks)

**Objective:** Build the foundation for blockchain data ingestion

#### 1.1 Data Layer Setup
```
lib/blockchain/
  types.ts                    # All TypeScript interfaces
  constants.ts                # Contract addresses, ABIs

lib/blockchain/providers/
  rpc-provider.ts             # Direct RPC calls
  graph-provider.ts           # The Graph queries
  snapshot-provider.ts        # Snapshot API
  tally-provider.ts           # Tally API
  dune-provider.ts            # Dune queries

lib/blockchain/cache/
  cache-manager.ts            # Multi-tier caching
  redis-cache.ts              # Hot cache
  file-cache.ts               # Cold cache (historical)
```

#### 1.2 Contract ABIs & Addresses
```typescript
// lib/blockchain/constants.ts
export const DAO_CONTRACTS = {
  uniswap: {
    chain: 'ethereum',
    governor: '0x408ED6354d4973f66138C91495F2f2FCbd8724C3',
    token: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    timelock: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
    subgraph: 'https://api.thegraph.com/subgraphs/name/uniswap/governance',
    snapshotSpace: 'uniswap',
  },
  // ... all 9 DAOs
};

export const GOVERNOR_ABI = [...];  // OpenZeppelin Governor ABI
export const ERC20_VOTES_ABI = [...];
```

#### 1.3 Core Provider Implementation
```typescript
// lib/blockchain/providers/graph-provider.ts
export class GraphProvider {
  async getProposals(daoId: string, options?: QueryOptions): Promise<HistoricalProposal[]>;
  async getVotes(proposalId: string): Promise<HistoricalVote[]>;
  async getTokenHolders(daoId: string, blockNumber?: number): Promise<TokenHolder[]>;
  async getDelegations(daoId: string, blockNumber?: number): Promise<DelegationEdge[]>;
}

// lib/blockchain/providers/rpc-provider.ts
export class RPCProvider {
  async getCurrentState(daoId: string): Promise<OnChainGovernanceState>;
  async getHistoricalState(daoId: string, blockNumber: number): Promise<OnChainGovernanceState>;
  async subscribeToEvents(daoId: string, callback: EventCallback): Subscription;
}
```

#### 1.4 Storage Layer
```
lib/blockchain/storage/
  time-series.ts              # InfluxDB/TimescaleDB for metrics
  document-store.ts           # MongoDB for proposals/votes
  file-store.ts               # Parquet for bulk historical
```

#### Phase 1 Deliverables
- [ ] Connect to archive RPC nodes for all 9 DAOs
- [ ] Query The Graph for governance data
- [ ] Query Snapshot API for off-chain votes
- [ ] Multi-tier caching (Redis + file)
- [ ] Rate limiting and error handling
- [ ] Basic storage layer

---

### Phase 2: Historical Data Ingestion (3-4 weeks)

**Objective:** Build comprehensive historical dataset for backtesting

#### 2.1 Bulk Ingestion Pipeline
```typescript
interface IngestionJob {
  daoId: string;
  dataType: 'proposals' | 'votes' | 'holders' | 'delegations' | 'treasury';
  fromBlock: number;
  toBlock: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
}

class BulkIngestionService {
  // Ingest all historical data for a DAO
  async ingestDAO(daoId: string, options?: IngestionOptions): Promise<void>;

  // Ingest specific data type
  async ingestProposals(daoId: string, fromBlock: number, toBlock: number): Promise<void>;
  async ingestVotes(daoId: string, proposalIds: string[]): Promise<void>;
  async ingestHolderSnapshots(daoId: string, blockNumbers: number[]): Promise<void>;

  // Progress tracking
  getProgress(jobId: string): IngestionJob;
  onProgress(callback: (job: IngestionJob) => void): void;
}
```

#### 2.2 State Snapshots
```typescript
// Create point-in-time snapshots for backtesting
interface StateSnapshot {
  daoId: string;
  blockNumber: number;
  timestamp: Date;

  // Complete state at this point
  tokenDistribution: TokenHolder[];
  delegationGraph: DelegationEdge[];
  activeProposals: HistoricalProposal[];
  governanceParams: GovernanceParams;
  treasuryState: TreasuryState;
}

class SnapshotService {
  // Create snapshot at specific block
  async createSnapshot(daoId: string, blockNumber: number): Promise<StateSnapshot>;

  // Get nearest snapshot to a block
  async getNearestSnapshot(daoId: string, blockNumber: number): Promise<StateSnapshot>;

  // List available snapshots
  async listSnapshots(daoId: string): Promise<SnapshotMetadata[]>;
}
```

#### 2.3 Data Validation
```typescript
class DataValidator {
  // Validate proposal data
  validateProposal(proposal: HistoricalProposal): ValidationResult;

  // Validate vote totals
  validateVoteTotals(proposal: HistoricalProposal, votes: HistoricalVote[]): ValidationResult;

  // Validate state consistency
  validateStateConsistency(snapshot: StateSnapshot): ValidationResult;

  // Cross-reference sources
  crossValidate(daoId: string, proposalId: string): CrossValidationResult;
}
```

#### Phase 2 Deliverables
- [ ] Bulk ingest all proposals for 9 DAOs
- [ ] Bulk ingest all votes for 9 DAOs
- [ ] Create holder snapshots at key blocks
- [ ] Create delegation snapshots
- [ ] Treasury history
- [ ] Data validation and cross-referencing
- [ ] Export to Parquet for analysis

---

### Phase 3: Backtesting Engine (4-5 weeks)

**Objective:** Enable historical replay and model validation

#### 3.1 State Reconstructor
```typescript
class StateReconstructor {
  // Reconstruct DAO state at a specific block
  async reconstructState(daoId: string, blockNumber: number): Promise<ReconstructedState>;

  // Convert to simulation-ready format
  toSimulationConfig(state: ReconstructedState): DAOSimulationConfig;

  // Map real addresses to agent archetypes
  classifyHolders(holders: TokenHolder[], history: VotingHistory[]): ClassifiedMember[];
}

interface ReconstructedState {
  blockNumber: number;
  timestamp: Date;

  // DAO configuration at this point
  config: DAOSimulationConfig;

  // Member state
  members: ClassifiedMember[];

  // Active proposals
  activeProposals: ReconstructedProposal[];
}

interface ClassifiedMember {
  address: string;
  archetype: MemberArchetype;
  confidence: number;          // How confident in classification

  // Historical behavior that led to classification
  evidence: {
    votingFrequency: number;
    proposalsCreated: number;
    delegationsReceived: number;
    avgVotingPower: bigint;
    votingPattern: 'consistent' | 'swing' | 'passive';
  };
}
```

#### 3.2 Backtest Runner
```typescript
class BacktestRunner {
  // Run a single proposal backtest
  async runProposalBacktest(
    proposal: HistoricalProposal,
    state: ReconstructedState,
    config: BacktestConfig
  ): Promise<ProposalBacktestResult>;

  // Run full backtest campaign
  async runBacktest(config: BacktestConfig): Promise<BacktestResult>;

  // Monte Carlo runs
  async runMonteCarloBacktest(
    config: BacktestConfig,
    runs: number
  ): Promise<MonteCarloBacktestResult>;
}

interface MonteCarloBacktestResult extends BacktestResult {
  // Distribution statistics
  outcomeDistribution: {
    passedRuns: number;
    defeatedRuns: number;
    passRate: number;
    passRateCI: [number, number];
  };

  // Per-metric distributions
  forPercentDistribution: DistributionStats;
  turnoutDistribution: DistributionStats;

  // Convergence analysis
  convergenceAnalysis: {
    converged: boolean;
    runsToConvergence: number;
  };
}
```

#### 3.3 Accuracy Metrics
```typescript
interface AccuracyMetrics {
  // Binary outcome accuracy
  outcomeAccuracy: number;     // % correct pass/fail
  outcomeF1: number;           // F1 score for pass prediction

  // Regression metrics
  voteShareMAE: number;        // Mean absolute error
  voteShareRMSE: number;       // Root mean square error
  turnoutMAE: number;
  turnoutRMSE: number;

  // Calibration
  calibrationScore: number;    // How well probabilities match outcomes
  brierScore: number;          // Probabilistic accuracy

  // Breakdown by proposal type
  byCategory: Record<string, AccuracyMetrics>;
  byOutcome: {
    passed: AccuracyMetrics;
    defeated: AccuracyMetrics;
  };
}

class AccuracyCalculator {
  calculate(results: ProposalBacktestResult[]): AccuracyMetrics;
  generateReport(metrics: AccuracyMetrics): AccuracyReport;
}
```

#### Phase 3 Deliverables
- [ ] State reconstruction from historical data
- [ ] Address-to-archetype classification
- [ ] Proposal injection into simulation
- [ ] Outcome comparison engine
- [ ] Monte Carlo backtest runner
- [ ] Accuracy metrics calculation
- [ ] Calibration recommendations

---

### Phase 4: Real-Time Sync (3-4 weeks)

**Objective:** Keep digital twins synchronized with live blockchain state

#### 4.1 Event Listener Service
```typescript
class EventListenerService {
  // Start listening for a DAO
  async startListening(daoId: string): Promise<void>;

  // Stop listening
  async stopListening(daoId: string): Promise<void>;

  // Event handlers
  onProposalCreated(daoId: string, callback: ProposalCallback): void;
  onVoteCast(daoId: string, callback: VoteCallback): void;
  onDelegateChanged(daoId: string, callback: DelegationCallback): void;

  // Health monitoring
  getListenerHealth(): ListenerHealth;
}
```

#### 4.2 Polling Service
```typescript
class PollingService {
  // Configure polling intervals
  configure(config: PollingConfig): void;

  // Start/stop polling
  start(): void;
  stop(): void;

  // Manual poll
  async pollNow(daoId: string, dataType: DataType): Promise<void>;

  // Full reconciliation
  async fullReconciliation(daoId: string): Promise<ReconciliationResult>;
}

interface ReconciliationResult {
  daoId: string;
  timestamp: Date;

  // What changed
  changes: {
    proposalsAdded: number;
    proposalsUpdated: number;
    votesAdded: number;
    holdersChanged: number;
    delegationsChanged: number;
    treasuryDelta: bigint;
  };

  // Data quality
  dataQuality: {
    sourcesChecked: string[];
    discrepancies: Discrepancy[];
    resolutions: Resolution[];
  };
}
```

#### 4.3 Twin Updater
```typescript
class TwinUpdater {
  // Apply update to digital twin
  async applyUpdate(daoId: string, update: TwinUpdateEvent): Promise<void>;

  // Bulk update
  async applyUpdates(updates: TwinUpdateEvent[]): Promise<void>;

  // State diffing
  calculateDiff(
    current: DigitalTwinState,
    onChain: OnChainGovernanceState
  ): TwinDiff;

  // Apply diff
  async applyDiff(daoId: string, diff: TwinDiff): Promise<void>;
}

interface TwinDiff {
  daoId: string;

  // Changes to apply
  memberChanges: MemberDiff[];
  proposalChanges: ProposalDiff[];
  paramChanges: ParamDiff[];
  treasuryChanges: TreasuryDiff[];

  // Impact assessment
  impact: {
    votingPowerShift: number;
    quorumImpact: number;
    delegationConcentrationChange: number;
  };
}
```

#### 4.4 WebSocket Notifications
```typescript
// Extend existing server.ts
interface BlockchainSyncEvents {
  'blockchain:sync_started': { daoId: string };
  'blockchain:sync_completed': { daoId: string; changes: number };
  'blockchain:proposal_detected': { daoId: string; proposalId: string };
  'blockchain:vote_detected': { daoId: string; proposalId: string; voter: string };
  'blockchain:sync_error': { daoId: string; error: string };
}
```

#### Phase 4 Deliverables
- [ ] Event listener for all 9 DAOs
- [ ] Configurable polling service
- [ ] Twin update application
- [ ] State reconciliation
- [ ] WebSocket notifications
- [ ] Sync health dashboard

---

### Phase 5: Prediction & Analytics (4-5 weeks)

**Objective:** Use real data to make governance predictions

#### 5.1 Prediction Engine
```typescript
class PredictionEngine {
  // Predict outcome of active proposal
  async predictOutcome(
    daoId: string,
    proposalId: string,
    config?: PredictionConfig
  ): Promise<ProposalPrediction>;

  // Predict voting trajectory
  async predictTrajectory(
    daoId: string,
    proposalId: string
  ): Promise<VotingTrajectory>;

  // Key delegate analysis
  async analyzeKeyDelegates(
    daoId: string,
    proposalId: string
  ): Promise<KeyDelegateAnalysis>;
}

interface ProposalPrediction {
  proposalId: string;
  timestamp: Date;

  // Current state
  currentState: {
    forVotes: bigint;
    againstVotes: bigint;
    abstainVotes: bigint;
    participationRate: number;
    blocksRemaining: number;
  };

  // Predictions
  prediction: {
    outcome: 'likely_pass' | 'likely_fail' | 'too_close' | 'likely_no_quorum';
    confidence: number;
    finalForPercent: [number, number];     // 95% CI
    finalTurnout: [number, number];        // 95% CI
    quorumProbability: number;
  };

  // Key factors
  keyFactors: {
    undecidedVotingPower: bigint;
    keyDelegatesRemaining: DelegateInfo[];
    historicalPatterns: string[];
    riskFactors: string[];
  };
}

interface VotingTrajectory {
  proposalId: string;

  // Historical trajectory
  history: {
    block: number;
    forVotes: bigint;
    againstVotes: bigint;
    participationRate: number;
  }[];

  // Predicted trajectory
  predicted: {
    block: number;
    forVotes: [bigint, bigint];            // CI
    againstVotes: [bigint, bigint];
    participationRate: [number, number];
  }[];
}
```

#### 5.2 Delegate Behavior Analysis
```typescript
class DelegateBehaviorAnalyzer {
  // Analyze delegate's voting patterns
  async analyzeDelegate(address: string, daoId: string): Promise<DelegateProfile>;

  // Predict how delegate will vote
  async predictVote(
    address: string,
    daoId: string,
    proposalId: string
  ): Promise<VotePrediction>;

  // Find similar delegates
  async findSimilarDelegates(address: string, daoId: string): Promise<DelegateInfo[]>;
}

interface DelegateProfile {
  address: string;
  daoId: string;

  // Basic stats
  totalVotes: number;
  votingParticipation: number;
  avgResponseTime: number;        // Blocks after proposal start

  // Voting patterns
  patterns: {
    tendencyToSupport: number;    // Historical support rate
    categoryPreferences: Record<string, number>;
    correlatedDelegates: string[];
    opposingDelegates: string[];
  };

  // Influence
  influence: {
    votingPower: bigint;
    delegatorCount: number;
    votePowerRank: number;
    historicalImpact: number;     // How often decisive
  };

  // Behavior classification
  classification: DelegateClassification;
}

type DelegateClassification =
  | 'early_voter'           // Votes quickly, sets tone
  | 'late_voter'            // Waits to see sentiment
  | 'contrarian'            // Often opposes majority
  | 'follower'              // Follows key delegates
  | 'swing_voter'           // Unpredictable
  | 'inactive'              // Rarely votes
  | 'consistent_supporter'  // Usually supports proposals
  | 'consistent_opposer';   // Usually opposes proposals
```

#### 5.3 Analytics Dashboard
```typescript
interface LiveAnalyticsDashboard {
  // Real-time metrics
  realTimeMetrics: {
    activeProposals: ActiveProposalMetrics[];
    recentVotes: RecentVoteMetrics[];
    delegationChanges: DelegationChangeMetrics[];
  };

  // Historical comparisons
  comparisons: {
    participationVsHistorical: ComparisonChart;
    outcomePatterns: PatternAnalysis;
    delegateActivity: ActivityHeatmap;
  };

  // Alerts
  alerts: {
    quorumAtRisk: Alert[];
    largeVotes: Alert[];
    delegationShifts: Alert[];
    unusualActivity: Alert[];
  };
}
```

#### Phase 5 Deliverables
- [ ] Proposal outcome prediction
- [ ] Voting trajectory forecasting
- [ ] Delegate behavior analysis
- [ ] Key delegate impact analysis
- [ ] Real-time analytics dashboard
- [ ] Alert system for governance events

---

## API Endpoints

### Data Endpoints
```
GET  /api/blockchain/daos                    # List supported DAOs
GET  /api/blockchain/daos/:id/state          # Current on-chain state
GET  /api/blockchain/daos/:id/proposals      # Historical proposals
GET  /api/blockchain/daos/:id/delegates      # Delegate directory
GET  /api/blockchain/daos/:id/treasury       # Treasury state

GET  /api/blockchain/proposals/:id           # Proposal details
GET  /api/blockchain/proposals/:id/votes     # Vote breakdown
GET  /api/blockchain/proposals/:id/timeline  # Voting timeline
```

### Backtest Endpoints
```
POST /api/backtest/create                    # Create backtest job
GET  /api/backtest/:id                       # Get backtest status/results
GET  /api/backtest/:id/proposals             # Per-proposal results
POST /api/backtest/:id/export                # Export results

GET  /api/backtest/history                   # List past backtests
GET  /api/backtest/calibration/:daoId        # Calibration recommendations
```

### Sync Endpoints
```
GET  /api/sync/status                        # Overall sync status
GET  /api/sync/status/:daoId                 # DAO-specific sync status
POST /api/sync/trigger/:daoId                # Trigger manual sync
POST /api/sync/reconcile/:daoId              # Full reconciliation

GET  /api/sync/health                        # Health metrics
GET  /api/sync/logs                          # Recent sync logs
```

### Prediction Endpoints
```
GET  /api/prediction/proposals/:id           # Proposal outcome prediction
GET  /api/prediction/trajectory/:id          # Voting trajectory
GET  /api/prediction/delegates/:address      # Delegate behavior analysis
POST /api/prediction/simulate                # Custom scenario prediction
```

---

## Data Storage Strategy

### Storage Tiers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA STORAGE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  HOT TIER (Redis)                                                │   │
│  │  TTL: 1-24 hours                                                 │   │
│  │                                                                  │   │
│  │  • Current governance state                                     │   │
│  │  • Active proposal data                                         │   │
│  │  • Recent votes                                                 │   │
│  │  • API response cache                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  WARM TIER (PostgreSQL/TimescaleDB)                             │   │
│  │  Retention: 2 years                                              │   │
│  │                                                                  │   │
│  │  • Proposal history (queryable)                                 │   │
│  │  • Vote records                                                 │   │
│  │  • Time series metrics                                          │   │
│  │  • Backtest results                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  COLD TIER (Object Storage / Parquet)                           │   │
│  │  Retention: Indefinite                                           │   │
│  │                                                                  │   │
│  │  • Historical holder snapshots                                  │   │
│  │  • Full delegation graphs                                       │   │
│  │  • Raw event logs                                               │   │
│  │  • Bulk backtest data                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estimated Storage Requirements

| Data Type | Per DAO | All 9 DAOs | Growth Rate |
|-----------|---------|------------|-------------|
| Proposals (all history) | ~500 MB | ~5 GB | +100 MB/year |
| Votes (all history) | ~2 GB | ~20 GB | +500 MB/year |
| Holder snapshots (daily, 2 years) | ~10 GB | ~90 GB | +5 GB/year |
| Delegation graphs | ~1 GB | ~10 GB | +200 MB/year |
| Time series metrics | ~500 MB | ~5 GB | +100 MB/year |
| Backtest results | Variable | ~50 GB | Usage dependent |
| **Total** | ~15 GB | **~180 GB** | +7 GB/year |

---

## Technical Considerations

### Rate Limiting Strategy

```typescript
interface RateLimitConfig {
  // Per-provider limits
  providers: {
    alchemy: { requestsPerSecond: 25, dailyLimit: 300_000_000 };  // Compute units
    theGraph: { requestsPerSecond: 10, dailyLimit: 100_000 };
    snapshot: { requestsPerSecond: 5, dailyLimit: 10_000 };
    tally: { requestsPerSecond: 10, dailyLimit: 50_000 };
  };

  // Strategies
  strategies: {
    backoff: 'exponential' | 'linear';
    maxRetries: number;
    cacheFirst: boolean;
    batchRequests: boolean;
  };
}

class RateLimiter {
  // Check if request is allowed
  canRequest(provider: string): boolean;

  // Execute with rate limiting
  async execute<T>(provider: string, fn: () => Promise<T>): Promise<T>;

  // Batch multiple requests
  async batch<T>(provider: string, fns: (() => Promise<T>)[]): Promise<T[]>;
}
```

### Error Handling

```typescript
type BlockchainError =
  | 'rate_limited'
  | 'provider_unavailable'
  | 'data_inconsistency'
  | 'reorg_detected'
  | 'contract_not_found'
  | 'subgraph_indexing'
  | 'invalid_response';

interface ErrorHandler {
  // Handle specific error types
  handle(error: BlockchainError, context: ErrorContext): ErrorResolution;

  // Retry logic
  shouldRetry(error: BlockchainError, attempts: number): boolean;
  getRetryDelay(error: BlockchainError, attempts: number): number;

  // Fallback strategies
  getFallback(provider: string): string | null;
}

interface ErrorResolution {
  action: 'retry' | 'fallback' | 'skip' | 'fail';
  delay?: number;
  fallbackProvider?: string;
  notification?: string;
}
```

### Data Consistency

```typescript
class ConsistencyChecker {
  // Verify data across sources
  async crossValidate(daoId: string, dataType: string): Promise<ValidationResult>;

  // Handle reorgs
  async handleReorg(daoId: string, reorgDepth: number): Promise<void>;

  // Detect stale data
  isStale(data: any, maxAge: number): boolean;

  // Reconcile conflicts
  reconcileConflict(sources: DataSource[], data: any[]): any;
}
```

---

## File Structure

```
lib/blockchain/
  index.ts                          # Public exports
  types.ts                          # All TypeScript interfaces
  constants.ts                      # Contract addresses, ABIs, configs

lib/blockchain/providers/
  index.ts
  base-provider.ts                  # Abstract base class
  rpc-provider.ts                   # Direct RPC calls (Alchemy, Infura)
  graph-provider.ts                 # The Graph queries
  snapshot-provider.ts              # Snapshot API
  tally-provider.ts                 # Tally API
  dune-provider.ts                  # Dune Analytics queries
  aggregator.ts                     # Multi-source aggregation

lib/blockchain/cache/
  index.ts
  cache-manager.ts                  # Multi-tier cache orchestration
  redis-cache.ts                    # Hot cache implementation
  file-cache.ts                     # Cold cache implementation

lib/blockchain/storage/
  index.ts
  database.ts                       # PostgreSQL/TimescaleDB
  time-series.ts                    # Time series specific queries
  parquet-store.ts                  # Cold storage I/O

lib/blockchain/sync/
  index.ts
  event-listener.ts                 # Real-time event subscription
  polling-service.ts                # Periodic polling
  twin-updater.ts                   # Apply updates to digital twins
  reconciliation.ts                 # Full state reconciliation
  scheduler.ts                      # Sync job scheduling

lib/blockchain/backtest/
  index.ts
  state-reconstructor.ts            # Rebuild historical state
  address-classifier.ts             # Map addresses to archetypes
  backtest-runner.ts                # Execute backtests
  outcome-comparator.ts             # Compare predicted vs actual
  accuracy-metrics.ts               # Calculate accuracy stats
  calibrator.ts                     # Generate calibration suggestions

lib/blockchain/prediction/
  index.ts
  prediction-engine.ts              # Outcome prediction
  trajectory-forecaster.ts          # Voting trajectory
  delegate-analyzer.ts              # Delegate behavior analysis

lib/blockchain/utils/
  rate-limiter.ts                   # API rate limiting
  error-handler.ts                  # Error handling and retry
  consistency-checker.ts            # Data validation
  abi-decoder.ts                    # Event/call decoding

app/api/blockchain/
  route.ts                          # Main blockchain API routes
  daos/
    route.ts                        # DAO listing
    [id]/
      route.ts                      # DAO details
      state/route.ts                # Current state
      proposals/route.ts            # Proposals
      delegates/route.ts            # Delegates

app/api/backtest/
  route.ts                          # Backtest management
  [id]/
    route.ts                        # Backtest details

app/api/sync/
  route.ts                          # Sync status and control

app/api/prediction/
  route.ts                          # Predictions API

tests/
  blockchain/
    providers.test.ts
    sync.test.ts
    backtest.test.ts
    prediction.test.ts
```

---

## Environment Configuration

```env
# RPC Providers
ALCHEMY_API_KEY=xxx
INFURA_API_KEY=xxx
QUICKNODE_ENDPOINT=xxx

# Indexers
GRAPH_API_KEY=xxx
DUNE_API_KEY=xxx

# Governance APIs
TALLY_API_KEY=xxx
SNAPSHOT_API_KEY=xxx        # Optional, public API available
BOARDROOM_API_KEY=xxx

# Storage
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://localhost:5432/dao_simulator
PARQUET_STORAGE_PATH=/data/parquet

# Sync Configuration
SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=60
FULL_RECONCILIATION_HOURS=24

# Rate Limits (per second)
ALCHEMY_RPS=25
GRAPH_RPS=10
SNAPSHOT_RPS=5
```

---

## Verification Strategy

### Unit Tests
- Provider connection and query tests
- Data parsing and validation
- Rate limiter behavior
- Cache hit/miss scenarios
- Error handling paths

### Integration Tests
- Full data pipeline (fetch → cache → store)
- Multi-source aggregation
- Sync service (mock blockchain events)
- Backtest runner with historical data

### E2E Tests
- Complete backtest workflow
- Real-time sync simulation
- Prediction accuracy (against known outcomes)

### Monitoring
- Sync lag per DAO
- API rate limit headroom
- Cache hit rates
- Data freshness metrics
- Prediction accuracy over time

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API rate limits exceeded | Multi-provider fallback, aggressive caching, request batching |
| Data inconsistency between sources | Cross-validation, source priority ordering, conflict resolution |
| Subgraph indexing delays | Fallback to direct RPC, cache recent state, retry with backoff |
| Historical data gaps | Multiple sources, interpolation for non-critical metrics |
| Reorg handling | 12-block confirmation delay, automatic state rollback |
| Storage costs | Tiered storage, data compaction, configurable retention |
| Provider deprecation | Abstracted provider interface, easy swapping |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data freshness | < 5 min lag | Time since last sync |
| Backtest accuracy | > 80% outcome prediction | Historical validation |
| API response time | < 500ms (cached) | P95 latency |
| Sync reliability | 99.5% uptime | Error rate monitoring |
| Coverage | 9/9 DAOs | Supported DAO count |
| Historical depth | 2+ years | Earliest data point |

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Data Infrastructure | 4-6 weeks | None |
| Phase 2: Historical Ingestion | 3-4 weeks | Phase 1 |
| Phase 3: Backtesting Engine | 4-5 weeks | Phase 2 |
| Phase 4: Real-Time Sync | 3-4 weeks | Phase 1 |
| Phase 5: Prediction & Analytics | 4-5 weeks | Phases 3, 4 |
| **Total** | **18-24 weeks** | |

*Phases 3 and 4 can run in parallel after Phase 2 completes.*

---

## Future Extensions

1. **Cross-DAO Analysis**: Compare governance patterns across DAOs
2. **Governance Alerts**: Real-time notifications for significant events
3. **Delegate Recommendations**: Suggest delegates based on voting preferences
4. **Governance Health Scoring**: Quantified health metrics per DAO
5. **Proposal Success Prediction**: ML model for pre-vote outcome prediction
6. **Whale Tracking**: Monitor large token holder behavior
7. **MEV Impact Analysis**: Study flashbots/MEV on governance
8. **L2 Bridge Monitoring**: Track cross-chain governance execution
