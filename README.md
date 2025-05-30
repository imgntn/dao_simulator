# DAO Simulation

This DAO simulation is a modular and maintainable implementation of a Decentralized Autonomous Organization. The simulation models various agent classes that interact with each other and the DAO, allowing users to explore the behavior of different types of members within the organization.

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

2. **Run the Simulation**

   ```bash
   python main.py
   ```

   This executes the batch run with default values from `settings.py`. Adjust the numbers of agents by editing that file or calling `update_settings()` in your own script.

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

5. **Run the Tests**

   ```bash
   python -m unittest discover tests
   ```

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
values.
