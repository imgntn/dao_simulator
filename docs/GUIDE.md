# DAO Simulator Guide

This document provides an accessible introduction to the DAO simulation project. It covers the overall idea behind the simulator, its main features, and instructions for installation and usage. A short FAQ is included at the end.

## Overview

The project models the behaviour of a Decentralized Autonomous Organization (DAO). It uses a collection of agent classes to represent different participant roles such as developers, investors, arbitrators and more. Agents can create and vote on proposals, delegate support and contribute to projects. The simulation tracks token values through a treasury, handles disputes and records events for later analysis.

## Key Features

- **Extensible agent system** – developers, investors, regulators and many other roles are implemented as separate classes.
- **Pluggable voting strategies** – choose from built‑in strategies or load custom modules via the command line.
- **Treasury with price oracles** – token values can follow simple random walks or more complex market models.
- **CLI and scripting API** – run the simulation from the command line or import `DAOSimulation` in a Python script.
- **Optional dashboards and visualizations** – an admin panel and Mesa visualization can be launched when the related packages are installed.
- **Plugin hooks** – extend the simulator with external agent types, metrics and oracles.
- **Liquidity pools and staking** – experiment with token swaps and interest
  on locked funds.
- **Market shock events** – simulate abrupt token price changes to test
  strategies under stress.

## Installation

1. Clone the repository and switch into the project directory.
2. Install the required Python packages:

   ```bash
   pip install -r requirements.txt
   ```

   Several features rely on optional packages. They are marked in `requirements.txt` and may be skipped if you only need the core simulation.

## Getting Started

Run the default simulation by executing:

```bash
python main.py
```

To adjust agent counts or simulation length, edit `settings.py` or provide overrides with the command line interface:

```bash
python -m cli --steps 50 --num_developers 2
```

You can export statistics directly from the CLI using `--export-csv` or `--export-html`. Interactive network graphs can be generated in a Python session:

```python
from dao_simulation import DAOSimulation
from visualizations.network_graph import plot_network_graph
sim = DAOSimulation(num_steps=0)
plot_network_graph(sim.dao)
```

### Optional Tools

- **Admin Panel** – `python admin_app.py` starts a small interface for configuring simulation parameters.
- **Mesa Visualization** – `python mesa_app.py` launches an interactive view of agents as the simulation runs.
- **Dashboard Server** – run `python main.py --websocket-port 8000` to stream events to a simple web dashboard.

These components depend on optional packages listed in `requirements.txt`.

## Running Tests

Execute the unit tests with:

```bash
python -m unittest discover tests
```

## FAQ

**Which Python versions are supported?**

The simulator is regularly tested on Python 3.10 and should work on other modern 3.x versions.

**Where can I change simulation settings?**

Most options live in `settings.py`. You can also load a JSON or YAML file with the `--config` flag in `cli.py`.

**How do I add new agent types?**

Custom agents can be loaded with `--agent-plugin-path`. Implement your class and register it in a Python module.

**Can the simulation run faster or in parallel?**

Use the `--use-parallel` or `--use-async` flags when invoking the CLI to experiment with alternative schedulers.

**How do I visualize delegations?**

Use `plot_network_graph` from `visualizations/network_graph.py` to draw a graph of members and their delegation links.

For more details on internal modules, see the existing documentation files in the repository.

