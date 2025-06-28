# DAO Simulation

This DAO simulation is a modular and maintainable implementation of a Decentralized Autonomous Organization. The simulation models various agent classes that interact with each other and the DAO, allowing users to explore the behavior of different types of members within the organization. An internal event bus broadcasts agent actions so dashboards and plugins can react in real time.
For a more detailed introduction and FAQ, see [docs/GUIDE.md](docs/GUIDE.md).
Diagrams illustrating the architecture can be found in [docs/DIAGRAMS.md](docs/DIAGRAMS.md).
Agent summaries live in [AGENTS.md](AGENTS.md) and visualization details in
[VISUALIZATIONS.md](VISUALIZATIONS.md).
Details on bridging tokens and NFTs are available in
[docs/BRIDGING.md](docs/BRIDGING.md).
The NFT marketplace is described in [docs/NFT_MARKETPLACE.md](docs/NFT_MARKETPLACE.md).
Guidance on straightforward revenue generation can be found in
[MONETIZATION_STEPS.md](MONETIZATION_STEPS.md).


## Summary

The simulation models the behavior of a DAO, a decentralized organization managed by a smart contract or a set of rules. The DAO members, represented by various agent classes, can create proposals, vote on them, invest in projects, and perform other activities. The simulation also incorporates treasury management, token pricing, and revenue distribution to model the dynamics of a real-world DAO.

## Key Features

- **Extensible agent system** – developers, investors, regulators and many other roles are implemented as separate classes.
- **Pluggable voting strategies** – choose from built-in strategies or load custom modules via the command line.
- **Treasury with price oracles** – token values can follow simple random walks or more complex market models.
- **CLI and scripting API** – run the simulation from the command line or import `DAOSimulation` in a Python script.
- **Optional dashboards and visualizations** – an admin panel and Mesa visualization can be launched when the related packages are installed.
- **Plugin hooks** – extend the simulator with external agent types, metrics and oracles.
- **Liquidity pools and staking** – experiment with token swaps and interest on locked funds.
- **Player-operated DEX** – queue swaps or liquidity changes through the web interface.
- **Market shock events** – simulate abrupt token price changes to test strategies under stress.
- **NFT marketplace** – artists can mint NFTs and collectors purchase them during the simulation.
- **Pluggable governance rules** – choose approval logic for proposals or load custom rules.
- **Quadratic funding rounds** – community contributions are matched from the treasury using the square-root formula.
- **Guilds** – members can form persistent sub-groups with their own treasuries and projects.
- **News feed dashboard** – step summaries highlight recent proposals, NFTs and guild activity.
- **Prediction market** – members bet on proposal outcomes and share in the winnings.

## Agent Classes

- `Arbitrator`: Resolves disputes and enforces the rules of the DAO.
- `DAO Member`: Base class for all DAO members, handling common properties and behaviors like voting, commenting, and holding tokens and reputation.
- `Delegator`: Delegates their support (tokens) to proposals.
- `Developer`: Contributes skills to build and maintain projects within the DAO.
- `External Partner`: Collaborates on projects or proposals from outside the DAO.
- `Investor`: Invests in projects and proposals within the DAO.
- `Adaptive Investor`: Learns which proposal types yield better returns and
  adjusts investments accordingly.
- `Bounty Hunter`: Completes bounty proposals and claims locked rewards from the
  treasury.
- `Trader`: Swaps tokens in the DAO's liquidity pools based on price trends.
- `RLTrader`: Uses Q-learning to adapt swap decisions over time.
- `Artist`: Mints NFTs and lists them on the marketplace.
- `Collector`: Buys listed NFTs when prices are affordable.
- `Passive Member`: Passively holds tokens and participates in the DAO without taking an active role.
- `Proposal Creator`: Creates and submits proposals to the DAO.
- `Liquid Delegator`: Picks a representative who votes on their behalf.
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

5. **Launch the Web Interface**

   ```bash
   python cli.py --web
   ```

   This command starts a FastAPI server that combines the admin controls and
   live dashboard in a single page. Use `--websocket-port` to choose the port
   (default is `8003`).

6. **Interact with the Player Agent**

   When the web interface is running a player-controlled agent is available.
   Use the forms under "Player Controls" to queue votes, comments, proposal
   creation and delegation actions. Each simulation step processes one queued
   action.

   ![Player controls screenshot](docs/PLAYER_CONTROLS_SCREENSHOT.txt)
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

`DAOSimulation` exposes a `centrality_interval` parameter that forwards to
`SimpleDataCollector`. Delegation centrality is recomputed only on steps divisible
by this interval, which can speed up large runs at the cost of slightly stale
network metrics.

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

## Additional Features

Recent updates introduced several optional mechanics that enhance the realism
of the model:

- **Liquidity pools** managed by the treasury let agents swap tokens and test
  price impact.
- **Staking** allows members to lock tokens and earn interest over time.
- **Market shock events** can be triggered to simulate sudden price swings.
- **Dashboard metrics** now track delegation networks and liquidity activity in
  real time.
- **Event bus** broadcasts simulation events so external dashboards or plugins
  can subscribe.
- **Event scheduler** lets you add new events at runtime via the `/events` API
  or dashboard form.
- **Multi-DAO mode** runs several DAOs in parallel with optional cross-DAO proposals.
- **Cross-DAO bridges** transfer tokens with configurable fees and delays.
- **Reinforcement-learning trader** optimizes swaps using Q-learning.
- **DEX endpoints** expose swap and liquidity actions for the player agent.
- **SQLite event analytics** summarize event counts and token flows.
- **Hot-reload strategies** with the `--watch` flag when the `watchdog`
  dependency is available.
- **Trending topics** in the dashboard show a simple word cloud of recent news
  summaries.

## Command Line Interface

The `cli.py` module exposes a small interface for running the simulation without
modifying code.  For example, to run 50 steps with just two developers:

```bash
python -m cli --steps 50 --num_developers 2
```

Flags like `--use-parallel` or `--use-async` enable alternative schedulers. The
`--config` option loads settings from a JSON/YAML file. Any `num_*` setting from
`settings.py` can still be overridden on the command line.
The new `num_artists` and `num_collectors` options control how many NFT agents
are spawned.
`--strategy-path` and `--agent-plugin-path` allow loading custom voting
strategies and agent types from external Python modules. Use
`--event-db` to store events in a SQLite database instead of CSV.
`--event-analytics` prints a summary of logged events when using a SQLite log.
`--num-daos` controls how many DAOs run in parallel and `--enable-cross-dao`
activates cross-DAO proposals.
`--websocket-port` starts a small dashboard server streaming live DAO events.
`--export-csv` and `--export-html` write collected statistics and a simple
HTML report directly from the command line.
`--metric-plugin-path` loads custom metric callbacks that extend the collected statistics.
`--oracle-plugin-path` loads Python modules that register alternative price
oracle classes, such as the built-in `GeometricBrownianOracle`.
`--governance-rule` selects the registered rule used to approve proposals.
`--governance-plugin-path` loads Python modules that register additional governance rules.
`--enable-marketing` activates marketing campaigns and `--marketing-level`
controls how aggressive those campaigns are.
`--matrix-workers` runs scenario matrices in parallel using multiple processes.
Interactive Plotly graphs are embedded in the HTML report when `--export-html` is used and Plotly is installed.

All code in this repository is provided under a private, all-rights-reserved license.

