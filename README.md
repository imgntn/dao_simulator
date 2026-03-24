# DAO Simulator

Modern TypeScript/Next.js environment for experimenting with decentralized governance. The repository contains a headless simulation engine, a 3D interactive browser simulator, REST API, a research experiment framework, and historical calibration against 14 real-world DAOs.

## Quick Start

```bash
npm install
npm run dev        # Next.js app on http://localhost:7884
```

Requires Node.js 22+ (Next.js 16).

Open [http://localhost:7884/simulate](http://localhost:7884/simulate) to launch the 3D interactive simulator. The simulation engine runs in a Web Worker off the main thread — use play/pause/step/reset to drive it in real-time with the skyscraper DAO visualization.

## Highlights

- **Full DAO sandbox** — 27 agent archetypes, 15 governance plugins, liquidity pools, NFTs, violations/disputes, proposal lifecycle, and stochastic market shocks.
- **3D interactive simulator** — WebGL skyscraper visualization with 32 interactive features including delegation beams, proposal particles, treasury pulse, black swan weather, agent trails, voting heatmap, and more.
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
- LLM agents decrease governance quality: all-LLM mode drops pass rates 7-9 points below baseline
- Conviction voting universally fails under calibrated DAO conditions (0% pass rate for all 14 DAOs)

See `paper/` for the LaTeX source and `experiments/paper/` for all experiment configurations. Generated PDFs are uploaded to R2 (see `ARCHIVES.md`).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js app (Turbopack) on port **7884** |
| `npm run test` | Vitest unit suite with coverage (784 tests) |
| `npm run test:e2e` | Playwright e2e suite — 138 tests across 10 projects (smoke, dashboard, simulation, controls, visualizations, API, accessibility, responsive, homepage) |
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

- **Unit tests**: `npm run test` — 784 Vitest tests covering simulation engine, data collector, agents, learning, calibration, voting mechanisms, and LLM integration. V8 coverage enabled.
- **E2E tests**: `npm run test:e2e` — 138 Playwright tests across 10 projects: smoke (page load), dashboard (UI layout/tabs/panels), simulation (behavior/keyboard shortcuts/DAO switching), simulate (play/pause/step/reset/metrics/charts), visualizations (3D canvas/WebGL/charts/delegation graph/theme), API (REST endpoints), accessibility (a11y compliance), responsive (mobile/tablet/orientation/touch), and homepage tests. Reuses the dev server on port 7884.
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
  |- analytics/     GDPR-friendly local analytics (Postgres store, events)
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
- Set `DATABASE_URL` for PostgreSQL analytics (optional — analytics is a no-op without it).
- The simulation engine runs entirely client-side in a Web Worker — no separate server process is needed.
- See `DEPLOYMENT.md` for Railway/Vercel/docker instructions plus the security checklist.

## Development

This project is actively developed in collaboration with **Claude** (Anthropic) as the primary AI coding assistant. Claude Code is used for architecture decisions, implementation, debugging, and running research experiments.

## Release Notes

See [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) for the latest feature, testing, and documentation changes.
