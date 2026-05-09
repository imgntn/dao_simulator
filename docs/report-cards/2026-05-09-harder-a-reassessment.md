# Harder-A Reassessment

Date: 2026-05-09
Commit under review: `fcf24c409`

## Summary

The current simulator is no longer graded against "is the improvement present?" It is now graded against "is the improvement measurable, regression-protected, and trusted by a user doing real work?" Under that tougher rubric, every former A is a B baseline.

## Reassessed Grades

| Area | Current Grade | Why It Is Not A Yet |
| --- | --- | --- |
| Performance | B | The HUD exposes useful metrics, but performance budgets are not enforced in CI or e2e runs. We need repeatable scenario timings, thresholds, and failure output. |
| Rendering Architecture | B | Three.js and Canvas fallback are in place, but resource reuse and cleanup are not proven under resets, renderer switches, and long-running sessions. |
| UX | B | Core controls are usable and less blocked by sim ticking, but the scenario workflow lacks explicit validation messages, import error states, and full e2e coverage. |
| Visual Design | B | Focus mode helps reduce busyness, but density, hierarchy, and overlay stability need screenshot baselines and design-state coverage. |
| Explainability | B | Explanations now cite events and deltas, but they need structured provenance, confidence, competing causes, and replay support. |
| Documentation | B | Architecture docs exist, but the report-card process needs exact commands, budgets, screenshots, and release criteria. |

## Path to New Hard As

| Priority | Area | Work Required | Acceptance Evidence |
| --- | --- | --- | --- |
| 1 | Performance | Add a Playwright performance scenario that runs a known config, records FPS, frame time, sim ms, layout ms, buffer ms, and render ms. | CI/local command fails if budgets regress; report card includes captured values. |
| 2 | Rendering Architecture | Add renderer lifecycle diagnostics for pooled Three.js resources and renderer switching. | Reset/switch tests show stable geometry/material/texture counts and no runaway allocations. |
| 3 | UX | Add scenario import validation, visible error/success states, duplicate handling, and e2e coverage for focus/zoom/inspect/import/export. | Browser tests cover the main operator loop without relying on manual inspection. |
| 4 | Visual Design | Add screenshot baselines for default, focus, zoomed, inspector-open, and low-quality states. | Visual diffs catch overlay jumping, crowded states, and hierarchy regressions. |
| 5 | Explainability | Emit structured explanation records with event ids, metric deltas, confidence, and alternate causes. | Historical snapshots can replay the same explanation deterministically. |
| 6 | Documentation | Add a release-readiness checklist and report-card evidence template. | Every A grade points to commands, metrics, screenshots, and known residual risks. |

## Next Report Card Gate

Do not restore A grades until at least the following pass in one run:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd test`
- `npm.cmd run test:e2e:smoke`
- A new performance-budget command with captured simulator metrics
- A visual-regression or screenshot review artifact for the main simulation states
