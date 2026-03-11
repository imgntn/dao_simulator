# DAO Simulator Features

> **Note**: Keep this document updated as features are added or modified.

## Governance Mechanisms

| Feature | Description | Configuration |
|---------|-------------|---------------|
| **Majority Voting** | Simple votes_for > votes_against | Default rule |
| **Quorum Rule** | Minimum participation % required | `quorumPercentage` (default 4%) |
| **Supermajority** | Higher approval threshold | `threshold` (default 66%) |
| **Token-Weighted Quorum** | Quorum based on token participation | `quorumPercentage` |
| **Quadratic Voting** | Voting power = √tokens | Reduces plutocracy |
| **Conviction Voting** | Votes accumulate strength over time | `convictionThreshold`, `convictionHalfLife` |
| **Time-Decay** | Threshold decreases over proposal age | Starts 66% → decays to 50% |
| **Reputation Quorum** | Quorum based on reputation weight | `quorumPercentage` (default 50%) |
| **Bicameral** | Token House + Citizens House veto | Optimism-style |
| **Dual Governance** | Staker veto with dynamic timelock | Lido-style |
| **Approval Voting** | Continuous executive voting | MakerDAO-style |
| **Security Council** | Fast-track emergency execution | 9-of-12 threshold |
| **Optimistic Approval** | Auto-pass unless vetoed | Veto period window |
| **Holographic Consensus** | Prediction market boosting | DAOstack-style |
| **Category Quorum** | Different quorum by proposal type | Constitutional vs standard |

## Agent Types (27 exported)

| Category | Agent Types |
|----------|-------------|
| **Core** | Developer, Investor, Trader, Validator, ProposalCreator, PassiveMember |
| **Governance** | Delegator, LiquidDelegator, GovernanceExpert, Arbitrator |
| **Financial** | AdaptiveInvestor, Speculator, MarketMaker, RLTrader |
| **Specialized** | BountyHunter, Artist, Collector, Auditor, Whistleblower |
| **Institutional** | ServiceProvider, ExternalPartner, Regulator |
| **Digital Twin** | SecurityCouncilMember, CitizenAgent, StewardAgent, StakerAgent |
| **Interactive** | PlayerAgent (human-controlled) |

## Proposal Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| **Standard** | General proposals | title, description, fundingGoal |
| **Funding** | Project funding requests | project, fundingGoal |
| **Governance** | Parameter changes | setting, value |
| **Membership** | New member admission | newMember |
| **Bounty** | Task bounties | bountyAmount, requiredSkills |
| **Multi-Stage** | Complex lifecycle proposals | stages, vetoSignal |
| **Inter-DAO** | Cross-DAO coordination | Multiple DAOs |

## Economic Systems

| System | Description |
|--------|-------------|
| **Treasury** | DAO fund management with token economics |
| **Token Market** | Trading with price dynamics |
| **NFT Marketplace** | Global NFT trading |
| **Prediction Markets** | Outcome betting |
| **Staking** | Token locking with rewards |
| **Reputation** | Score tracking with decay |
| **Market Shocks** | Stochastic external events |

## Organizational Structures

| Structure | Description |
|-----------|-------------|
| **Guilds** | Sub-organization groupings |
| **Governance Houses** | Bicameral chambers (Token/Citizens) |
| **Bridges** | Cross-chain/DAO connections |
| **Timelocks** | Execution delays |
| **Projects** | Funded initiatives |
| **Disputes** | Conflict resolution |
| **Violations** | Compliance tracking |

## 3D Interactive Simulator (32 features)

### Visual Effects

| Feature | Description | File |
|---------|-------------|------|
| **Vote Flash** | Agents flash green/red when voting | `AgentGroups.tsx` |
| **Sparklines** | Mini charts on each metric card | `MetricsDashboard.tsx` |
| **Delegation Graph** | SVG graph of delegation relationships | `DelegationGraph.tsx` |
| **Delegation Beams** | Purple 3D beams connecting delegates | `DelegationBeams.tsx` |
| **Proposal Particles** | Cyan/green/red bursts on proposal events | `ProposalParticles.tsx` |
| **Treasury Pulse** | Vault floor glows on large fund changes | `TreasuryIndicator.tsx` |
| **Black Swan Weather** | Storm clouds, lightning, rain during crises | `BlackSwanEffect.tsx` |
| **Agent Trails** | Fading trail lines behind moving agents | `AgentTrails.tsx` |
| **Floor Labels** | Agent count badges on each floor | `FloorLabel.tsx` |
| **Building Shake** | Building shakes during black swan events | `BlackSwanEffect.tsx` |

### Analytics & Data

| Feature | Description | File |
|---------|-------------|------|
| **Export CSV/JSON/Events** | Download simulation data in multiple formats | `ExportButton.tsx` |
| **Timeline Annotations** | Double-click to add notes at specific steps | `Annotations.tsx` |
| **Metric Alerts** | Set threshold alerts with toast notifications | `MetricAlerts.tsx` |
| **Trend Overlays** | Linear regression + moving average on sparklines | `MetricsDashboard.tsx` |
| **Voting Heatmap** | Agent type voting correlation matrix | `VotingHeatmap.tsx` |
| **Agent Inspector** | Detailed drill-down with token history sparkline | `AgentInspector.tsx` |

### Simulation Controls

| Feature | Description | File |
|---------|-------------|------|
| **Time Travel** | Scrub backward through simulation history | `TimeScrubber.tsx` |
| **Scenario Builder** | Schedule black swan events at specific steps | `ScenarioBuilder.tsx` |
| **Split-Screen Compare** | Run two configs side-by-side | `ComparisonView.tsx` |
| **Live Parameter Injection** | Change governance/forum/swan mid-run | `ControlPanel.tsx` |
| **Custom Agent Injection** | Add agents with custom parameters | `CustomAgentForm.tsx` |
| **What-If Branching** | Fork simulation state for divergence analysis | `BranchView.tsx` |
| **Multi-Run Statistics** | Run N simulations for confidence intervals | `MultiRunPanel.tsx` |
| **Floor Navigation** | Click to zoom camera to specific floors | `FloorNav.tsx` |

### UX & Polish

| Feature | Description | File |
|---------|-------------|------|
| **Keyboard Shortcuts** | Space, R, 1-6, Esc, L, ? shortcuts | `useKeyboardShortcuts.ts` |
| **Guided Tutorial** | 7-step spotlight overlay for new users | `Tutorial.tsx` |
| **Mobile Layout** | Bottom sheet sidebar on narrow screens | `SimulationPageClient.tsx` |
| **Permalink Sharing** | URL-encoded config for sharing | `ShareButton.tsx` |
| **Theme Toggle** | Light/dark theme for simulator UI | `ThemeToggle.tsx` |
| **Help Overlay** | Comprehensive help with shortcut reference | `HelpOverlay.tsx` |
| **Agent Guide** | Expandable guide to all agent types | `AgentGuide.tsx` |
| **Renderer Badge** | Shows WebGPU/WebGL renderer type | `SimulationCanvas.tsx` |

## Learning Infrastructure (Tiers 1-3)

| Tier | Feature | Description |
|------|---------|-------------|
| **1** | Tabular Q-Learning | Epsilon-greedy, Q-bounds, serialize/merge/prune |
| **1** | Reward Aggregator | Event-driven reward signals per agent |
| **1** | State Discretizer | 12 bucketing functions for continuous→discrete |
| **2** | Adaptive Learning Rate | Visit-count based rate adjustment |
| **2** | Experience Replay | Prioritized sampling (TD-error weighted) |
| **2** | Eligibility Traces | Q(λ) for delayed reward propagation |
| **2** | N-Step Returns | Bias-variance tradeoff tuning |
| **2** | Curiosity/UCB | Exploration bonus for novel states |
| **2** | Reward Shaping | Potential-based shaping (3 presets) |
| **3** | Shared Learning | MARL federated averaging + cross-category signals |
| **3** | Policy Gradient | REINFORCE with baseline |
| **3** | DQN | Deep Q-Network with target network + replay |
| **3** | Hierarchical RL | Options framework (meta-policy + sub-policies) |
| **3** | Opponent Modeling | Action frequency tracking + adjusted Q-values |

## Local Analytics (GDPR-Friendly)

| Feature | Description | File |
|---------|-------------|------|
| **Page View Tracking** | Aggregate daily counters per path, no PII | `AnalyticsProvider.tsx` |
| **Event Tracking** | Simulation actions (play, reset, DAO select, export) | `ControlPanel.tsx`, `ExportButton.tsx` |
| **Referrer Domains** | First-load referrer hostname only | `AnalyticsProvider.tsx` |
| **Device Categories** | desktop/tablet/mobile from viewport width | `AnalyticsProvider.tsx` |
| **Postgres Store** | Upsert counters per day/category/key | `lib/analytics/store.ts` |
| **Stats API** | Auth-protected GET, public POST (no auth) | `app/api/analytics/route.ts` |

Privacy: No cookies, no IP logging, no fingerprinting, no third-party services. All data is aggregate counters stored in self-hosted PostgreSQL.

## Historical Calibration

| DAO | Accuracy Score | Key Metrics Calibrated |
|-----|---------------|----------------------|
| Gitcoin | 0.922 | Proposal freq, pass rate, participation, price |
| Lido | 0.887 | Proposal freq, pass rate, participation, price |
| Curve | 0.878 | Proposal freq, pass rate, participation, price |
| Aave | 0.875 | Proposal freq, pass rate, participation, price |
| Balancer | 0.870 | Proposal freq, pass rate, participation, price |
| SushiSwap | 0.867 | Proposal freq, pass rate, participation, price |
| dYdX | 0.864 | Proposal freq, pass rate, participation, price |
| ENS | 0.859 | Proposal freq, pass rate, participation, price |
| MakerDAO | 0.854 | Proposal freq, pass rate, participation, price |
| Uniswap | 0.850 | Proposal freq, pass rate, participation, price |
| Arbitrum | 0.846 | Proposal freq, pass rate, participation, price |
| Optimism | 0.818 | Proposal freq, pass rate, participation, price |
| Compound | 0.818 | Proposal freq, pass rate, participation, price |
| Nouns | 0.780 | Proposal freq, pass rate, participation, price |
