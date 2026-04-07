# RQ6 LLM Agent Reasoning

## The Plain English Version

What happens when AI agents participate in governance votes alongside human-like rule-based voters?

Source experiments: `LLM Agent Reasoning` (exp 12, 300 runs), `Gemma4 E4B Enriched` (exp 17, 50 runs)
Models: Gemma 4 E4B (8B, BF16, thinking mode), qwen3:4b, llama3.2:3b, gemma3:4b via Ollama

## Key Takeaways

### Thinking Mode Is the Game Changer

The original finding (exp 12/12b, 300 runs with 3 small models) showed LLMs decrease governance quality. **Experiment 17 reverses this** by fixing two critical problems: enriched prompts that give LLMs information parity with rule-based agents (~2-3K tokens of DAO briefing vs ~350 tokens before), and enabling thinking/chain-of-thought mode so the model reasons step-by-step before voting.

### Without Thinking, LLMs Still Hurt Governance
- Hybrid (30% LLM): **67.3%** pass rate — 5.6pt below baseline
- All-LLM: **57.7%** — 15.2pt below baseline
- The enriched prompts alone are not enough; the model needs to *reason* through them

### With Thinking Mode, LLMs Improve Governance
- Hybrid + Thinking: **76.9%** — **+4.0pt above baseline**
- All-LLM + Thinking: **79.6%** — **+6.7pt above baseline** (best config)
- This is the first configuration where LLM agents outperform rule-based agents

### Rule-Based Baseline
- Pass Rate: **72.9%** — calibrated rule-based agents with funding ratio, herding, forum sentiment, opposition bias, and black swan factors

## What Changed Between Experiments 12 and 17

| Factor | Exp 12 (old) | Exp 17 (new) |
|--------|-------------|-------------|
| Models | qwen3:4b, llama3.2:3b, gemma3:4b (3-4B) | Gemma 4 E4B (8B, BF16) |
| Prompt size | ~350 tokens (title + numbers) | ~2-3K tokens (full DAO briefing) |
| Context given | Proposal title, vote counts, funding % | + description, treasury health, other proposals, forum sentiment, black swan events, vote history, governance rule explanation |
| Thinking mode | Not available | Enabled (chain-of-thought reasoning) |
| Confidence threshold | 0.2 (too low, let bad parses through) | 0.4 (malformed JSON safely falls back) |
| Temperature | 0.3 (too deterministic) | 0.7 |
| Max tokens | 256 | 1024 / 4096 (thinking) |

## What To Do

1. **LLM governance works, but only with thinking mode** — without it, LLMs still degrade outcomes
2. **Information parity matters** — LLMs need the same context rule-based agents use (treasury health, forum sentiment, competing proposals)
3. **All-LLM + thinking is the best config** — 79.6% pass rate, +6.7pt above baseline
4. **Model quality matters now** — Gemma 4 E4B (8B) with native JSON and thinking outperforms 3-4B models. Chain-of-thought reasoning is the critical capability
5. **Confidence gating is essential** — malformed or low-confidence LLM responses should fall back to rule-based voting

## Notes

- Updated: 2026-04-07
- Exp 17: 10 runs per config x 5 configs = 50 runs (pilot). Full 30-run experiment pending.
- Model: gemma4:e4b-it-bf16 (8B total, 4.5B effective params, 128K context, native JSON + thinking)
- Exp 12: 30 runs per config x 10 configs = 300 runs with 3 small models (now superseded)
- The old finding ("LLMs degrade quality") was caused by impoverished prompts and lack of thinking mode, not a fundamental limitation of LLM governance
- Summary files: `results/paper/17-llm-gemma4-enriched/summary.json`
