# DAO Simulator Dashboard

Real-time 3D visualization and analytics dashboard for decentralized governance simulations.

## Overview

The simulator runs at `/simulate` and provides a full 3D skyscraper DAO visualization with 32 interactive features. The simulation engine runs in a Web Worker off the main thread, communicating via structured clone postMessage.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:7884/simulate](http://localhost:7884/simulate) to launch the 3D interactive simulator.

## Architecture

### 3D Scene (`components/simulation/scene/`)

| Component | Purpose |
|-----------|---------|
| `Building.tsx` | Glass skyscraper with 6 labeled floors |
| `AgentGroups.tsx` | InstancedMesh rendering of all agents per floor |
| `DelegationBeams.tsx` | Purple pulsing lines between delegates |
| `ProposalParticles.tsx` | Lifecycle particle bursts (create/approve/reject) |
| `AgentTrails.tsx` | Fading movement trails behind agents |
| `TreasuryIndicator.tsx` | Vault with pulse glow on fund changes |
| `BlackSwanEffect.tsx` | Storm clouds, lightning, rain during crises |
| `FloorLabel.tsx` | Agent count badges on each floor |
| `constants.ts` | Building dimensions, floor configs, agent-floor mapping |

### Dashboard (`components/simulation/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `MetricsDashboard.tsx` | Metric cards with sparklines, trend overlays |
| `EventFeed.tsx` | Real-time event log overlay |
| `DelegationGraph.tsx` | SVG delegation relationship graph |
| `VotingHeatmap.tsx` | Canvas agent type voting correlation matrix |

### Controls & UX (`components/simulation/`)

| Component | Purpose |
|-----------|---------|
| `ControlPanel.tsx` | Transport (play/pause/step/reset), speed, DAO selector, governance |
| `FloorNav.tsx` | Click-to-zoom floor navigation |
| `AgentGuide.tsx` | Expandable guide to all 27 agent types |
| `CustomAgentForm.tsx` | Inject custom agents mid-simulation |
| `ScenarioBuilder.tsx` | Schedule black swan events at specific steps |
| `MetricAlerts.tsx` | Set threshold alerts with toast notifications |
| `AgentInspector.tsx` | Detailed agent drill-down with token history |
| `Annotations.tsx` | Timeline annotations with diamond markers |
| `ExportButton.tsx` | CSV/JSON/Events data export |
| `ShareButton.tsx` | Permalink URL sharing |
| `ThemeToggle.tsx` | Light/dark theme toggle |
| `HelpOverlay.tsx` | Help dialog with keyboard shortcuts |
| `Tutorial.tsx` | 7-step guided tutorial with spotlights |
| `TabBar.tsx` | Tab navigation (Interactive, Compare, Branch, Multi-Run, Research) |
| `ComparisonView.tsx` | Side-by-side dual-config comparison |
| `BranchView.tsx` | What-if divergence analysis from fork points |
| `MultiRunPanel.tsx` | Parallel N-run statistics with confidence intervals |

### State Management (`lib/browser/`)

| Module | Purpose |
|--------|---------|
| `simulation-store.ts` | Zustand store — config, status, history, annotations, alerts, theme |
| `simulation-worker.ts` | Web Worker entry point running DAOSimulation engine |
| `worker-protocol.ts` | Typed message protocol (init, step, inject, fork, dispose) |
| `snapshot-extractor.ts` | Builds serializable DTOs from simulation state |
| `branch-store.ts` | What-if branching state (fork, run, compare) |
| `multi-run-store.ts` | Parallel worker management with stats computation |
| `tutorial-store.ts` | Tutorial step progression with localStorage persistence |
| `useKeyboardShortcuts.ts` | Keyboard shortcut bindings |
| `useActiveSnapshot.ts` | Snapshot selector with time-travel support |

## Technology Stack

- **Next.js 16** — React framework with App Router
- **React Three Fiber** — React renderer for Three.js
- **Three.js** — 3D WebGL rendering
- **Zustand** — Lightweight state management
- **Web Workers** — Off-main-thread simulation engine
- **TypeScript** — Type-safe development
- **Tailwind CSS 4** — Utility-first styling

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` or `.` | Step forward |
| `R` | Reset simulation |
| `1`-`6` | Navigate to floor |
| `Esc` | Close overlays, deselect |
| `L` | Go to live (exit time-travel) |
| `?` | Toggle help overlay |

## Worker Protocol

The main thread communicates with the simulation Web Worker via typed messages:

**Inbound (to worker):** `init`, `start`, `pause`, `resume`, `step`, `setSpeed`, `updateConfig`, `reset`, `injectConfig`, `injectAgent`, `forkState`, `dispose`

**Outbound (from worker):** `ready`, `initialized`, `stepComplete`, `forkedState`, `disposed`, `error`

## Themes

The simulator supports light and dark themes via CSS custom properties (`--sim-*`). Toggle with the sun/moon button in the tab bar. Theme persists to localStorage.
