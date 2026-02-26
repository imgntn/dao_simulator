# Paper Suite (Academic-grade)

This folder contains the curated experiment suite used for paper-quality results.
See `docs/RQ_EXPERIMENT_MAP.md` for the mapping from research questions to configs.

Suite contents:
- Baseline: `00-academic-baseline.yaml`
- Calibration: `01-calibration-participation.yaml`
- Ablations: `02-ablation-governance.yaml`
- Sensitivity: `03-sensitivity-quorum.yaml`
- RQ2: `04-governance-capture-mitigations.yaml`
- RQ3: `05-proposal-pipeline.yaml`
- RQ4: `06-treasury-resilience.yaml`
- RQ5: `07-inter-dao-cooperation.yaml`
- LLM modes: `12-llm-agent-reasoning.yaml`

Paper splits:
- Paper 1 (RQ1-2): participation + capture (`00,01,02,03,04`)
- Paper 2 (RQ3-5): pipeline + treasury + inter-DAO (`00,02,05,06,07`)
- LLM paper: reasoning modes and governance outcomes (`12`)

Run the full suite:
```
npm run paper:suite
```

Run per-paper suites:
```
npm run paper:suite:p1
npm run paper:suite:p2
npm run paper:suite:llm
```

Build/compile both papers after a full suite run:
```
npm run paper:build:both
```

Generate report pack from existing results:
```
npm run paper:pack
```

Outputs land in `results/paper/*` and combined packs in `results/paper-pack-YYYY-MM-DD/`.

## Pipeline Configuration

Paper suite profile membership is configured in:

`experiments/paper/pipeline.config.yaml`

- `full` uses auto-discovery of numbered configs (for example, `10-*`, `11-*`, `12-*` are included automatically unless excluded).
- `p1`, `p2`, and `llm` are explicit profile lists.

## Freshness Guardrails

`run-paper-suite.ts` and `paper-update.ts` enforce freshness checks by default:

- Required artifacts: `summary.json`, `stats.csv`
- Run-count sanity: `totalRuns >= expected runs from config`
- Staleness: results must not predate config edits

To bypass during exploratory work, use `--allow-stale`.
