# Historical Data Source and Rights Ledger

**Status:** Publication-control record. Raw third-party data and derived calibration
profiles remain non-public unless the applicable row is explicitly cleared.

This ledger records the external inputs used by the historical ingestion and
calibration pipeline. It is intentionally conservative: public API access does
not by itself establish a right to redistribute a bulk historical dataset.
Where redistribution terms have not been affirmatively verified, the project
may publish source code, source identifiers, retrieval dates, checksums,
aggregate methods, and synthetic simulation output, but not the source rows or
a reversibly detailed derivative.

## Release rules

1. Raw source payloads under `results/historical/` are private research inputs.
2. Training and holdout profiles are conditional release assets. A profile may
   be deposited only after a row-level review confirms that its aggregates are
   non-reconstructive and permitted by every contributing source.
3. Checksums, row counts, date ranges, missingness summaries, transformation
   code, and source identifiers may be published because they do not reproduce
   the source records.
4. Forum post bodies, voter addresses, API credentials, provider response
   caches, and provider-specific raw payloads are excluded from the public
   release bundle.
5. A future clearance must record reviewer, review date, governing terms URL or
   license, allowed artifact class, attribution text, and any share-alike or
   non-commercial condition. Silence is not clearance.

## Source register

| Source | Material retrieved | Pipeline entry point | Current redistribution decision | Required attribution or action |
|---|---|---|---|---|
| Snapshot GraphQL | Proposal metadata, vote choices, voting power, spaces | `python/data_ingestion/download_historical.py` and `python/data_ingestion/dao_sources.json` | **Not cleared for raw redistribution** | Re-check Snapshot terms for the exact retrieval period; publish space IDs, query code, checksums, and aggregates only. Exclude voter-address-level rows. |
| Tally GraphQL | Governor proposals and votes | Same historical downloader; organization slugs in `dao_sources.json` | **Not cleared for raw redistribution** | Confirm API terms and attribution for deposited derivatives. Never publish the API key or raw authenticated responses. |
| Maker/Sky governance API | Polls, tallies, executives, supporters | Maker adapters in the historical downloader | **Not cleared for raw redistribution** | Confirm current portal/API terms. Exclude supporter-address records from public artifacts unless separately reviewed. |
| DAO Discourse forums | Topics, posts, timestamps, engagement counts | Discourse adapter in the historical downloader | **Metadata aggregates only** | Post text remains user-authored content. Publish aggregate counts and documented keyword procedures; do not deposit post bodies, usernames, or private-category content. |
| DefiLlama | Protocol/chain TVL, fees, revenue | DefiLlama adapter in the historical downloader | **Not cleared for bulk redistribution** | Publish retrieval code, protocol/chain slugs, checksums, and non-reconstructive aggregates pending terms review. |
| CryptoCompare | Market price, volume, and market-cap series | Primary market adapter in the historical downloader | **No raw redistribution** | Provider data is treated as licensed API content. Deposit computed summary targets only after confirming derivative-use terms and attribution. |
| CoinCap | Supply and fallback market observations | Fallback market adapter | **Not cleared for raw redistribution** | Re-check terms for the retrieval period; publish identifiers and transformation code only. |
| CoinGecko | Optional market fallback | Optional market adapter | **Not cleared for raw redistribution** | Confirm plan-specific attribution and redistribution conditions before any deposit. |
| DAO/project public pages | Source-ID verification and governance context | Manual configuration review in `dao_sources.json` | **Citations only** | Cite the relevant page in the manuscript or data statement; do not mirror page content. |

## Canonical derived artifacts

The publication-calibration workflow uses:

- `results/historical/validation/train/*_profile.json`
- `results/historical/validation/holdout/*_profile.json`
- `results/historical/source-checksums.json`
- `python/data_ingestion/compile_calibration.py`
- `scripts/run-calibration-validation.ts`

Each profile must carry the UTC partition, input checksums, selected row counts,
source-quality counts, and field-level observed/derived/unavailable status.
Training covers 2023-01-01 through 2024-12-31 UTC; held-out evaluation covers
2025-01-01 through 2025-12-31 UTC. The held-out partition is scoring-only.

## Current release decision

The public research package may include the simulator, ingestion and
transformation code, DAO/source configuration, experiment configurations,
synthetic runs, campaign manifests, checksums, validation summaries, and
publication tables/figures derived from synthetic runs. It must not include raw
historical source rows or forum/voter-level records. Derived calibration
profiles remain conditional until the final release review documents source-by-
source clearance. This restriction does not prevent independent reproduction:
reviewers can rerun the documented download and compilation pipeline under
their own provider access and applicable terms.
