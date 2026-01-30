# Academic Publication Plan - Concrete TODO

This is the end-to-end checklist to make the simulator publishable and review-ready.

## Phase 0 - Scope and Questions (researcher input)
- [x] Lock 3-5 primary research questions and hypotheses (RQ1-RQ5). See `docs/RESEARCH_QUESTIONS.md`.
- [x] Anchor DAOs selected (top real-world by TVL/TVS, with existing twins): Aave, Lido, Sky (Maker), Uniswap, Arbitrum, Optimism. See `docs/ANCHOR_DAOS.md`.
- [x] Map each RQ to experiments + metrics. See `docs/RQ_EXPERIMENT_MAP.md`.
- [x] Define target venue/audience: AAMAS / Autonomous Agents + MAS venues; arXiv preprint for dissemination.

## Phase 1 - Empirical Grounding (calibration anchors)
- [x] Fill calibration targets with citations (participation, quorum reach, pass rate, treasury volatility).
- [x] Create a short "grounding table" in `docs/ACADEMIC_CALIBRATION_TARGETS.md`.
- [x] Agree on acceptable realism bands (defined in `docs/ACADEMIC_CALIBRATION_TARGETS.md`).

## Phase 2 - Baselines + Ablations (implemented)
- [x] Academic baseline experiment configuration (`experiments/paper/00-academic-baseline.yaml`).
- [x] Ablation study experiment configuration (`experiments/paper/02-ablation-governance.yaml`).
- [x] Paper suite README with run instructions (`experiments/paper/README.md`).

## Phase 3 - Sensitivity and Robustness (implemented)
- [x] Calibration sweep for participation dynamics (`experiments/paper/01-calibration-participation.yaml`).
- [x] Quorum sensitivity sweep (`experiments/paper/03-sensitivity-quorum.yaml`).

## Phase 4 - Validation (existing + wiring)
- [x] Validation suite already exists in `experiments/validation/`.
- [x] Paper suite runner can include validation in the same workflow (`scripts/run-paper-suite.ts`).

## Phase 5 - Reporting Pack (implemented)
- [x] Automated per-experiment report generation (`scripts/run-paper-suite.ts` -> `report`).
- [x] Automated combined report pack builder (`scripts/build-paper-report-pack.ts`).
- [x] Output index for reviewability (auto-generated `INDEX.md` in the pack).

## Phase 6 - Draft Tightening (feedback-driven)
- [x] Replace placeholder claims with conditional language in abstract/introduction/conclusion.
- [x] Remove or mark numeric recommendations as simulation-conditional in discussion.
- [x] Replace hard-coded run counts with template variables (`{{TOTAL_RUNS}}`, `{{EXPERIMENT_COUNT}}`, `{{TIMESTAMP}}`).
- [x] Add grounding and realism bands table (see `docs/ACADEMIC_CALIBRATION_TARGETS.md`).
- [x] Split into two papers: Paper 1 (RQ1-2) and Paper 2 (RQ3-5). Separate paper dirs: `paper_p1/`, `paper_p2/`.

## Phase 7 - Paper Drafting (next)
- [ ] Run suite and produce `results/paper-pack-YYYY-MM-DD`.
- [ ] Update `paper/` figures and narrative with suite outputs.
- [ ] Populate validation table with real DAO turnout bands (replace TBDs).
- [ ] Draft Methods/Validation/Limitations sections.
- [ ] Prepare appendix: full config + seeds + execution metadata.

## Quick Commands
- Run the full paper suite:
  - `npm run paper:suite`
- Run per-paper suites:
  - `npm run paper:suite:p1`
  - `npm run paper:suite:p2`
- Build/compile papers:
  - `npm run paper:build:p1`
  - `npm run paper:build:p2`
  - `npm run paper:build:both`
- Generate reports + pack from existing results:
  - `npm run paper:pack`

## Files created for this plan
- `docs/RESEARCH_QUESTIONS.md`
- `docs/ANCHOR_DAOS.md`
- `docs/RQ_EXPERIMENT_MAP.md`
- `experiments/paper/00-academic-baseline.yaml`
- `experiments/paper/01-calibration-participation.yaml`
- `experiments/paper/02-ablation-governance.yaml`
- `experiments/paper/03-sensitivity-quorum.yaml`
- `experiments/paper/04-governance-capture-mitigations.yaml`
- `experiments/paper/05-proposal-pipeline.yaml`
- `experiments/paper/06-treasury-resilience.yaml`
- `experiments/paper/07-inter-dao-cooperation.yaml`
- `experiments/paper/README.md`
- `scripts/run-paper-suite.ts`
- `scripts/build-paper-report-pack.ts`
