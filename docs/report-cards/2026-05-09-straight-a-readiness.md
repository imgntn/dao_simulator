# Straight-A Readiness Report Card

Date: 2026-05-09
Commit under review: `fcf24c409`

## Recalibration

This report originally used the first report-card scale, where visible instrumentation, focus mode, scenario exchange, and docs were enough to call the current state an A. We are intentionally raising the bar. Under the harder scale, those same outcomes become B-level foundations: useful, working, and tracked, but not yet proven by automated budgets, visual regression evidence, or end-to-end user workflow metrics.

## Grades

| Area | Grade | Evidence |
| --- | --- | --- |
| Performance | B | Simulation, layout, buffer-update, render, page FPS, and rolling health signals are visible in the HUD, but no automated performance budget fails regressions yet. |
| Rendering Architecture | B | Three.js is the default hardware-accelerated renderer with Canvas 2D fallback, but renderer ownership, resource lifetime, and failure modes need deeper automated coverage. |
| UX | B | Focus mode reduces overlay noise and scenario JSON exchange exists, but core flows are not yet measured for task completion, interruption recovery, or saved-state trust. |
| Visual Design | B | The scene can shift between expressive archive mode and quieter focus mode, but visual hierarchy and density are not yet protected by screenshot baselines. |
| Explainability | B | The live panel links changes to events and observed deltas, but it does not yet expose confidence, competing causes, or replayable evidence. |
| Documentation | B | Rendering architecture and grading expectations are documented, but docs do not yet include performance-run recipes, regression thresholds, or release-gate checklists. |

## New Hard-A Requirements

| Area | Needed for A |
| --- | --- |
| Performance | Add automated browser performance tests that run a standard scenario, collect FPS/frame/sim/layout/render stats, and fail when budgets regress. |
| Rendering Architecture | Add renderer resource lifecycle tests or diagnostics proving geometries/materials/buffers are reused and disposed deterministically across resets and renderer switches. |
| UX | Add scenario-library workflows with validation feedback, import errors, duplicate handling, and e2e coverage for inspect, focus, zoom, pause/resume, and scenario exchange. |
| Visual Design | Add Playwright screenshot baselines for normal, focus, zoomed, inspector-open, and low-quality states; reduce HUD/overlay density based on those captures. |
| Explainability | Add a structured causality model that records candidate causes, confidence, metric deltas, and event ids so explanations can be replayed from history. |
| Documentation | Add a release-readiness checklist tying report-card grades to exact commands, expected thresholds, screenshots, and known residual risks. |

## Notes

- The previous straight-A claim is now treated as the B baseline for the harder grading scale.
- The report-card workflow should be repeated after large scene, simulation, or worker changes.
- Future A claims should attach automated smoke, unit/build, performance-budget, and visual-regression evidence.
