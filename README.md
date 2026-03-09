# DAO Simulator

Modern TypeScript/Next.js environment for experimenting with decentralized governance. The repository contains a headless simulation engine, a 3D interactive browser simulator, WebSocket broadcaster, REST API, a research experiment framework, and historical calibration against 14 real-world DAOs.

## Quick Start

```bash
npm install
npm run dev        # Next.js app on http://localhost:7884
npm run server     # Socket.IO simulation stream on http://localhost:8003
```

Requires Node.js 22+ (Next.js 16).

Open [http://localhost:7884/simulate](http://localhost:7884/simulate) to launch the 3D interactive simulator. Use play/pause/step/reset to drive the simulation in real-time with the skyscraper DAO visualization.

## Highlights

- **Full DAO sandbox** — 27 agent archetypes, 15 governance plugins, liquidity pools, NFTs, violations/disputes, proposal lifecycle, and stochastic market shocks.
- **3D interactive simulator** — WebGL skyscraper visualization with 32 interactive features including delegation beams, proposal particles, treasury pulse, black swan weather, agent trails, voting heatmap, and more.
- **Research framework** — 8,700+ simulation runs across 12 experiments investigating participation dynamics, governance capture, proposal pipelines, treasury resilience, inter-DAO cooperation, and LLM agent reasoning.
- **Historical calibration** — Digital twin calibration against 14 real DAOs (Aave, Uniswap, Compound, MakerDAO, Lido, ENS, Gitcoin, Arbitrum, Optimism, Nouns, Curve, Balancer, dYdX, SushiSwap) with average accuracy scores of 0.85+.
- **Advanced voting** — Ranked choice (IRV), futarchy with LMSR prediction markets, liquid delegation with decay, plus 12 standard governance rules.
- **Multi-tier RL** — Tabular Q-learning, DQN with target networks, policy gradient (REINFORCE), hierarchical options framework, and federated shared learning.
- **LLM-powered agents** — Ollama-backed agents with prompt templates, response caching, agent memory, and hybrid/full LLM voting modes.
- **Data pipeline** — Deterministic schedulers, seeded RNG, CSV/JSON exports, and in-browser data export with annotations and alerts.
- **Academic paper** — 35-page research paper with comprehensive results, statistical analysis, and reproducibility documentation.

## Research Experiments

Run reproducible governance experiments with the research CLI:

```bash
npm run experiment -- experiments/paper/00-academic-baseline.yaml --runs 100
npm run experiment -- experiments/paper/04-governance-capture-mitigations.yaml --runs 100 -c 4
```

**Key findings from 8,701 simulation runs:**
- Vote power caps (10-20%) reduce whale influence by 40% while improving governance throughput
- Temp-check stages are critical for proposal pipeline health
- Larger DAOs (N>200) achieve higher pass rates but face declining participation
- Inter-DAO proposals face 22% success rate vs 73% for intra-DAO proposals

See `paper/` for the full research paper and `experiments/paper/` for all experiment configurations.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dashboard (Turbopack) on port **7884** |
| `npm run server` | Standalone Socket.IO simulation broadcaster on port **8003** (send start command from dashboard, or set `AUTO_START_SIMULATION=true` to auto-run) |
| `npm run test` | Vitest unit suite with coverage (data collector + in-memory store) |
| `npm run test:e2e` | Playwright UI/API smoke tests (Chromium) |
| `npm run lint` | ESLint (flat config) |
| `npm run examples -- --scenario=<name>` | Run a TypeScript example (`basic`, `market-shock`, `governance`, or `all`) via `tsx` |
| `npm run experiment -- <config.yaml>` | Run research experiment with specified configuration |

## Example Scenarios

The new `examples/run-scenarios.ts` driver exposes all demo simulations behind a single command:

```bash
npm run examples                 # defaults to --scenario=basic
npm run examples -- --scenario=market-shock
npm run examples -- --scenario=all
```

See `docs/EXAMPLES.md` for full details on each scenario, output expectations, and how to extend the catalog.

## Testing & Quality

- **Unit tests**: `npm run test` exercises the data collector's rolling history plus the in-memory simulation store; Vitest runs in Node with coverage via V8.
- **E2E tests**: `npm run test:e2e` spins up the dashboard, ensures the landing page renders, basic a11y guarantees, and that the REST API responds deterministically. The Playwright server now reuses the dev server on port 7884 to avoid port mismatches.
- **Linting**: `npm run lint` (ESLint + Next core web vitals). Coverage artifacts are ignored to keep the tree clean.

## 3D Interactive Simulator

The `/simulate` page features a full 3D skyscraper DAO visualization with 32 interactive features:

**Visual Effects** — Delegation beams (purple lines connecting delegates), proposal lifecycle particles (cyan/green/red bursts), treasury vault pulse on large fund changes, black swan weather system (storm clouds, lightning, rain), agent movement trails.

**Analytics** — CSV/JSON/events export, timeline annotations (double-click to add), metric threshold alerts with toast notifications, linear regression + moving average trend overlays, agent type voting correlation heatmap.

**Simulation Depth** — Live parameter injection (change governance mid-run), agent inspector drill-down with token history sparkline, what-if branching from fork points, multi-run statistics with 95% confidence intervals (3/5/10 parallel workers), custom agent injection with configurable parameters.

**UX** — Keyboard shortcuts (Space=play/pause, R=reset, 1-6=floor nav, ?=help), 7-step guided tutorial, mobile-responsive bottom sheet layout, permalink URL sharing, light/dark theme toggle, split-screen comparison mode.

## Architecture Overview

```
app/                Next.js (App Router) pages + API routes
  |- [locale]/simulate/  3D interactive simulator (SimulationPageClient)
components/
  |- simulation/    3D simulator UI (32 features)
  |  |- scene/      Three.js scene components (Building, AgentGroups, effects)
  |  |- dashboard/  Metrics, charts, heatmap, delegation graph
  |  `- research/   Batch experiment UI
  `- visualizations/ Legacy dashboard widgets
lib/
  |- engine/        Simulation orchestration, data collector
  |- agents/        27 agent types + learning infrastructure
  |  `- learning/   RL tiers 1-3 (Q-learning, DQN, policy gradient, hierarchical)
  |- browser/       Web Worker simulation, Zustand stores, protocols
  |- data-structures/ DAO, proposals, treasury, NFTs, etc.
  |- digital-twins/ Calibration loader, governance mapping
  |- research/      Experiment runner, backtest runner, counterfactual runner
  |- llm/           Ollama client, prompt templates, response cache, agent memory
  `- utils/         Governance plugins, voting strategies, event bus, RNG
experiments/paper/  12 YAML experiment configs for reproducible research
tests/              784 Vitest unit tests
python/             Calibration data ingestion scripts
```

## Deployment Notes

- Set `NEXTAUTH_SECRET`, `API_KEY`, and `ADMIN_*` creds before deploying.
- Use `REDIS_URL` + `USE_REDIS=true` to persist simulations/checkpoints server-side; otherwise the system falls back to the in-memory store (suitable for local dev only).
- `AUTO_START_SIMULATION` controls whether the Socket.IO server starts the loop immediately; `REHYDRATE_ON_START` (default true) attempts to reload the last stored simulation (`SOCKET_SIM_ID`, default `socket_sim`) from Redis on boot so stepping can resume after restarts.
- Set `SOCKET_ALLOWED_ORIGINS` (comma-separated) or `NEXTAUTH_URL` so the Socket.IO server only accepts browser connections from trusted origins.
- See `DEPLOYMENT.md` for Railway/Vercel/docker instructions plus the security checklist.

## Development

This project is actively developed in collaboration with **Claude** (Anthropic) as the primary AI coding assistant. Claude Code is used for architecture decisions, implementation, debugging, and running research experiments.

## Release Notes

See [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) for the latest feature, testing, and documentation changes.
