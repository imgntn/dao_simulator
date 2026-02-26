# Strategic Plan: LLM Agents → Paper Contribution

## Context
LLM agent infrastructure is **complete** (793 tests passing, 20 review issues fixed). Experiment 12 is configured but **not yet run**. The paper currently mentions LLM agents only as future work (limitations.tex:78). We need to: (1) fix config issues, (2) run experiments, (3) integrate results into the paper as a core contribution, and (4) position the work competitively.

**Research landscape**: Competitors include AAMAS 2025 (8.4M LLM agents, generic), EACL 2026 persona voting (F1=0.793, binary only), FlockVote (US elections), LLM Economist (100 agents, tax policy). None combine LLM agents + calibrated DAO digital twins + advanced mechanism design. Our unique angle: **empirically validated LLM governance simulation across 14 real DAOs**.

---

## Phase 1: Fix Experiment 12 Config & Code

### 1.1 Update `experiments/paper/12-llm-agent-reasoning.yaml`
- Change `runs: 30` → `runs: 100` (match all other experiments)
- Change `steps: 500` → `steps: 720` (match all other experiments, caching absorbs cost)
- Add missing metrics that other experiments report:
  ```yaml
  - { name: "Whale Influence", type: builtin, builtin: whale_influence }
  - { name: "Governance Capture Risk", type: builtin, builtin: governance_capture_risk }
  - { name: "Final Gini", type: builtin, builtin: final_gini }
  - { name: "Quorum Reach Rate", type: builtin, builtin: quorum_reach_rate }
  - { name: "Delegate Concentration", type: builtin, builtin: delegate_concentration }
  - { name: "Single Entity Control", type: builtin, builtin: single_entity_control }
  - { name: "Collusion Threshold", type: builtin, builtin: collusion_threshold }
  ```

### 1.2 Fix `llm_vote_consistency` metric (all 3 workers)
**Problem**: Currently compares LLM vote against `optimism > 0.5 ? 'yes' : 'no'` — a crude heuristic that ignores forum sentiment, opposition bias, herding, funding progress, and all other factors in the real `decideVote()`.

**Fix**: Store the rule-based fallback vote alongside each LLM decision. In `LLMAgent.decideVote()`, before returning the LLM decision, also call `super.decideVote(topic)` and store it on the vote record. Then the metric reads from the stored rule-based vote instead of the optimism heuristic.

**Files**:
- `lib/agents/llm-agent.ts` — add `ruleBasedVote` field to vote history records
- `lib/llm/llm-voting-mixin.ts` — extend `LLMVoteRecord` interface with optional `ruleBasedVote`
- `lib/research/experiment-runner.ts` (~line 1982) — read `record.ruleBasedVote` instead of `optimism > 0.5`
- `lib/research/fork-worker.ts` (~line 879) — same fix
- `lib/research/simulation-worker.ts` (~line 848) — same fix

### 1.3 Add new metrics
- **`llm_override_rate`**: Fraction of decisions where LLM disagrees with rule-based fallback (measures LLM divergence)
- **`llm_confidence_mean`**: Average confidence across all LLM decisions

**Files**: Add cases to `extractBuiltinMetric()` in all 3 workers + add to `BuiltinMetricType` union in `experiment-config.ts`

### 1.4 Fix "All LLM" config confound
Current config zeroes all agent types and creates 49 generic `LLMAgent` instances, losing behavioral diversity. Better approach: keep agent type distribution, set `llm_agent_mode: "all"` so all existing agent types get LLM-upgraded reasoning while retaining their inherent parameters (optimism, risk tolerance, etc.).

**Alternative considered**: Keep current design as-is — it answers a different question ("what if agents only reason via LLM without type-specific biases?"). May want both configs. Add a 5th config: "All Upgraded" that keeps type distribution + LLM.

---

## Phase 2: Run Experiment 12

### 2.1 Prerequisites
- Ollama installed and running at `localhost:11434`
- Model pulled: `ollama pull qwen3:8b` (~5-6GB VRAM)
- Disk cache: add auto-save between runs to speed up runs 2-100

### 2.2 Run command
```bash
npx ts-node scripts/run-experiment.ts experiments/paper/12-llm-agent-reasoning.yaml
```

### 2.3 Expected runtime
- 4 configs × 100 runs × 720 steps
- Baseline: ~30s/run (no LLM), Hybrid: ~3-5min/run (warm cache), All LLM: ~5-8min/run
- Total: ~15-25 hours for full experiment
- Cache persistence between runs will help significantly

### 2.4 Expected outcomes
- Pass rates should differ between LLM and rule-based (LLM reasons vs coin-flip)
- Margin of victory likely changes (LLM confidence-gated decisions)
- LLM abstention rate should be visible (low-confidence → fallback)
- Whale influence/capture risk may shift (LLM agents less susceptible to herding)

---

## Phase 3: Paper Integration

### 3.1 Add RQ6 to introduction
**File**: `paper/sections/introduction.tex`

> **RQ6**: How does LLM-based reasoning affect governance outcomes compared to rule-based heuristics, and can hybrid agent architectures improve behavioral realism while maintaining reproducibility?

### 3.2 Add Contribution #6
> **LLM-Augmented Agents**: An LLM agent architecture with deterministic fallback, demonstrating [results TBD] across hybrid and full-LLM configurations while maintaining reproducibility through response caching and seeded generation.

### 3.3 Section updates needed

| Section | File | Changes |
|---------|------|---------|
| Abstract | `paper/sections/abstract.tex` | Add 1-2 sentences about LLM results |
| Introduction | `paper/sections/introduction.tex` | Add RQ6 + Contribution #6 |
| Background | `paper/sections/background.tex` | Add "LLM Agents in Simulation" subsection (~0.5 page), cite 5 competitors |
| Architecture | `paper/sections/architecture.tex` | Add "LLM Agent Architecture" subsection: async pre-compute, memory, fallback |
| Methodology | `paper/sections/methodology.tex` | Add Experiment 12 to parameter table, document LLM metrics |
| Results | `paper/sections/results.tex` | Add RQ6 subsection with table + figure |
| Discussion | `paper/sections/discussion.tex` | Interpret LLM vs rule-based findings |
| Limitations | `paper/sections/limitations.tex` | Move LLM from future work → completed; add LLM-specific caveats (model dependency, cost); also fix: futarchy is listed as "omitted" but is actually implemented |
| Conclusion | `paper/sections/conclusion.tex` | Update contribution count |
| Appendix | `paper/sections/appendix_configs.tex` | Add Exp 12 row |
| Main | `paper/main.tex` | Update `\experimentcount` and `\totalruns` |

### 3.4 Key figure and table
- **Figure**: Bar chart comparing pass rate, turnout, margin of victory, whale influence, capture risk across Baseline / Hybrid 30% / All LLM / Hybrid+Reporter. Error bars from N=100.
- **Table**: LLM behavioral comparison (pass rate, turnout, whale influence, capture risk, LLM consistency, override rate, confidence, latency)
- **Narrative**: Frame as "bridging the realism gap" — LLM agents validate (or challenge) rule-based behavioral assumptions

---

## Phase 4: Follow-Up Experiments (Post Experiment 12)

### 4a. Experiment 12b: LLM on Calibrated DAOs (HIGHEST IMPACT)
Run LLM agents against the 14 calibrated digital twins. For each DAO:
- Config A: rule-based calibrated baseline (existing)
- Config B: hybrid 30% LLM
- Compare calibration accuracy scores (BacktestRunner)
- **If LLM improves even a few DAOs from 0.85 → 0.90+, that's a headline result**
- Config: 14 DAOs × 2 modes × 30 runs = 840 runs
- New file: `experiments/paper/12b-llm-calibrated.yaml`

### 4b. Experiment 12c: Consistency Analysis
- Same proposal presented to same agent 100 times (vary seed)
- Measure: agreement rate, confidence distribution, reasoning diversity
- Directly addresses Behavioral Consistency (2026) paper's concerns
- Shows our hybrid fallback solves the stochasticity problem

### 4c. Experiment 12d: Model Size Sweep (if time permits)
- Compare qwen3:1.7b vs qwen3:4b vs qwen3:8b
- Measure quality/cost/latency tradeoffs
- Practical guidance for DAO practitioners

**Priority**: 4a >> 4b > 4c

---

## Phase 5: Competitive Positioning

### Claims nobody else can make
1. **First calibrated LLM governance simulation** — 14 real DAOs, 0.85+ accuracy
2. **Hybrid LLM-heuristic architecture for reproducible simulation** — async pre-compute + cache + deterministic fallback
3. **Most comprehensive mechanism comparison** — 7 voting mechanisms × 14 DAOs × LLM/rule-based modes
4. **LLM as behavioral model validation** — using LLM divergence to identify which rule-based assumptions matter

### Target venues
- **AAMAS 2026** (multi-agent + LLM agents, main venue)
- **ACM DLT** (journal, DAO governance)
- **NeurIPS 2026 Workshop** (LLM agents workshop if available)
- **arXiv preprint first** (establish priority)

---

## Execution Order

```
Phase 1 (Code fixes):     ~3 hours
  1.1 YAML config update
  1.2 Fix llm_vote_consistency
  1.3 Add new metrics
  1.4 Add 5th "All Upgraded" config

Phase 2 (Run experiment):  ~15-25 hours (background)
  2.1 Ollama setup
  2.2 Run Experiment 12

Phase 3 (Paper, parallel with Phase 2):
  3.1-3.4 Write paper sections that don't depend on results
  (Background, Architecture, Methodology, Limitations fixes)
  After Phase 2 completes → populate Results, Abstract, Conclusion

Phase 4 (Follow-up, after Phase 3):
  4a → 4b → 4c in priority order
```

---

## Verification
- All 793+ tests pass after code changes (Phase 1)
- Zero TypeScript errors
- Experiment 12 completes successfully with all 4-5 configs
- Paper compiles without errors (`pdflatex main.tex`)
- Results table matches experiment output data
