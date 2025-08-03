# DAO Simulator - Integrated Usage Guide

Your DAO simulator now works cohesively as a complete ecosystem! You can observe the simulation like an ant hill or SimCity with multiple viewing options.

## Quick Start - All-in-One Experience

**For the full immersive experience (like SimCity):**
```bash
py integrated_launcher.py --mode integrated --steps 100 --agents 40
```

This launches:
- Real-time terminal observer (step-by-step updates)
- Web dashboard with live charts and metrics  
- Admin control panel to adjust settings
- Mesa visualization with network graphs
- Automatic browser windows for all interfaces

## Simple Observer Mode (Like Watching an Ant Hill)

**For just terminal observation:**
```bash
py observe_simulation.py --steps 50 --realtime --delay 2
```

This gives you:
- Live step-by-step updates in the terminal
- Agent activity summaries
- Network influence tracking
- Token and reputation dynamics
- Real-time event monitoring

## Individual Components

**Just the web dashboard:**
```bash
py dashboard.py
```
Then visit http://localhost:8003

**Just the terminal observer:**
```bash
py observe_simulation.py --steps 30
```

**Original launcher menu:**
```bash
py launcher.py
```

## What You'll See

### Terminal Observer
- **Step Summaries**: Member counts, proposals, projects, token prices
- **Agent Activity**: What each type of agent is doing (developers, investors, etc.)
- **Network Insights**: Top token holders, reputation leaders, influence rankings
- **Real-time Events**: Proposals created, votes cast, projects funded

### Web Dashboard  
- Interactive charts and graphs
- Real-time metrics updates
- Agent relationship networks
- Treasury and token tracking
- Player controls (if enabled)

### Admin Panel
- Sliders to adjust agent behaviors
- Simulation parameter controls
- Real-time configuration changes

## Configuration Examples

**Small focused simulation:**
```bash
py observe_simulation.py --steps 25 --agents 15 --delay 1
```

**Large complex ecosystem:**
```bash
py integrated_launcher.py --mode integrated --steps 200 --agents 60
```

**Dashboard only (no terminal output):**
```bash
py integrated_launcher.py --mode dashboard
```

## Understanding the "Ant Hill" View

Just like watching an ant colony, you'll see:

1. **Individual Agent Behavior**: Different types of agents (developers, investors, validators) each have their own patterns
2. **Emergent Patterns**: Complex behaviors emerge from simple rules
3. **Resource Flow**: Watch tokens and reputation flow through the network
4. **Social Dynamics**: See how agents form relationships and influence each other
5. **Economic Evolution**: Treasury values, token prices, and wealth distribution change over time

## Key Metrics to Watch

- **Token Distribution**: How wealth spreads among members
- **Reputation Leaders**: Who gains influence over time  
- **Proposal Success**: Which types of proposals get funded
- **Network Effects**: How delegation and voting patterns evolve
- **Economic Health**: Token price stability and treasury growth

## Stopping the Simulation

- **Terminal mode**: Press `Ctrl+C`
- **Integrated mode**: Press `Ctrl+C` (stops all components)
- **Individual components**: Close browser windows or press `Ctrl+C` in terminal

## Tips for Best Experience

1. **Start small** with 20-30 agents to understand the dynamics
2. **Use real-time mode** (`--realtime`) for the full "ant hill" experience  
3. **Try different agent compositions** by adjusting the `--agents` parameter
4. **Keep browser windows open** in integrated mode for the full dashboard experience
5. **Watch for emergent behaviors** - the most interesting patterns develop over time

Your DAO simulator is now a complete, integrated ecosystem ready for exploration!