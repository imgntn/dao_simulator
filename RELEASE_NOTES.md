# Release Notes

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
