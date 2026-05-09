# DAO Simulator Rendering Architecture

Last updated: 2026-05-09

## Runtime Split

The simulator is intentionally split so simulation work, layout work, and rendering work do not block each other more than necessary.

| Layer | Owner | Responsibility |
| --- | --- | --- |
| Simulation worker | `lib/browser/simulation-worker.ts` | Runs simulation ticks, emits compact snapshots, records worker timing. |
| Visual layout worker | `lib/browser/visual-layout-worker.ts` | Converts snapshots into draw buffers, culls offscreen agents, selects quality tiers. |
| Three.js renderer | `components/simulation/sanctum/SanctumThreeLayer.tsx` | Reuses pooled geometries/materials and updates GPU buffers on demand. |
| Canvas fallback | `components/simulation/sanctum/CanvasVisualLayer.tsx` | Keeps a 2D accelerated fallback when WebGL is unavailable. |
| React UI | `components/simulation/sanctum/SanctumScene.tsx` | Owns controls, overlays, inspector state, focus mode, and performance HUD. |

## Runtime Diagnostics

The hard-A report gate reads machine-readable runtime evidence from the browser:

| Hook | Producer | Used For |
| --- | --- | --- |
| `window.__daoPerfSamples` | `SanctumScene` performance HUD | Rolling FPS, frame, sim, layout, buffer, and render budget checks. |
| `window.__daoPerfHealth` | `SanctumScene` performance HUD | Current aggregate health and reason. |
| `window.__daoRendererDiagnostics` | `SanctumThreeLayer` | Three.js create/dispose counts, active renderer count, memory counters, and lifecycle events. |
| `data-explanation` on `explanation-record` | `LiveExplainabilityPanel` | Replayable explanation id, confidence, metric deltas, and candidate causes. |

## Performance Signals

The on-screen HUD reports both immediate and rolling values:

| Metric | Meaning | Target |
| --- | --- | --- |
| FPS / Avg | Browser frame cadence and rolling average. | 45+ fps during active ticks, 60 fps when idle. |
| 3D FPS | Three.js render cadence. | Tracks page FPS unless demand rendering is idle. |
| Sim ms | Worker simulation step cost. | Below 32ms. |
| Layout | Visual layout worker cost. | Below 12ms. |
| GPU buf | Instance buffer update cost. | Below 8ms. |
| Render | WebGL render pass cost. | Below 8ms. |
| Health | Rolling status from shared renderer stats. | `good` for normal operation. |

## Interaction Rules

- UI overlays live outside the zoomed render wrapper so controls stay crisp and clickable.
- Pointer handlers ignore `data-ui-interactive` controls so simulation panning cannot block UI clicks.
- Focus mode hides nonessential overlays while keeping inspection, zoom, renderer controls, and the performance HUD available.
- Scenario presets can be saved locally or exchanged as JSON files for repeatable testing.

## Current Grade Criteria

The renderer earns an A when:

- Simulation, layout, and rendering timings are visible, typed through `lib/browser/renderer-stats.ts`, and covered by `npm.cmd run test:e2e:report-card`.
- WebGL is the default renderer, Canvas 2D fallback remains available from the HUD, and renderer lifecycle diagnostics stay bounded across fallback switching and reset.
- UI interaction is independent of simulation ticking and scenario import/export has visible validation states.
- Visual noise can be reduced without losing core controls, with screenshot artifacts for default, focus, and zoomed states.
- Scenario state and explanation records can be imported, exported, or replayed for reproducible report-card runs.
