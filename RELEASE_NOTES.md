# Release Notes

## 2025-10-20

### 20 Interactive Simulator Features

Added 20 new features to the 3D interactive simulator, bringing the total to 32 interactive features.

**Visual Effects**
- Delegation beams — purple pulsing lines connecting delegating agents to their delegates in 3D space
- Proposal lifecycle particles — cyan/green/red InstancedMesh bursts on proposal creation, approval, and rejection
- Treasury pulse — vault floor glows cyan (deposit) or red (withdrawal) on large fund changes with breathing animation
- Black swan weather system — storm clouds, jagged lightning bolts, and rain particles during crisis events
- Agent trails — fading line segments behind moving agents showing recent movement history

**Analytics & Data**
- Export session — download simulation data as CSV, JSON, or filtered event log via Blob URLs
- Timeline annotations — double-click the time scrubber to place diamond markers with notes at specific steps
- Metric alerts — set threshold alerts (treasury < X, gini > Y) with toast notifications when triggered
- Trend overlays — linear regression (dashed) and moving average (dotted) lines on metric sparklines
- Voting heatmap — canvas-based agent type voting correlation matrix with hover tooltips

**Simulation Depth**
- Live parameter injection — change governance rule, forum, or black swan settings mid-run without reset
- Agent inspector — detailed drill-down panel with token history sparkline, stats grid, and vote record
- What-if branching — fork simulation state from any paused step, run divergent configs, compare metric divergence
- Multi-run statistics — run 3/5/10 parallel workers with different seeds, compute mean/std/95% CI
- Custom agent injection — add agents with configurable type, tokens, optimism, and opposition bias

**UX & Polish**
- Keyboard shortcuts — Space (play/pause), R (reset), arrow/. (step), 1-6 (floor nav), Esc, L (go live), ? (help)
- Guided tutorial — 7-step spotlight overlay with clip-path cutouts for first-time users
- Mobile layout — responsive bottom sheet sidebar on screens < 768px with drag handle
- Permalink sharing — URL-encoded config params (?dao=aave&gov=quadratic&seed=42) with clipboard copy
- Theme toggle — light/dark theme for simulator UI with CSS custom property overrides

**Infrastructure**
- Per-agent token history ring buffer (20 entries) in Web Worker for inspector sparklines
- Worker protocol additions: `injectConfig`, `injectAgent`, `forkState` message types
- Zustand store extensions: annotations, alerts, theme, renderer type, branch/multi-run state
- New stores: `branch-store.ts`, `multi-run-store.ts`, `tutorial-store.ts`

## 2025-10-18

### Stabilized Simulation Streams
- Normalize member payloads (`id` + `unique_id`) and remove randomized reputation fallbacks so analytics widgets render deterministically.
- Forward `market_shock` events from the engine’s event bus to Socket.IO clients and broadcast simulation status (running / stopped / reset) for the new dashboard controls.
- Keep a rolling collector `history` so CSV/JSON exports always contain data, even when Redis persistence is disabled.

### Dashboard Enhancements
- Added a control deck (start/stop/step/reset + speed selector) that talks to the Socket.IO server.
- Display connection + running indicators, synchronize the step counter via status events, and show accurate counts for open proposals inside the DAO report.

### Testing & Tooling
- Introduced Vitest with coverage (`npm run test`) targeting the data collector and in-memory simulation store.
- Updated Playwright config to reuse the dev server on port 7884, preventing hangs caused by mismatched ports.
- ESLint now ignores coverage artifacts, enabling clean `npm run lint` runs even after generating reports.

### Examples & Documentation
- Created `examples/run-scenarios.ts` plus a new `npm run examples` script, consolidating the individual demos behind a single CLI entry point.
- Added `docs/EXAMPLES.md` and refreshed the root README with accurate ports, scripts, and testing instructions.
- Logged these changes here for future releases.
