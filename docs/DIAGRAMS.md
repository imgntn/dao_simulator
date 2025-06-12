# DAO Simulator Diagrams

This page collects several Mermaid diagrams that illustrate how the main parts of the repository fit together.

## Architecture Flowchart

```mermaid
flowchart TD
    A[Start Simulation] --> B{Run Step}
    B --> C[Scheduler selects agents]
    C --> D[Agent performs action]
    D --> E[DAO updates state]
    E --> F[DataCollector records metrics]
    F --> G{More steps?}
    G -->|yes| B
    G -->|no| H[Generate report]
```

The flowchart shows the high level loop executed by `DAOSimulation.run()`.

## Sequence of an Agent Action

```mermaid
sequenceDiagram
    participant Scheduler
    participant Developer
    participant DAO
    participant EventBus
    Scheduler->>Developer: step()
    Developer->>DAO: create_proposal()
    DAO->>EventBus: publish "proposal_created"
    DAO-->>Developer: proposal object
```

This sequence diagram highlights how a developer creates a proposal which is then announced through the event bus.

## Agent Class Hierarchy

```mermaid
classDiagram
    class Agent
    Agent <|-- DAOMember
    DAOMember <|-- Developer
    DAOMember <|-- Investor
    DAOMember <|-- Delegator
    DAOMember <|-- LiquidDelegator
    DAOMember <|-- ProposalCreator
    DAOMember <|-- Arbitrator
    DAOMember <|-- Regulator
    DAOMember <|-- ServiceProvider
    DAOMember <|-- Validator
    DAOMember <|-- Auditor
    DAOMember <|-- BountyHunter
    DAOMember <|-- ExternalPartner
    DAOMember <|-- Trader
    Trader <|-- RLTrader
    DAOMember <|-- PassiveMember
```

The diagram reflects the structure defined in the `agents` package.

## Data Structure Relationships

```mermaid
erDiagram
    DAO ||--o{ Proposal : contains
    DAO ||--o{ Project : manages
    DAO ||--o{ Dispute : tracks
    DAO ||--o{ Violation : records
    DAO ||--|{ Member : has
    DAO }o--|| Treasury : uses
    Proposal }o--|| Project : may_fund
    Dispute }o--|| Member : involves
    Violation }o--|| Member : penalizes
```

This entity relationship diagram outlines how the core data structures interact.

## Staking Flow

```mermaid
sequenceDiagram
    participant Member
    participant Treasury
    Member->>Treasury: stake tokens
    Treasury-->>Member: accrue interest
```

## Liquidity Pool

```mermaid
sequenceDiagram
    participant TraderA
    participant Treasury
    participant TraderB
    TraderA->>Treasury: swap TokenA
    Treasury-->>TraderA: receive TokenB
    TraderB->>Treasury: swap TokenB
    Treasury-->>TraderB: receive TokenA
```

## Strategy Plugin Reloading

```mermaid
sequenceDiagram
    participant CLI
    participant Observer
    participant VotingStrategies
    CLI->>VotingStrategies: load_strategy_plugins()
    Observer-->>VotingStrategies: file changed
    VotingStrategies->>VotingStrategies: register_strategy()
```

The diagram shows how the `watch_strategy_plugins` helper automatically reloads
voting strategies when source files change.
