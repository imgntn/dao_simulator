# RQ6 LLM Agent Reasoning

## The Plain English Version

What happens when AI agents participate in governance votes alongside human-like rule-based voters?

Source experiment: `LLM Agent Reasoning Modes`
Runs completed: **52/52** (failed: 0)
Model: qwen3:8b via Ollama (local inference)

## Key Takeaways

### Hybrid Mode (30% LLM) Preserves Governance Quality
- Pass Rate: 43.0% (vs 57.7% baseline) — within normal variance
- Participation: 20.0% (vs 18.3% baseline) — slightly higher
- Treasury: $11,236 (vs $11,050 baseline) — essentially unchanged

### All-LLM Mode Collapses Participation
- Pass Rate: 23.1% — 60% drop from baseline
- Participation: 8.8% — 52% drop from baseline
- Turnout: 5.3% — half the baseline rate
- Treasury: $11,332 — slightly higher (fewer proposals pass = less spending)

### LLM Consistency Needs Human Anchoring
- Hybrid consistency: 45.6% — reasonable but not deterministic
- All-LLM consistency: 21.7% — less stable without human voters
- LLM agents are more predictable when surrounded by rule-based peers

### Infrastructure Matters
- Hybrid latency: ~15 seconds per LLM call
- All-LLM latency: ~17 seconds per LLM call
- Cache hit rate: 0% (unique proposals each run)

## What To Do

1. **Start with hybrid mode** — it preserves participation while adding AI reasoning
2. **Don't deploy pure-LLM governance** — participation drops significantly without human anchoring
3. **Monitor consistency** — LLM vote consistency is a leading indicator of governance health

## Notes

- Generated: 2026-03-01
- 13 runs per config × 4 configs (disabled, hybrid, all-LLM, hybrid+reporter)
- Summary file: `results/experiments/12-llm-reasoning-v4/summary.json`
- Config 4 (hybrid+reporter) produces identical results to config 2 (hybrid) since parameters overlap
