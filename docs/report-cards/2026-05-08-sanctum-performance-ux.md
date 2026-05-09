# Report Card: Sanctum Performance & UX Baseline

- Date: `2026-05-08`
- Commit: `f11f274b3`
- Scope: Simulator state after Three.js renderer, demand rendering, hot-path cleanup, and timing HUD work.
- Reviewer: `Codex`

## Grades

| Area | Grade | Notes | Next Check |
| --- | --- | --- | --- |
| Rendering Performance | A- | Three.js is the default renderer, GPU buffers are demand-rendered, line buffers are pooled, and Canvas 2D remains as fallback. Remaining risk is static SVG/DOM compositing and dev-mode overhead. | Compare production FPS against dev FPS and inspect SVG compositor cost. |
| Simulation Performance | A | Simulation runs in a worker and now reports sim step, snapshot, and total step timing. Bottlenecks are measurable instead of guessed. | Watch `simStepMs` and `snapshotMs` under larger scenarios. |
| Main-Thread Efficiency | B+ | Removed frame-loop buffer updates, coalesced raycasts, reduced broad store subscriptions, downsampled chart data, and avoided extra history scans. Remaining risk is React/Recharts/sidebar work when many panels are open. | Profile with all panels expanded during high-speed stepping. |
| Visual Layout Worker | A- | Layout is off-main-thread, culling/LOD are active, layout timing is exposed, and placement cache key work moved out of the worker hot path. | Consider transferable typed arrays if layout payload size becomes visible. |
| UX / Interaction | A- | Hover, click, follow mode, keyboard stepping, zoom, renderer toggle, performance HUD, and inspector are all in place. | Polish camera behavior and group renderer/debug controls more clearly. |
| Explainability | B+ | Cause chains, vote drivers, power flow, metric deltas, and timing stats are available. Still more descriptive than truly causal. | Add explicit event provenance from the sim engine. |
| Scenario Authoring | B+ | DAO, governance, population, quorum, seed, run length, shock timing/severity, and saved local presets are supported. | Add scenario import/export and richer faction editing. |
| Visual Design | B+ | Sanctum has a distinct visual language and a state legend. The hybrid SVG/WebGL look can still feel busy. | Simplify the static backdrop and tune visual density by zoom level. |
| Architecture | A- | Good separation: sim worker, visual layout worker, renderer adapters, app UI, and fallback renderer. | Formalize renderer interfaces and shared stats types. |
| Observability | A- | HUD separates page FPS, Three render FPS, sim ms, layout ms, GPU buffer ms, render ms, draw calls, triangles, and culling. | Add rolling averages and warning thresholds. |
| Docs | B+ | README and feature docs reflect the current renderer and performance architecture. | Add a dedicated rendering architecture doc with diagrams. |
| Overall | A- | The simulator is GPU-backed, measurable, more responsive, and has a clean fallback story. | Focus next on sidebar/chart React cost, visual simplification, and stronger causal explainability. |

## Evidence

- Checks run:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Browser smoke:
  - Three renderer active.
  - WebGL context present.
  - Timing HUD visible.
  - Simulation advanced to live steps.
- Screenshot artifacts:
  - `test-results/hotpath-cleanup-smoke.png`
  - `test-results/demand-three-renderer-smoke.png`

## Follow-Up Priorities

1. Profile sidebar and chart panels with all panels expanded while the sim is running.
2. Reduce visual busyness and static SVG compositor cost.
3. Add causal provenance fields to sim events so explainability can move beyond descriptive deltas.
