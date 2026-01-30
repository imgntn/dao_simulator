# Simulation Fix Plan (Ecosystem Attack Resistance)

Date: 2026-01-28
Scope: Address top 10 issues from the ecosystem-attack-resistance research-quality report.

## Goals
- Make attack/governance rate metrics valid and bounded.
- Eliminate scale/units inconsistencies in treasury metrics.
- Ensure defense and veto metrics are wired and nonzero when enabled.
- Improve stability of skewed governance metrics and reporting.
- Re-run experiments and regenerate reports with reduced critical issues.

## Issue Set (Top 10)
1) Rate metrics exceed 1 (attack success/detection/mitigation, malicious proposal pass rate).
2) Zero-inflated attack outcomes cause extreme variability.
3) Cross-DAO alerts explode in magnitude (unscaled).
4) Veto actions always zero.
5) Governance mechanics gaps (voting snapshots, quorum, seed reset, staking interest, delegation chains).
6) Treasury metrics scale mismatch (near-zero in centralized-vs-distributed).
7) Coordinated defense actions mostly zero.
8) Whale influence skew/instability.
9) Single-entity control high variability.
10) Participation and member-count skew.

## Implementation Plan

### Phase 1: Metric correctness and event wiring (highest priority)
- Normalize attack rates in `lib/research/experiment-runner.ts` and `lib/research/fork-worker.ts`:
  - `attack_success_rate = successes / attempts` (clamp to [0,1]).
  - `attack_detection_rate = detections / attempts` (clamp to [0,1]).
  - `attack_mitigation_rate = mitigations / detections` (or / attempts; pick one and be consistent) and clamp.
  - `malicious_proposal_pass_rate = malicious_passed / malicious_total` (use proposal flags, not attack counts).
- Ensure attempt/detection/mitigation counts are consistent:
  - Audit event emission in `lib/governance/governance-processor.ts` and attack agents.
  - Ensure every attack attempt increments exactly once, and successes/detections/mitigations are subsets.
- Wire defense metrics:
  - Emit and count `veto_actions` and `coordinated_defense_actions` when inter-DAO veto/coordination triggers.
  - Verify `cross_dao_alerts` increments once per alert (not per step or per subscriber).

### Phase 2: Treasury units and symbol consistency
- Fix treasury metrics to use a consistent token symbol per DAO in city mode:
  - Use `context.tokenByDao` and fall back to `dao.tokenSymbol` instead of `DAO_TOKEN`.
  - Align `final_treasury`, `treasury_loss`, and `ecosystem_treasury_total` across city/DAO modes.
- Add unit checks/invariants to prevent near-zero totals where funding is nonzero.

### Phase 3: Reduce metric instability and skew
- Whale influence:
  - Compute over actual voters (or voting power snapshot) instead of all members when no votes exist.
- Single-entity control:
  - Verify denominator is total voting power; guard against zero and clamp to [0,1].
- Participation rate:
  - Ensure denominator = eligible members at vote time; compute per-proposal then average.
- Report skewed metrics using bootstrap CI or median in `scripts/generate-research-quality-report.ts`.

### Phase 4: Governance mechanics fixes (from report)
- Voting power snapshots per proposal to prevent live-balance manipulation.
- Quorum uses total participation, not only votes-for.
- Seed reset for reproducibility between runs.
- Staking interest compounding schedule corrected (annual vs per-step).
- Delegation chains for realistic high-quorum behavior.

### Phase 5: Validation + re-run
- Add unit tests for metric bounds in `tests/`:
  - Assert all rate metrics are in [0,1].
  - Veto/defense metrics nonzero when features enabled.
  - Treasury totals > 0 when funded.
- Rerun `experiments/research/multi-dao/ecosystem-attack-resistance.yaml` at 10 runs/config for smoke check.
- Rerun full suite and regenerate `research-quality-report.md` + combined report.

## Deliverables
- Updated metric logic + event wiring.
- Tests for metric bounds and defense events.
- Updated research-quality reports with reduced critical issues.
- Combined report updated with new date.

## Suggested File Touch Points
- `lib/research/experiment-runner.ts`
- `lib/research/fork-worker.ts`
- `lib/governance/governance-processor.ts`
- `lib/agents/*-attacker.ts`
- `scripts/generate-research-quality-report.ts`
- `tests/` (new or updated)

## Acceptance Criteria
- No rate metric exceeds 1.
- Veto and coordinated defense metrics nonzero in scenarios where enabled.
- Treasury metrics consistent across all sweeps.
- Critical issues reduced vs previous report (27 -> lower).
