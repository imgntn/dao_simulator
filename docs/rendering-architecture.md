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

- Simulation, layout, and rendering timings are visible and typed through `lib/browser/renderer-stats.ts`.
- WebGL is the default renderer, with Canvas 2D fallback available from the HUD.
- UI interaction is independent of simulation ticking.
- Visual noise can be reduced without losing core controls.
- Scenario state can be imported/exported for reproducible report-card runs.
