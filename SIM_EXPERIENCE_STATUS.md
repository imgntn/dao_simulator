# DAO Simulator Experience Status

The earlier dashboard backlog has been retired. Its implemented capabilities
now live in the active Sanctum Explore experience, while publication-facing
work is governed by `docs/PUBLICATION_IMPLEMENTATION_MASTER_PLAN.md`.

## Current visualization direction

- The legacy skyscraper renderer is preserved under
  `archive/legacy-skyscraper-visualization/`.
- Sanctum is the primary interactive simulation experience.
- Explore mode supports hall navigation, scenario authoring, simulation
  controls, inspection, annotations, comparison, and what-if branching.
- Evidence mode presents only verified immutable campaigns and their frozen
  analyses.
- Advanced analysis tools are separated from the default scene to preserve a
  legible first-run experience.

## Delivered experience capabilities

- Organization health, treasury, governance, market, and risk surfaces
- Strategy overlays and scenario presets
- Severity-classified operational events and causal event inspection
- Cross-run history and milestone summaries
- Outcome reports that distinguish mission, treasury, market, and governance
  termination causes
- Timeline annotations, alerts, exports, comparisons, and branch analysis
- Guided onboarding, keyboard controls, responsive layouts, and renderer
  fallbacks

Items from the retired backlog that were decorative progression mechanics were
deliberately excluded from the research-focused product direction. Scientific
traceability, evidence inspection, accessible encodings, and scenario
comparison take precedence over unlock systems or game-like reward loops.
