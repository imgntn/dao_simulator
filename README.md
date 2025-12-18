# DAO Simulator

Modern TypeScript/Next.js environment for experimenting with decentralized governance. The repository contains a headless simulation engine, WebSocket broadcaster, interactive dashboard, REST API, and a suite of runnable examples that map one-to-one with the Python legacy model.

## Quick Start

```bash
npm install
npm run dev        # Next.js dashboard on http://localhost:7884
npm run server     # Socket.IO simulation stream on http://localhost:8003
```

Requires Node.js 22+ (Next.js 16).

For production, set `NEXT_PUBLIC_SOCKET_URL` on the dashboard service to your deployed socket server (Railway socket service URL/port).

Open [http://localhost:7884](http://localhost:7884) and launch the dashboard. Use the control deck (start/stop/step/reset plus speed selector) to drive the simulation in real-time; the UI syncs with the Socket.IO status events and now mirrors the CLI workflow.

## Highlights

- **Full DAO sandbox** - 20+ agent archetypes, governance plugins, liquidity pools, NFTs, violations/disputes, proposal lifecycle, and stochastic market shocks.
- **Data pipeline** - Deterministic schedulers, seeded RNG, IndexedDB/Redis persistence, CSV/JSON exports, and a telemetry collector that now keeps a rolling history for analytics/downloads.
- **Dashboard widgets** - 3D network (React Three Fiber), price history, heatmaps, choropleth, and a DAO report card that tracks open/approved proposal stats.
- **APIs & automations** - `/api/simulation` endpoints with auth middleware, Socket.IO command channel for dashboards, and an example runner for scripted experiments.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dashboard (Turbopack) on port **7884** |
| `npm run server` | Standalone Socket.IO simulation broadcaster on port **8003** (send start command from dashboard, or set `AUTO_START_SIMULATION=true` to auto-run) |
| `npm run test` | Vitest unit suite with coverage (data collector + in-memory store) |
| `npm run test:e2e` | Playwright UI/API smoke tests (Chromium) |
| `npm run lint` | ESLint (flat config) |
| `npm run examples -- --scenario=<name>` | Run a TypeScript example (`basic`, `market-shock`, `governance`, or `all`) via `tsx` |

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

## Architecture Overview

```
app/                Next.js (App Router) pages, including dashboard UI
components/         Visualization widgets (Recharts, R3F, UI primitives)
lib/                Simulation engine, agents, treasury, marketing, events
  |- engine/        Scheduler, simulation orchestration, collectors
  |- data-structures/ DAO, proposals, treasury, NFTs, etc.
  `- utils/         Auth, redis-store, event bus, random utilities
app/api/            REST endpoints (`/simulation`, `/simulation/data`, NextAuth)
server.ts           Standalone Socket.IO server (start/stop/step/reset commands)
examples/           Runnable scenario scripts + CLI runner
tests/              Vitest suites
legacy-python/      Archived Python implementation for reference
```

## Deployment Notes

- Set `NEXTAUTH_SECRET`, `API_KEY`, and `ADMIN_*` creds before deploying.
- Use `REDIS_URL` + `USE_REDIS=true` to persist simulations/checkpoints server-side; otherwise the system falls back to the in-memory store (suitable for local dev only).
- `AUTO_START_SIMULATION` controls whether the Socket.IO server starts the loop immediately; `REHYDRATE_ON_START` (default true) attempts to reload the last stored simulation (`SOCKET_SIM_ID`, default `socket_sim`) from Redis on boot so stepping can resume after restarts.
- See `DEPLOYMENT.md` for Railway/Vercel/docker instructions plus the security checklist.

## Release Notes

See [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) for the latest feature, testing, and documentation changes.
