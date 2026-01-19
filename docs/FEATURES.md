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
