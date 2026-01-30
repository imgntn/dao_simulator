# Academic Calibration Targets

This grounding table summarizes governance participation and market volatility proxies derived from the local historical dataset (2024 daily) and governance parameter targets from the digital twins.

## Coverage

- Time window: 2024-01-01 through 2024-12-31 (daily).
- Governance sources: Snapshot proposals/votes and MakerDAO polls from `results/historical_2024_q*_daily/governance/`.
- Market sources: `results/historical_2024_q*_daily/market/market_daily.csv` (CryptoCompare feed).

## Governance Parameter Targets (Digital Twins)

| DAO | Proposal threshold | Quorum | Voting period | Notes |
| --- | --- | --- | --- | --- |
| Aave | short: 80000 AAVE; long: 1.25% | short: 320000 AAVE; long: 6.5% | short: 3d; long: 10d | Dual executor thresholds |
| Lido DAO | N/A | N/A | offchain 7d; onchain 5d | Snapshot + onchain voting |
| Sky (MakerDAO) | N/A | N/A | continuous / weekly | Polling + executive approvals |
| Uniswap DAO | 1000000 UNI | 40000000 UNI | 7d |  |
| Arbitrum DAO | 1000000 ARB | non-const: 3.0%; const: 4.5% | 14-16d |  |
| Optimism | N/A | 30.0% | 7d | Token House quorum/approval |

## Governance Participation Targets (2024 Snapshot/Maker)

| DAO | Proposals (count) | Binary pass rate | Quorum reach rate | Avg total votes (token-weighted) | Avg quorum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Aave | 260 | 0.92 | 0.92 | 633536.84 | 320000.0 |
| Lido DAO | 77 | 1.00 | N/A | 31168030.21 | 0.0 |
| Sky (MakerDAO) | 56 polls | 0.9285714285714286 | N/A | 90898.2 MKR | N/A |
| Uniswap DAO | 49 | 0.92 | 0.89 | 29977160.03 | 10000000.0 |
| Arbitrum DAO | 211 | 0.89 | N/A | 150944431.84 | 0.0 |
| Optimism | 19 | 1.00 | 0.50 | 36.21 | 37.67 |

## Treasury Volatility Proxy (Token Price, 2024 Daily)

| DAO | Token | Days | Annualized vol (log returns) |
| --- | --- | ---: | ---: |
| Aave | AAVE | 366 | 0.9761 |
| Lido DAO | LDO | 366 | 1.1598 |
| Sky (MakerDAO) | MKR | 366 | 0.8854 |
| Uniswap DAO | UNI | 366 | 1.1 |
| Arbitrum DAO | ARB | 366 | 0.9157 |
| Optimism | OP | 366 | 1.015 |

## Realism Bands (Initial)

These bands are used for initial calibration checks. They are defined as:
- Rates (pass/quorum reach): +/- 0.10 absolute, clamped to [0, 1].
- Participation (avg total votes): +/- 25% relative.
- Volatility proxy (annualized): +/- 25% relative.

| DAO | Pass rate band | Quorum reach band | Avg votes band | Volatility band |
| --- | --- | --- | --- | --- |
| Aave | 0.82-1.00 | 0.82-1.00 | 475152.63-791921.05 | 0.73-1.22 |
| Lido DAO | 0.90-1.00 | N/A | 23376022.65-38960037.76 | 0.87-1.45 |
| Sky (MakerDAO) | 0.83-1.00 | N/A | 68173.65-113622.75 | 0.66-1.11 |
| Uniswap DAO | 0.82-1.00 | 0.79-0.99 | 22482870.02-37471450.03 | 0.82-1.37 |
| Arbitrum DAO | 0.79-0.99 | N/A | 113208323.88-188680539.8 | 0.69-1.14 |
| Optimism | 0.90-1.00 | 0.40-0.60 | 27.16-45.26 | 0.76-1.27 |

## Sources

- Governance: Snapshot proposal/vote exports and MakerDAO poll exports captured in `results/historical_2024_q*_daily/governance/`.
- Markets: CryptoCompare daily price feed captured in `results/historical_2024_q*_daily/market/market_daily.csv`.
- Governance parameter targets: digital twin sources listed in each twin JSON file:
  - Aave:
    - Aave help: Voting in Aave Governance (vote delay and short/long executor timelines) (https://aave.com/help/governance/voting)
    - Aave Governance Process Document v1 (quorum concept and 320k AAVE example) (https://aave.com/docs/ecosystem/governance/governance-process)
    - Aave governance-v2 proposal 106 (updates to Level 2/long executor requirements) (https://governance-v2.aave.com/governance/proposal/106/)
    - Aave governance forum: Adjust long-executor requirements (historic baseline thresholds and periods) (https://governance.aave.com/t/rfc-aave-governance-adjust-level-2-requirements-long-executor/8693)
  - Lido DAO:
    - Lido DAO governance overview (regular process durations and platforms) (https://lido.fi/governance)
    - Lido blog: Participating in Dual Governance (thresholds and dynamic timelock behavior) (https://blog.lido.fi/participating-in-dual-governance-a-guide-for-steth-holders/)
  - Sky (MakerDAO):
    - MakerDAO Voting Proxy Contract (poll vs executive; approval voting; locking; hot/cold wallet separation) (https://medium.com/@MakerDAO/the-makerdao-voting-proxy-contract-5765dd5946b4)
    - Sky ecosystem / Maker community: How voting works (governance polls and executive votes) (https://github.com/sky-ecosystem/community/blob/master/content/en/learn/governance/how-voting-works.mdx)
    - Maker Protocol Technical Docs: Chief (approval voting mechanics) (https://docs.makerdao.com/smart-contract-modules/governance-module/chief-detailed-documentation)
  - Uniswap DAO:
    - Uniswap governance process (Temperature Check + Governance Proposal parameters) (https://docs.uniswap.org/concepts/governance/process)
    - Uniswap Beginners' Guide to Voting (proposal threshold and quorum) (https://docs.uniswap.org/concepts/governance/guide-to-voting)
    - Uniswap governance forum: Lower onchain proposal threshold to 1M UNI (https://gov.uniswap.org/t/rfc-lower-onchain-proposal-threshold/22429)
    - Uniswap docs governance overview (timelock minimum delay concept) (https://docs.uniswap.org/contracts/v3/reference/governance/overview)
    - Uniswap: Introducing UNI (token contract address) (https://blog.uniswap.org/uni)
    - Uniswap governance concept overview (timelock address) (https://docs.uniswap.org/concepts/governance/overview)
  - Arbitrum DAO:
    - Arbitrum DAO voting guide (temperature check + on-chain thresholds, voting period, quorums) (https://docs.arbitrum.foundation/dao-governance/dao-vote)
    - Arbitrum DAO FAQs (Snapshot + Tally usage; 1M ARB threshold) (https://docs.arbitrum.foundation/dao-governance/dao-faqs)
    - Arbitrum forum: execution path discussion (timelock + L2→L1 delay components) (https://forum.arbitrum.foundation/t/arbitrumdao-should-reduce-the-l2-timelock/21374)
  - Optimism:
    - Optimism governance docs (Token House / Citizens' House and structures) (https://docs.optimism.io/governance)
    - Optimism governance forum: Season 2 voting, quorum set to 30% of votable supply (https://gov.optimism.io/t/season-2-token-house-voting-approach/2395)
    - Optimism governance forum: Voting Cycle Roundup #29 (cycle dates and Citizens' House veto week) (https://gov.optimism.io/t/voting-cycle-roundup-29/9164)
    - Optimism docs: Protocol upgrades and 7 day veto period (process safety) (https://docs.optimism.io/governance/protocol-upgrades)