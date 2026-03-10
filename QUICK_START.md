# Quick Start Guide

## Running the DAO Simulator

The DAO Simulator is a single Next.js application. The simulation engine runs entirely in the browser via a Web Worker — no separate server process is needed.

### Start the App

```bash
npm install
npm run dev
```

Visit http://localhost:7884

> Requires Node.js 22+ (Next.js 16).

### Launch the 3D Simulator

1. Visit http://localhost:7884
2. Click **"Launch Simulator"** (or go directly to http://localhost:7884/simulate)
3. Use the transport controls: **Play / Pause / Step / Reset**
4. Select a DAO preset (14 real-world DAOs) and governance rule
5. Watch agents vote, propose, and trade in the 3D skyscraper visualization

The simulation runs in a Web Worker off the main thread — the 3D visualization stays responsive while the engine processes steps in the background.

## What You'll See

- **3D Skyscraper** — agents organized by type across floors, with delegation beams, proposal particles, treasury pulse, and black swan weather effects
- **Metrics Dashboard** — real-time treasury, token price, members, proposals, Gini coefficient, and participation rate
- **Charts** — sparklines with trend overlays, agent type distribution, proposal outcomes
- **Event Feed** — live stream of proposals created, votes cast, and outcomes
- **Controls** — speed slider, DAO preset selector, governance rule dropdown, forum/black swan toggles

## Configuration

| Setting | Description |
|---------|-------------|
| DAO Preset | Choose from 14 calibrated DAOs (Aave, Uniswap, Compound, etc.) |
| Governance Rule | Simple Majority, Quadratic Voting, Conviction, and more |
| Forum | Toggle forum simulation for sentiment effects |
| Black Swans | Enable stochastic crisis events |
| Speed | 1-60 steps/sec |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` or `.` | Step forward |
| `R` | Reset |
| `1-6` | Navigate to floor |
| `?` | Toggle help overlay |
| `Esc` | Clear time-travel |

## Example Scenarios

Run headless simulations from the command line:

```bash
npm run examples -- --scenario=basic
npm run examples -- --scenario=market-shock
npm run examples -- --scenario=governance
npm run examples -- --scenario=all
```

See `docs/EXAMPLES.md` for details on each scenario.

## Research Experiments

Run reproducible governance experiments:

```bash
npm run experiment -- experiments/paper/00-academic-baseline.yaml --runs 100
npm run experiment -- experiments/paper/04-governance-capture-mitigations.yaml --runs 100 -c 4
```

See `experiments/paper/` for all 12 experiment configurations.

## Testing

```bash
npm run test         # 784 Vitest unit tests
npm run test:e2e     # 138 Playwright e2e tests (10 projects)
npm run lint         # ESLint
```

## API Endpoints

The REST API is available at http://localhost:7884/api/simulation

```bash
# List simulations
curl http://localhost:7884/api/simulation

# Create simulation (requires API key)
curl -X POST http://localhost:7884/api/simulation \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"num_developers": 10, "num_investors": 5}'
```

## Architecture

```
Browser
    |-- HTTP --> Next.js (port 7884)
    |            \__ REST API (/api/simulation)
    |            \__ App pages (/, /simulate)
    |
    \-- Web Worker --> Simulation Engine (client-side, off main thread)
```

## Troubleshooting

### Simulation not starting
- Make sure the dev server is running: `npm run dev`
- Check that http://localhost:7884 loads
- Open browser console for error messages

### Port already in use
- Change port in `package.json` scripts or use: `PORT=7885 npm run dev`

### 3D scene not rendering
- Ensure your browser supports WebGL (all modern browsers do)
- Check browser console for WebGL context errors
- Try a hard refresh (Ctrl+Shift+R)

## Next Steps

1. Explore the 3D simulator at `/simulate`
2. Try different DAO presets and governance rules
3. Run research experiments from the CLI
4. Check `paper/` for the full research paper
5. See `DEPLOYMENT.md` for production deployment
