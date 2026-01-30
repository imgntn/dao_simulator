# Digital Twins Historical Data Plan

## Goal
Build a comprehensive, reproducible historical dataset (hourly + daily) for the 9 digital twins, covering token market data, protocol metrics, governance activity, and forum discussions.

## Dataset Outputs
| Dataset | Cadence | Source | Output CSV |
| --- | --- | --- | --- |
| Market prices (price, volume, market cap) | Hourly | CryptoCompare (fallback CoinCap, optional CoinGecko) | results/historical/market/market_hourly.csv |
| Market prices (price, volume, market cap) | Daily | CryptoCompare (fallback CoinCap, optional CoinGecko) | results/historical/market/market_daily.csv |
| Protocol or chain TVL | Daily | DefiLlama | results/historical/protocol/protocol_tvl_daily.csv |
| Protocol fees | Daily | DefiLlama | results/historical/protocol/protocol_fees_daily.csv |
| Protocol revenue | Daily | DefiLlama | results/historical/protocol/protocol_revenue_daily.csv |
| Snapshot proposals | Historical | Snapshot GraphQL | results/historical/governance/snapshot_proposals.csv |
| Snapshot votes | Historical | Snapshot GraphQL | results/historical/governance/snapshot_votes.csv |
| On-chain proposals | Historical | Tally GraphQL (API key) | results/historical/governance/tally_proposals.csv |
| On-chain votes | Historical | Tally GraphQL (API key) | results/historical/governance/tally_votes.csv |
| Maker polls | Historical | Maker Governance API | results/historical/governance/maker_polls.csv |
| Maker poll tallies | Historical | Maker Governance API | results/historical/governance/maker_poll_tallies.csv |
| Maker executives | Historical | Maker Governance API | results/historical/governance/maker_executives.csv |
| Maker executive supporters | Historical | Maker Governance API | results/historical/governance/maker_executive_supporters.csv |
| Forum topics | Historical | Discourse API | results/historical/forum/forum_topics.csv |
| Forum posts | Historical | Discourse API | results/historical/forum/forum_posts.csv |

## Per-DAO Source Mapping
These values live in `python/data_ingestion/dao_sources.json`. Many require verification before running a full historical pull.

| DAO | Token | CoinGecko ID | DefiLlama | Snapshot Space(s) | Tally Org | Forum (Discourse) |
| --- | --- | --- | --- | --- | --- | --- |
| Uniswap | UNI | uniswap | protocol: uniswap | uniswapgovernance.eth | uniswap | https://gov.uniswap.org |
| Compound | COMP | compound-governance-token | protocol: compound | (none) | compound | https://www.comp.xyz |
| Aave | AAVE | aave | protocol: aave | aavedao.eth | aave | https://governance.aave.com |
| Arbitrum | ARB | arbitrum | chain: Arbitrum | arbitrumfoundation.eth | arbitrum | https://forum.arbitrum.foundation |
| Optimism | OP | optimism | chain: Optimism | opcollective.eth, citizenshouse.eth | optimism | https://gov.optimism.io |
| ENS | ENS | ethereum-name-service | (none) | ens.eth | ens | https://discuss.ens.domains |
| Lido | LDO | lido-dao | protocol: lido | lido-snapshot.eth | lido | https://research.lido.fi |
| Gitcoin | GTC | gitcoin | (none) | gitcoindao.eth | gitcoin | https://gov.gitcoin.co |
| Maker/Sky | MKR | maker | protocol: makerdao | (none) | (none) | https://forum.makerdao.com |

## Implementation Notes
- Entry point: `python/data_ingestion/download_historical.py`
- Config: `python/data_ingestion/dao_sources.json`
- Output root: `results/historical`
- Snapshot and Discourse do not require keys, but keys improve rate limits.
- Tally requires `TALLY_API_KEY` and verified org slugs.
- CoinGecko may require `COINGECKO_API_KEY` (or `COINGECKO_DEMO_API_KEY`) for historical endpoints.
- Free ensemble uses CryptoCompare for price/volume and CoinCap for supply to approximate market cap.

## Run Steps
1. Verify and update IDs in `python/data_ingestion/dao_sources.json` (Snapshot spaces, Tally org slugs, optional DefiLlama slugs).
2. Optional env vars:
   - `TALLY_API_KEY`
   - `DISCOURSE_API_KEY`
   - `DISCOURSE_API_USERNAME`
3. Run full historical download (hourly + daily):
   - `python python/data_ingestion/download_historical.py --start 2018-01-01 --hourly --daily`
   - Optional: add `--skip-forum-posts` for faster forum-only runs
   - Maker-specific: add `--skip-maker-tallies` or `--skip-maker-supporters` to reduce size
   - Maker tallies in batches: `--maker-poll-page-start 1 --maker-poll-page-end 20 --append`
4. Run a subset (example):
   - `python python/data_ingestion/download_historical.py --dao uniswap,arbitrum --start 2020-01-01 --daily`

## Coverage Gaps to Validate
- Snapshot spaces verified for Uniswap, Aave, Arbitrum, Optimism, ENS, Lido, Gitcoin.
- Compound and Maker/Sky show no verified Snapshot space.
- Optimism includes `citizenshouse.eth` for Citizens' House voting.
- Maker/Sky on-chain governance requires a dedicated adapter (vote.makerdao.com API or DSChief logs).

## Compound + Maker/Sky Governance Sources
### Compound
- Governance UI and canonical proposal list: `https://www.tally.xyz/gov/compound`
- Governance forum (Discourse): `https://www.comp.xyz`
- On-chain: Compound Governor Bravo contracts on Ethereum (pullable via Tally GraphQL with API key or direct event logs)

### Maker/Sky
- Governance portal: `https://vote.makerdao.com` (Sky portal currently 403s from automated requests)
- API docs (Swagger): `https://vote.makerdao.com/api-docs`
- Key API endpoints:
  - Polls: `https://vote.makerdao.com/api/polling/v2/all-polls`
  - Poll detail: `https://vote.makerdao.com/api/polling/{slug}`
  - Poll tally: `https://vote.makerdao.com/api/polling/tally/{pollId}`
  - Executive proposals: `https://vote.makerdao.com/api/executive`
  - Executive detail: `https://vote.makerdao.com/api/executive/{key}`
  - Executive supporters: `https://vote.makerdao.com/api/executive/supporters`
