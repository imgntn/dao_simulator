# DAO Simulation

This DAO simulation is a modular and maintainable implementation of a Decentralized Autonomous Organization. The simulation models various agent classes that interact with each other and the DAO, allowing users to explore the behavior of different types of members within the organization.
For a more detailed introduction and FAQ, see [docs/GUIDE.md](docs/GUIDE.md).
Diagrams illustrating the architecture can be found in [docs/DIAGRAMS.md](docs/DIAGRAMS.md).


## Summary

The simulation models the behavior of a DAO, a decentralized organization managed by a smart contract or a set of rules. The DAO members, represented by various agent classes, can create proposals, vote on them, invest in projects, and perform other activities. The simulation also incorporates treasury management, token pricing, and revenue distribution to model the dynamics of a real-world DAO.

## Agent Classes

- `Arbitrator`: Resolves disputes and enforces the rules of the DAO.
- `DAO Member`: Base class for all DAO members, handling common properties and behaviors like voting, commenting, and holding tokens and reputation.
- `Delegator`: Delegates their support (tokens) to proposals.
- `Developer`: Contributes skills to build and maintain projects within the DAO.
- `External Partner`: Collaborates on projects or proposals from outside the DAO.
- `Investor`: Invests in projects and proposals within the DAO.
- `Passive Member`: Passively holds tokens and participates in the DAO without taking an active role.
- `Proposal Creator`: Creates and submits proposals to the DAO.
- `Regulator`: Ensures compliance with external regulations and requirements.
- `Service Provider`: Provides services to the DAO, such as marketing, legal, or financial services.
- `Validator`: Validates proposals and monitors projects.
- `QuadraticVotingStrategy`: Allows members to spend tokens for weighted votes
  where casting `n` votes costs `n^2` tokens.
- `ReputationWeightedStrategy`: Scales each vote's weight according to the
  member's reputation level.

## Data Structures

- `DAO`: Represents the Decentralized Autonomous Organization, managing members, proposals, projects, violations, and treasury.
 - `Dispute`: Represents a dispute between members or related to a project. Disputes
   now track their importance, related project or member, and whether they've been
   resolved.
 - `Project`: Represents a project within the DAO, including its funding, progress,
   associated members, and start time. Projects can receive work contributions via
   `receive_work`.
 - `Proposal`: Represents a proposal within the DAO, containing details about the
   proposal type, funding goal, current funding, and associated members. Proposals
   expose a `closed` property to indicate whether voting has finished.
- `Treasury`: Manages the DAO's treasury, holding its native token and tokens from other cryptocurrencies.
- `Violation`: Represents a violation of the DAO's rules or an external regulation.

## How the Simulation Works

The simulation runs in discrete time steps. During each step, the agents perform actions based on their roles and behaviors. These actions may include voting on proposals, creating new proposals, investing in projects, or leaving comments on proposals. The simulation models the interactions between agents and the DAO, allowing users to explore the dynamics and emergent behaviors of the organization.

The DAO maintains a treasury, which holds various tokens, including its native token. The simulation models the appreciation or depreciation of these tokens over time, as well as their use within the organization. The agents' actions can influence the price of the native token, and the DAO can distribute revenue to its members through various mechanisms, such as token buybacks, staking, or revenue sharing.

The simulation also includes utility functions and voting strategies that help streamline the code and make it more modular. This structure allows for easy customization and the addition of new agent classes or behaviors as needed.

## Getting Started

1. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

   The `pycountry` package is optional. When it isn't installed,
   `generate_random_location()` uses a small built-in list of
   country names (``["US", "FR", "ANONYMOUS"]``).

2. **Run the Simulation**

   ```bash
   python main.py
   ```

   This executes the batch run with default values from `settings.py`. Adjust the numbers of agents by editing that file or calling `update_settings()` in your own script.


   To log basic model statistics to a CSV file, construct the simulation with
   `export_csv=True` and specify a filename:

   ```python
   from dao_simulation import DAOSimulation
   sim = DAOSimulation(export_csv=True, csv_filename="stats.csv")
   sim.run(100)
   ```

3. **Optional: Launch the Admin Panel**

   ```bash
   python admin_app.py
   ```

   The panel exposes sliders for configuring agent counts and behaviour
   probabilities before starting the simulation.

4. **Optional: Launch the Mesa Visualization**

   ```bash
   python mesa_app.py
   ```

The visualization depends on the optional Mesa components listed in `requirements.txt`.

5. **Optional: Start the Dashboard Server**

   ```bash
   python main.py --websocket-port 8000
   ```

   This feature requires `fastapi` and `uvicorn`. They are listed as optional
   dependencies in `requirements.txt`.

6. **Optional: Start the Admin Server**

   ```bash
   python admin_server.py
   ```

   A lightweight web page for adjusting settings and stepping the simulation.
7. **Run the Tests**

   ```bash
   python -m unittest discover tests
   ```

8. **Visualize Delegations**

   ```python
   from visualizations.network_graph import plot_network_graph
   from dao_simulation import DAOSimulation
   sim = DAOSimulation(num_steps=0)
   plot_network_graph(sim.dao)
   ```

   The network graph shows dashed edges for delegation links.

## Configuration

Simulation parameters are stored in `settings.py`. Besides the number of agents,
you can tweak behaviour such as the probability that an arbitrator will detect a
violation and the reputation penalty applied:

```
settings = {
    ...,
    "violation_probability": 0.1,
    "reputation_penalty": 5,
    "comment_probability": 0.5,
    "external_partner_interact_probability": 0.0,
}
```

Call `update_settings()` or edit the file directly to experiment with different
values.  Settings can also be loaded from a JSON or YAML file using the new
`load_settings()` helper or the `--config` flag in `cli.py`.

## Price Oracles

Token prices are driven by a pluggable oracle system.  The default
`RandomWalkOracle` performs a simple random walk.  A more realistic
`GeometricBrownianOracle` is also included and can be selected when
constructing a `Treasury`:

```python
from data_structures.treasury import Treasury
from utils.oracles import GeometricBrownianOracle
treasury = Treasury(oracle=GeometricBrownianOracle(drift=0.01, volatility=0.2))
```

Custom oracles can be loaded from external modules using the
`--oracle-plugin-path` option.

## Command Line Interface

The `cli.py` module exposes a small interface for running the simulation without
modifying code.  For example, to run 50 steps with just two developers:

```bash
python -m cli --steps 50 --num_developers 2
```

Flags like `--use-parallel` or `--use-async` enable alternative schedulers. The
`--config` option loads settings from a JSON/YAML file. Any `num_*` setting from
`settings.py` can still be overridden on the command line.
`--strategy-path` and `--agent-plugin-path` allow loading custom voting
strategies and agent types from external Python modules. Use
`--event-db` to store events in a SQLite database instead of CSV.
`--websocket-port` starts a small dashboard server streaming live DAO events.
`--export-csv` and `--export-html` write collected statistics and a simple
HTML report directly from the command line.
`--metric-plugin-path` loads custom metric callbacks that extend the collected statistics.
`--oracle-plugin-path` loads Python modules that register alternative price
oracle classes, such as the built-in `GeometricBrownianOracle`.
`--matrix-workers` runs scenario matrices in parallel using multiple processes.
Interactive Plotly graphs are embedded in the HTML report when `--export-html` is used and Plotly is installed.
