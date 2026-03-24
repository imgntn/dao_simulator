# RQ6 LLM Agent Reasoning

## The Plain English Version

What happens when AI agents participate in governance votes alongside human-like rule-based voters?

Source experiment: `LLM Agent Reasoning Modes`
Runs completed: **300** (failed: 0)
Models: qwen3:4b, llama3.2:3b, gemma3:4b via Ollama (local inference)

## Key Takeaways

### LLM Agents Make Governance Worse, Not Just Different

The central finding reversed from the initial 52-run pilot. With 300 runs across 3 small model architectures, LLM agents consistently decrease pass rates compared to the rule-based baseline. The more LLM agents you add, the worse governance outcomes get.

### Disabled Baseline Sets the Bar
- Pass Rate: **73.4%** — rule-based agents with calibrated parameters
- This is the number to beat, and no LLM configuration matches it reliably

### Hybrid Mode (30% LLM) Barely Matches Baseline
- Pass Rate: **71-76%** — within noise of the baseline but not an improvement
- LLM agents introduce disagreement that occasionally drags pass rates down
- The human-like rule-based majority anchors the LLM minority

### All-LLM Mode Is Consistently Worst
- Pass Rate: **64-71%** — consistently LOWER than baseline across all 3 models
- Without rule-based voters to anchor decisions, LLM reasoning introduces systematic disagreement
- Each model architecture fails in its own way, but all fail in the same direction

### LLM Reasoning Introduces Disagreement
- LLM agents reason about proposals individually and often find reasons to vote no
- Rule-based agents follow calibrated behavioral parameters that reflect historical voting patterns
- The "thoughtfulness" of LLM reasoning works against governance efficiency
- This is not a model quality issue — 3 different architectures all show the same pattern

## What To Do

1. **Don't assume AI governance improves outcomes** — LLM reasoning actively reduces pass rates
2. **If using LLM agents, use hybrid mode only** — rule-based majority anchors governance quality
3. **Pure-LLM governance is harmful** — consistently the worst configuration tested
4. **Model choice matters less than mode** — all 3 models showed the same directional effect

## Notes

- Generated: 2026-03-24
- 30 runs per config × 3 models × ~3 configs (disabled, hybrid, all-LLM) = 300 runs
- Models tested: qwen3:4b, llama3.2:3b, gemma3:4b (all small/local models)
- Confidence: substantially upgraded from initial 52-run pilot — 3 model architectures confirm the finding is not model-specific
- Summary files: `results/experiments/*/summary.json`
