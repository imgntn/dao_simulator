# Release Notes

## 2026-03-10

### Local GDPR-Friendly Analytics

Added fully local, privacy-first analytics to the DAO Simulator. No cookies, no PII, no IP logging, no third-party analytics services. All data is aggregate daily counters stored in self-hosted PostgreSQL.

**New files:**
- `lib/analytics/events.ts` — 12 event name constants
- `lib/analytics/store.ts` — PostgreSQL-backed store with auto-table creation, upsert, stats query, and retention cleanup
- `app/api/analytics/route.ts` — POST (record event, 204) and GET (auth-protected stats)
- `components/analytics/AnalyticsProvider.tsx` — Client provider with pageview tracking, referrer extraction, device detection, and `useAnalytics()` hook

**Tracked events:**
- Page views (path, referrer domain, device category)
- Simulation started, reset
- DAO preset selected, governance rule changed
- CSV/JSON export

**Infrastructure:**
- `pg` (node-postgres) dependency added
- `DATABASE_URL` env var — analytics gracefully disabled when not set
- `AnalyticsProvider` wired into `app/[locale]/layout.tsx`
- Event tracking wired into `ControlPanel.tsx` and `ExportButton.tsx`

### Daily Analytics Email Report

Added daily email report via Zoho SMTP (Nodemailer). Summarizes page views, events, referrers, and devices over the last 7 days in a clean HTML table layout.

- `lib/analytics/report.ts` — builds HTML email, sends via Nodemailer/Zoho SMTP
- `app/api/analytics/report/route.ts` — auth-protected POST endpoint to trigger report
- Default recipients: `hello@daosimulator.com`, `james@jamesbpollack.com`, `hello@playablefuture.com`
- Env vars: `SMTP_USER`, `SMTP_PASS` (required), `SMTP_HOST`, `SMTP_PORT`, `REPORT_RECIPIENTS` (optional overrides)
- Trigger via cron: `curl -X POST https://your-domain/api/analytics/report -H "X-API-Key: ..."`

## 2025-10-21

### E2E Test Suite Rewrite (138 Tests)

Rewrote the entire Playwright e2e test suite to match the current 3D simulator UI architecture. Tests now target the Web Worker-based `/en/simulate` page instead of the defunct Socket.IO dashboard.

**10 Test Projects:**
- `smoke` — page load validation (homepage + simulate page)
- `dashboard` — simulator UI layout, tabs, panels, sidebar
- `simulation` — behavior, keyboard shortcuts, DAO switching, time-travel
- `simulate` — core controls (play/pause/step/reset), metrics, charts, event feed, proposal outcomes
- `visualizations` — 3D canvas, WebGL, renderer badge, charts, delegation graph, theme toggle
- `api` — REST API endpoints (GET/POST/deterministic seeding)
- `accessibility` — ARIA landmarks, heading hierarchy, color contrast, form labels, focus management
- `chromium` — homepage tests
- `mobile` — responsive layout (375px, 320px viewports)
- `tablet` — responsive layout (768px viewport)

**Key fixes:**
- Tutorial overlay bypass via `localStorage.setItem('sim-tutorial-complete', 'true')` in `addInitScript`
- Pause button strict-mode fix (`.last()` to disambiguate transport vs EventFeed Pause)
- Canvas lazy rendering — R3F `<Canvas>` only mounts after simulation produces snapshots
- Mobile step counter — not visible at 375px, uses timeout-based wait instead of step counting
- Recharts selector — `svg[role="application"]` instead of `.recharts-surface`
- Event feed selector — text-based matching instead of old CSS class selectors
- DelegationGraph conditional render — component returns null without snapshot data

**Files changed:** 10 e2e spec files, `playwright.config.ts`, `scripts/test-e2e.js`

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
