# DAO Simulator

Modern TypeScript/Next.js environment for experimenting with decentralized governance. The repository contains a headless simulation engine, an interactive browser simulator, REST API, a research experiment framework, and historical calibration against 14 real-world DAOs.

## Quick Start

```bash
npm install
npm run dev        # Starts Next.js on port 7884 or the next free port
```

Windows PowerShell: use the command shim explicitly so PowerShell does not resolve `npm` to `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Requires Node.js 22+ (Next.js 16).

Open the URL printed by `npm run dev` and visit `/simulate` to launch the interactive Sanctum simulator. By default the app tries `http://127.0.0.1:7884` and automatically moves to the next free port if needed. The simulation engine runs in a Web Worker off the main thread; use play/pause/step/reset to drive it in real time while the Sanctum scene, metrics, heatmap, delegation graph, and event feed update.

## Highlights

- **Full DAO sandbox** — 27 agent archetypes, 15 governance plugins, liquidity pools, NFTs, violations/disputes, proposal lifecycle, and stochastic market shocks.
- **Interactive Sanctum simulator** — real-time governance hall visualization with clickable agents, vote banners, treasury/proposal overlays, black swan weather, timeline scrubber, voting heatmap, delegation graph, and more.
- **Research framework** — 21,800+ simulation runs across 17 experiments investigating participation dynamics, governance capture, proposal pipelines, treasury resilience, inter-DAO cooperation, LLM agent reasoning, counterfactual governance, black swan resilience, scale effects, and voting mechanisms.
- **Historical calibration** — Digital twin calibration against 14 real DAOs (Aave, Uniswap, Compound, MakerDAO, Lido, ENS, Gitcoin, Arbitrum, Optimism, Nouns, Curve, Balancer, dYdX, SushiSwap) with average accuracy scores of 0.85+.
- **Advanced voting** — Ranked choice (IRV), futarchy with LMSR prediction markets, liquid delegation with decay, plus 12 standard governance rules.
- **Multi-tier RL** — Tabular Q-learning, DQN with target networks, policy gradient (REINFORCE), hierarchical options framework, and federated shared learning.
- **LLM-powered agents** — Ollama-backed agents with prompt templates, response caching, agent memory, and hybrid/full LLM voting modes.
- **Data pipeline** — Deterministic schedulers, seeded RNG, CSV/JSON exports, and in-browser data export with annotations and alerts.
- **Local analytics** — GDPR-friendly aggregate counters (page views, events, referrers, devices) stored in self-hosted PostgreSQL. No cookies, no PII, no third-party services.
- **Academic paper** — 35-page research paper with comprehensive results, statistical analysis, and reproducibility documentation.

## Research Experiments

Run reproducible governance experiments with the research CLI:

```bash
npm run experiment -- experiments/paper/00-academic-baseline.yaml --runs 100
npm run experiment -- experiments/paper/04-governance-capture-mitigations.yaml --runs 100 -c 4
```

**Key findings from 21,869 simulation runs:**
- Quadratic voting threshold=250 reduces whale influence by 43% — the only effective anti-capture mechanism (vote caps and velocity penalties have zero effect)
- Scale is the #1 governance factor: 50→500 members cuts capture risk 18% and single entity control 60%
- Advanced voting mechanisms (IRV, futarchy, liquid democracy) produce null results vs simple majority rule
- LLM agents with thinking mode improve governance: Gemma 4 E4B all-LLM+thinking boosts pass rates +6.7pt above baseline (enriched DAO briefing prompts give LLMs information parity with rule-based agents)
- Conviction voting universally fails under calibrated DAO conditions (0% pass rate for all 14 DAOs)

See `paper/` for the LaTeX source and `experiments/paper/` for all experiment configurations. Generated PDFs are uploaded to R2 (see `ARCHIVES.md`).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js app (Turbopack), starting at **7884** and shifting to the next free port if needed |
| `npm run test` | Vitest unit suite with coverage (1071 tests) |
| `npm run typecheck` | TypeScript compile check without emit |
| `npm run verify` | Local CI-equivalent gate: lint, typecheck, unit tests, build, smoke/API E2E, and audit |
| `npm run test:e2e` | Playwright e2e suite - 138 tests in 9 files across 10 projects |
| `npm run lint` | ESLint (flat config) |
| `npm run validate:env` | Validate required production runtime secrets when `NODE_ENV=production` |
| `npm run examples -- --scenario=<name>` | Run a TypeScript example (`basic`, `market-shock`, `governance`, or `all`) via `tsx` |
| `npm run experiment -- <config.yaml>` | Run research experiment with specified configuration |

Windows PowerShell note: run these as `npm.cmd run ...` to avoid invoking or opening `npm.ps1`.

## Example Scenarios

The new `examples/run-scenarios.ts` driver exposes all demo simulations behind a single command:

```bash
npm run examples                 # defaults to --scenario=basic
npm run examples -- --scenario=market-shock
npm run examples -- --scenario=all
```

See `docs/EXAMPLES.md` for full details on each scenario, output expectations, and how to extend the catalog.

## Testing & Quality

- **Unit tests**: `npm run test` — 1071 Vitest tests covering simulation engine, data collector, agents, learning, neural-network/DQN/policy-gradient/hierarchical-RL/opponent-model/shared-learning/reward-aggregation utilities, statistics/logger utilities, prediction-market/timelock invariants, treasury accounting invariants, proposal and multi-stage proposal lifecycle invariants, calibration, voting mechanisms, LLM integration, auth, validation, analytics, event utilities, proxy security, readiness checks, environment validation, path safety, API hardening, browser-facing simulation state, vote escrow, payment streams, vesting schedules, SBT gates, inter-DAO proposals, and sub-DAOs. V8 coverage enabled.
- **Typecheck**: `npm run typecheck` — runs `tsc --noEmit`.
- **E2E tests**: `npm run test:e2e` - 138 Playwright tests in 9 files across 10 projects: smoke, dashboard, simulation, simulate, visualizations, API, accessibility, chromium homepage, mobile, and tablet. The CI-equivalent `npm run verify` gate runs the smoke and API projects; the broader suite is available by project and runs in the scheduled/manual Full E2E GitHub workflow. Reuses a healthy server when one is already running, otherwise launches its own server on the next free port.
- **Linting**: `npm run lint` (ESLint + Next core web vitals). Coverage artifacts are ignored to keep the tree clean.

## Interactive Sanctum Simulator

The `/simulate` page features the Sanctum, a real-time interactive governance hall driven by the browser simulation worker:

**Visual Effects** — Three.js/WebGL instanced agents by default, Canvas 2D fallback, worker-computed culling/LOD, demand-rendered GPU buffers, pooled delegation/storm lines, GPU vote markers, ceremony walks, treasury pool state, proposal lectern, black swan effects, a visual state legend, and a stable in-scene fire log.

**Analytics** — CSV/JSON/events export, timeline annotations (double-click to add), metric threshold alerts with toast notifications, linear regression + moving average trend overlays, agent type voting correlation heatmap, live cause-chain explainability, and a performance HUD that separates page FPS, Three render FPS, sim step time, visual layout time, GPU buffer update time, WebGL render time, draw calls, triangles, and culling.

**Simulation Depth** — editable scenario presets, population/quorum/shock authoring, local saved scenarios, live parameter injection (change governance mid-run), agent inspector drill-down with token history sparkline, what-if branching from fork points, multi-run statistics with 95% confidence intervals (3/5/10 parallel workers), custom agent injection with configurable parameters.

**UX** — precise hover/click agent selection, deeper zoom, follow mode, keyboard agent stepping, keyboard shortcuts (Space=play/pause, R=reset, 1-5=hall nav, ?=help), guided tutorial, mobile-responsive compact layout, permalink URL sharing, light/dark theme toggle, split-screen comparison mode.

## Architecture Overview

```
app/                Next.js (App Router) pages + API routes
  |- [locale]/simulate/  Interactive Sanctum simulator (SimulationPageClient)
components/
  |- simulation/    Sanctum scene, controls, panels, and charts
  |  |- sanctum/    Active interactive scene
  |  |- dashboard/  Metrics, charts, heatmap, delegation graph
  |  `- research/   Batch experiment UI
  `- visualizations/ Legacy dashboard widgets
archive/
  `- legacy-skyscraper-visualization/  Archived Three.js/WebGL renderer
lib/
  |- engine/        Simulation orchestration, data collector
  |- agents/        27 agent types + learning infrastructure
  |  `- learning/   RL tiers 1-3 (Q-learning, DQN, policy gradient, hierarchical)
  |- browser/       Web Worker simulation, Zustand stores, protocols
  |- data-structures/ DAO, proposals, treasury, NFTs, etc.
  |- analytics/     GDPR-friendly local analytics (Postgres store, events)
  |- digital-twins/ Calibration loader, governance mapping
  |- research/      Experiment runner, backtest runner, counterfactual runner
  |- llm/           Ollama client, prompt templates, response cache, agent memory
  `- utils/         Governance plugins, voting strategies, event bus, RNG
experiments/paper/  12 YAML experiment configs for reproducible research
tests/              1071 Vitest unit tests
python/             Calibration data ingestion scripts
```

## Deployment Notes

- Set strong `NEXTAUTH_SECRET`, `API_KEY`, and `ADMIN_*` credentials before deploying. `npm run validate:env` enforces minimum production secret requirements.
- Use `REDIS_URL` + `USE_REDIS=true` to persist simulations/checkpoints server-side; otherwise the system falls back to the in-memory store (suitable for local dev only).
- Redis-backed API rate limits are enabled automatically when `REDIS_URL` is set; set `USE_REDIS_RATE_LIMITS=false` only for single-instance debugging.
- Set `DATABASE_URL` for PostgreSQL analytics (optional — analytics is a no-op without it).
- Use `/api/healthz` for readiness checks; it validates runtime configuration and checks Redis/PostgreSQL when those dependencies are configured.
- For local production parity, set strong secrets in your shell and run `docker compose up --build` to start the app with Redis and PostgreSQL.
- The simulation engine runs entirely client-side in a Web Worker — no separate server process is needed.
- See `DEPLOYMENT.md` for Railway/Vercel/docker instructions plus the security checklist.

## Development

This project is actively developed in collaboration with **Claude** (Anthropic) as the primary AI coding assistant. Claude Code is used for architecture decisions, implementation, debugging, and running research experiments.

## Release Notes

See [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) for the latest feature, testing, and documentation changes.
