# API Provider Pricing and Request Limits

Last checked: 2026-01-24

Sources used:
- https://www.alchemy.com/pricing
- https://www.quicknode.com/pricing
- https://etherscan.io/apis

## RPC providers

| Provider | Plan | Price | Included usage | Rate limit | Overages / notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Alchemy | Free | $0 | 30M CU per month | 500 CU/s (25 req/s) | CU-based | https://www.alchemy.com/pricing |
| Alchemy | Pay As You Go | Usage-based | No included CUs; $0.45/1M CU up to 300M, $0.40/1M CU after | 10,000 CU/s (300 req/s) | Enterprise is custom | https://www.alchemy.com/pricing |
| QuickNode | Free trial | $0 | 10M API credits included | 15 req/s | No additional API credits | https://www.quicknode.com/pricing |
| QuickNode | Build | $49/mo | 80M API credits included | 50 req/s | $0.62 per 1M API credits | https://www.quicknode.com/pricing |
| QuickNode | Accelerate | $249/mo | 450M API credits included | 125 req/s | $0.55 per 1M API credits | https://www.quicknode.com/pricing |
| QuickNode | Scale | $499/mo | 950M API credits included | 250 req/s | $0.53 per 1M API credits | https://www.quicknode.com/pricing |
| QuickNode | Business | $999/mo | 2B API credits included | 500 req/s | $0.50 per 1M API credits | https://www.quicknode.com/pricing |

## Explorer APIs

| Provider | Plan | Price | Included usage | Rate limit | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Etherscan | Free | $0 | Up to 100,000 API calls per day | 3 calls/sec | Selected chain community endpoints only | https://etherscan.io/apis |
| Etherscan | Standard | $199/mo | Up to 200,000 API calls per day | 10 calls/sec | All supported chains + API Pro endpoints | https://etherscan.io/apis |
| Etherscan | Advanced | $299/mo | Up to 500,000 API calls per day | 20 calls/sec | All supported chains + API Pro endpoints | https://etherscan.io/apis |
| Etherscan | Professional | $399/mo | Up to 1,000,000 API calls per day | 30 calls/sec | All supported chains + API Pro endpoints | https://etherscan.io/apis |
| Etherscan | Pro Plus | $899/mo | Up to 1,500,000 API calls per day | 30 calls/sec | Address Metadata endpoint included | https://etherscan.io/apis |
| Etherscan | Enterprise | Contact | Unmetered usage | Unmetered | Dedicated infrastructure + SLA | https://etherscan.io/apis |

## Notes / gaps

- Infura pricing page returned HTTP 403 from automated fetch, so no verified numbers in this table.
- Ankr pricing page returned HTTP 403 and docs did not surface clear request limits in the fetched HTML.
- Chainstack pricing page loaded, but it did not list request limits in the fetched HTML (only cost comparison).
