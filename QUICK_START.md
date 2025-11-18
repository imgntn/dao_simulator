# Quick Start Guide

## Running the DAO Simulator

The DAO Simulator consists of two parts:
1. **Next.js Dashboard** - Web interface (port 7884)
2. **WebSocket Server** - Real-time simulation engine (port 8003)

### Option 1: Run Both Services (Recommended)

Open **two terminal windows**:

**Terminal 1 - Next.js Dashboard:**
```bash
npm run dev
```
This starts the dashboard at http://localhost:7884

**Terminal 2 - WebSocket Server:**
```bash
npm run server              # starts the WebSocket server only
# Optional: AUTO_START_SIMULATION=true npm run server  # auto-start the sim loop
```
By default the server waits for a start command (from the dashboard controls or a Socket.IO client). Use the `AUTO_START_SIMULATION` flag or `--auto-start` CLI flag if you want it running immediately in local dev. The server listens on http://localhost:8003. When Redis is configured (`USE_REDIS=true`), the server will rehydrate the last saved run on startup (`SOCKET_SIM_ID`, default `socket_sim`).

### Option 2: Use the Dashboard Without WebSocket

If you just want to explore the UI without real-time updates:
```bash
npm run dev
```
Visit http://localhost:7884

The dashboard will show "Disconnected" but you can still explore the interface.

## What Changed

### Port Changes
- **Dashboard**: Changed from port 3000 to **7884** (more unique)
- **WebSocket Server**: Runs on port **8003** (matches dashboard expectation)

### UI Changes
- Removed technologies list from front page
- Moved API docs link to dashboard header (for logged-in users)
- Cleaner landing page

### New Files
- `server.ts` - WebSocket server for real-time simulation updates
- `QUICK_START.md` - This file

## Troubleshooting

### "Disconnected" status on dashboard
- Make sure the WebSocket server is running: `npm run server`
- Check that port 8003 is not blocked by firewall
- Verify the server is running: look for "WebSocket server running on port 8003"

### Simulation not starting
- The server now waits for a start command; click **Start** in the dashboard or run with `AUTO_START_SIMULATION=true npm run server`
- You should see updates every 0.5 seconds (2 steps per second) once running
- Check the terminal running `npm run server` for error messages

### Port already in use
- Dashboard (7884): Change port in `package.json` scripts
- WebSocket (8003): Run with custom port: `npx tsx server.ts --port 8004`

## API Endpoints

The REST API is still available at http://localhost:7884/api/simulation

See the API docs link in the dashboard header for details.

## Architecture

```
Browser (Dashboard)
    |-- HTTP --> Next.js (port 7884)
    |            \__ REST API
    |
    \-- WebSocket --> server.ts (port 8003) --> DAO Simulation Engine
```

## Next Steps

1. Start both servers (dashboard + websocket)
2. Visit http://localhost:7884
3. Click "Launch Dashboard"
4. Start the simulation (dashboard controls or `AUTO_START_SIMULATION=true npm run server`)

The simulation will:
- Create agents (developers, investors, validators, etc.)
- Generate proposals
- Process votes
- Update token prices
- Broadcast updates to the dashboard

## Example Suite

Run any of the TypeScript demos with:

```bash
npm run examples -- --scenario=basic
npm run examples -- --scenario=market-shock
npm run examples -- --scenario=governance
npm run examples -- --scenario=all   # sequentially
```

See `docs/EXAMPLES.md` for details on what each scenario prints and how to author new ones.
