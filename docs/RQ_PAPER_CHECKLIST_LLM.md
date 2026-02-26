# RQ -> Paper Checklist (LLM Paper: Reasoning Modes)

Use this checklist for wiring LLM experiment outcomes into `paper_llm/`.

Legend: [ ] = todo, [x] = done

## LLM reasoning behavior
- [ ] Experiment: `experiments/paper/12-llm-agent-reasoning.yaml`
- [ ] Figure: LLM vote consistency by mode
- [ ] Figure: LLM cache hit rate by mode
- [ ] Figure: LLM average latency by mode

## Governance outcomes under LLM modes
- [ ] Table: Proposal pass rate, turnout, and activity by mode
- [ ] Figure: Governance throughput vs LLM latency tradeoff
- [ ] Table: Reporter-enabled mode vs non-reporter mode comparison

## Reproducibility and runtime quality
- [ ] Include run counts and completion timestamp for Experiment 12
- [ ] Verify strict freshness checks pass for `llm` profile
- [ ] Include report links for the generated result directory
