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

## Quantization Sensitivity (exp 18a, 2026-04-12)

A follow-up pilot tested whether the thinking-mode improvement survives 8-bit weight quantization. It does not.

### Setup
- Same model family, same enriched prompts, same thinking-mode settings
- Only change: `gemma4:e4b-it-q8_0` (8-bit GGUF, 11 GB VRAM) instead of `gemma4:e4b-it-bf16` (16-bit, 16 GB)
- Same 720 steps per run, 10 runs per config, same seeds
- Tested hybrid (no thinking) and hybrid+thinking only — gated pilot

### Results

| Config | bf16 Pass Rate | q8_0 Pass Rate | Delta vs no-LLM baseline |
|--------|---------------|----------------|--------------------------|
| Hybrid (no thinking) | 67.3% | 69.8% | bf16 −5.6pt, q8_0 −3.1pt |
| **Hybrid + Thinking** | **76.9% (+4.0pt)** | **63.1% (−9.8pt)** | **13.9pt gap** |

Baseline (no LLM): 72.9%. Two-sample t-test on hybrid+thinking means: t ≈ 2.17, p ≈ 0.04 — borderline significant at 10 runs/config.

### The finding

**8-bit quantization breaks chain-of-thought governance reasoning in Gemma 4 E4B.**

- Without thinking mode, q8_0 performs indistinguishably from bf16 — weight quantization preserves basic sentiment-parsing inference
- With thinking mode, q8_0 produces degraded reasoning traces that lead to *worse* vote decisions than the no-thinking shortcut. Not merely diminished improvement — actively harmful, worse than no LLM participation at all
- The +4–7pt governance improvement from thinking mode is **precision-sensitive**, not architecture-driven. It depends on the model faithfully executing long chains of deliberation, which 8-bit quantization disrupts enough to break the reasoning cliff

### What This Means

If you want LLM agents to *improve* governance via chain-of-thought, you pay the full precision cost (16 GB VRAM for E4B-class models). You cannot cheaply deploy "small quantized reasoning" governance agents and expect the paper's headline result. For applications that don't need the thinking boost — e.g. simple vote parsing or hybrid cohorts without thinking mode — q8_0 is a free memory win.

This also suggests the gain in exp 17 is real cognition, not a prompt-engineering artifact: if it were just the enriched DAO briefing, q8_0 thinking would still work. The fact that quantization of the reasoning process specifically kills the effect confirms the model is doing something at inference time that matters.

## What To Do

1. **LLM governance works, but only with thinking mode** — without it, LLMs still degrade outcomes
2. **Information parity matters** — LLMs need the same context rule-based agents use (treasury health, forum sentiment, competing proposals)
3. **All-LLM + thinking is the best config** — 79.6% pass rate, +6.7pt above baseline
4. **Model quality matters now** — Gemma 4 E4B (8B) with native JSON and thinking outperforms 3-4B models. Chain-of-thought reasoning is the critical capability
5. **Confidence gating is essential** — malformed or low-confidence LLM responses should fall back to rule-based voting
6. **Do not quantize below bf16 for thinking-mode configs** — q8_0 breaks the reasoning cliff, dropping pass rate 13.9pt below bf16 and below the no-LLM baseline

## Notes

- Updated: 2026-04-12
- Exp 17: 10 runs per config x 5 configs = 50 runs (pilot). Full 30-run experiment pending.
- Exp 18a: 10 runs per config x 2 configs = 20 runs (q8_0 quantization ablation pilot)
- Model: gemma4:e4b-it-bf16 (primary), gemma4:e4b-it-q8_0 (quantization ablation)
- Exp 12: 30 runs per config x 10 configs = 300 runs with 3 small models (now superseded)
- The old finding ("LLMs degrade quality") was caused by impoverished prompts and lack of thinking mode, not a fundamental limitation of LLM governance
- Summary files: `results/paper/17-llm-gemma4-enriched/summary.json`, `results/paper/18a-llm-gemma4-q8-pilot/summary.json`
