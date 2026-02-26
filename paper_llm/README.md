# LLM Paper Profile

This directory hosts the dedicated LLM-focused paper build (`paper_llm`).

## Scope

Primary experiment:
- `experiments/paper/12-llm-agent-reasoning.yaml`

Generated figures:
- `figures/llm_vote_consistency.png`
- `figures/llm_cache_hit_rate.png`
- `figures/llm_avg_latency.png`
- `figures/llm_outcomes_tradeoff.png`

## Commands

```bash
npm run paper:suite:llm
npm run paper:update:llm
npm run paper:compile:llm
```

Use `--allow-stale` during exploratory runs when strict freshness checks are intentionally bypassed.
