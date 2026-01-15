# Experiment Configuration Reference

This document provides a complete reference for experiment configuration files used with the DAO Simulator CLI.

## Table of Contents

- [Overview](#overview)
- [Configuration Structure](#configuration-structure)
- [Base Config](#base-config)
- [Parameter Sweeps](#parameter-sweeps)
- [Execution Settings](#execution-settings)
- [Metrics](#metrics)
- [Output Settings](#output-settings)
- [Complete Examples](#complete-examples)

## Overview

Experiment configurations are YAML or JSON files that define:

1. **What** to simulate (base DAO configuration)
2. **How** to vary it (optional parameter sweep)
3. **How many** times to run (execution settings)
4. **What** to measure (metrics)
5. **Where** to save results (output settings)

## Configuration Structure

```yaml
# Required
name: string              # Experiment name
baseConfig: object        # DAO configuration
execution: object         # Run settings
metrics: array            # What to measure
output: object            # Export settings

# Optional
description: string       # Experiment description
version: string          # Config version
author: string           # Author name
tags: string[]           # Tags for organization
sweep: object            # Parameter sweep (optional)
```

## Base Config

The `baseConfig` section defines the DAO to simulate. There are three ways to specify it:

### Option 1: Template

Use a predefined template with optional overrides:

```yaml
baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100
    quorumConfig:
      baseQuorumPercent: 5
```

**Available templates:**
| Template | Description |
|----------|-------------|
| `compound` | Compound-style token voting |
| `optimism` | Optimism's bicameral governance |
| `lido` | Lido's dual governance with Easy Track |
| `maker` | MakerDAO's approval voting system |
| `custom` | Minimal starting config |

### Option 2: Inline Config

Provide a complete DAO configuration inline:

```yaml
baseConfig:
  inline:
    name: "My Custom DAO"
    tokenSymbol: "GOV"
    tokenSupply: 10000000
    votingSystem:
      type: "token"
      quorumType: "token_percent"
    quorumConfig:
      type: "fixed_percent"
      baseQuorumPercent: 4
    # ... full DAODesignerConfig
```

### Option 3: File Reference

Load configuration from a JSON file:

```yaml
baseConfig:
  file: "configs/my-dao-config.json"
  overrides:
    memberDistribution:
      totalMembers: 200
```

### Simulation Overrides

Additional simulation-level settings:

```yaml
baseConfig:
  template: "compound"
  simulationOverrides:
    stepsToRun: 1000          # Override steps per run
    checkpointInterval: 100    # Checkpoint every N steps
    eventLogging: true         # Enable detailed event logging
```

## Parameter Sweeps

The optional `sweep` section enables running experiments across different parameter values.

### Explicit Values

```yaml
sweep:
  parameter: "quorumConfig.baseQuorumPercent"
  values: [2, 5, 10, 15, 20]
```

### Numeric Range

```yaml
sweep:
  parameter: "memberDistribution.totalMembers"
  range:
    min: 50
    max: 200
    step: 25
```

### Sweepable Parameters

Any parameter in the DAODesignerConfig can be swept using dot notation:

| Parameter Path | Description | Example Values |
|----------------|-------------|----------------|
| `quorumConfig.baseQuorumPercent` | Quorum threshold | 1-50 |
| `memberDistribution.totalMembers` | DAO size | 10-500 |
| `simulationParams.votingActivity` | Participation rate | 0.1-0.9 |
| `simulationParams.proposalFrequency` | Proposals per day | 0.1-2.0 |
| `treasury.initialBalance` | Starting funds | 100000-100000000 |
| `votingSystem.type` | Voting mechanism | "token", "quadratic", "conviction" |
| `features.timelockEnabled` | Timelock feature | true, false |

## Execution Settings

The `execution` section controls how simulations are run.

```yaml
execution:
  runsPerConfig: 30           # How many times to run each config
  stepsPerRun: 500            # Simulation steps (days) per run
  seedStrategy: sequential    # How to generate random seeds
  baseSeed: 12345            # Starting seed
  workers: 1                  # Parallel workers (future)
```

### Seed Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `sequential` | Seeds increment from baseSeed | Reproducible studies |
| `fixed` | Use specific seeds from array | Reproducing specific runs |
| `random` | Random seeds each run | Exploratory analysis |

### Fixed Seeds Example

```yaml
execution:
  runsPerConfig: 5
  seedStrategy: fixed
  fixedSeeds: [1001, 2002, 3003, 4004, 5005]
```

## Metrics

The `metrics` array defines what to measure from each simulation run.

### Built-in Metrics

```yaml
metrics:
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate

  - name: "Average Voter Turnout"
    type: builtin
    builtin: average_turnout
```

**Available built-in metrics:**

| Metric ID | Description |
|-----------|-------------|
| `proposal_pass_rate` | Fraction of proposals that passed |
| `average_turnout` | Average voter participation rate |
| `final_treasury` | Treasury balance at end of simulation |
| `final_token_price` | Token price at end of simulation |
| `final_member_count` | Number of members at end |
| `final_gini` | Token distribution inequality (0-1) |
| `final_reputation_gini` | Reputation inequality (0-1) |
| `total_proposals` | Total proposals created |
| `total_projects` | Total projects funded |
| `average_token_balance` | Average member token holdings |

### Custom Metrics

Define custom metrics using JavaScript expressions:

```yaml
metrics:
  - name: "Quorum Failure Rate"
    type: custom
    expression: "proposals.filter(p => p.status === 'quorum_failed').length / proposals.length"
    description: "Fraction of proposals that failed due to low turnout"

  - name: "Treasury Efficiency"
    type: custom
    expression: "(initialTreasury - finalTreasury) / totalProjectsFunded"
    description: "Average cost per funded project"
```

**Expression context variables:**
- `dao` - The DAO simulation object
- `proposals` - Array of all proposals
- `members` - Array of all members
- `dataCollector` - Historical data collector
- `initialTreasury` - Starting treasury value
- `finalTreasury` - Ending treasury value

## Output Settings

The `output` section controls how results are saved.

```yaml
output:
  directory: "results/my-experiment"
  formats: ["json", "csv"]
  includeRawRuns: true
  includeTimeline: false
  includeManifest: true
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | string | `"results"` | Output directory path |
| `formats` | array | `["json"]` | Export formats: "json", "csv" |
| `includeRawRuns` | boolean | `true` | Save individual run data |
| `includeTimeline` | boolean | `false` | Include step-by-step data |
| `includeManifest` | boolean | `true` | Generate reproducibility manifest |

### Output Files Generated

With `formats: ["json", "csv"]`:

```
results/my-experiment/
├── summary.json       # Full experiment summary
├── manifest.json      # Reproducibility info
├── metrics.csv        # Per-run metrics (for pandas/R)
├── stats.csv          # Aggregated statistics
├── timeline.csv       # Step-by-step data (if enabled)
└── runs/              # Individual run data (if enabled)
    ├── run-001.json
    └── ...
```

## Complete Examples

### Example 1: Simple Single-Config Study

```yaml
name: "Compound Governance Baseline"
description: "Establish baseline metrics for Compound-style governance"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

execution:
  runsPerConfig: 50
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 42

metrics:
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout
  - name: "Final Treasury"
    type: builtin
    builtin: final_treasury
  - name: "Final Gini"
    type: builtin
    builtin: final_gini

output:
  directory: "results/compound-baseline"
  formats: ["json", "csv"]
  includeRawRuns: true
  includeManifest: true
```

### Example 2: Quorum Sensitivity Study

```yaml
name: "Quorum Sensitivity Analysis"
description: "How does quorum threshold affect proposal outcomes?"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

sweep:
  parameter: "quorumConfig.baseQuorumPercent"
  range:
    min: 1
    max: 20
    step: 1

execution:
  runsPerConfig: 30
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 12345

metrics:
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout
  - name: "Quorum Failures"
    type: custom
    expression: "proposals.filter(p => p.failureReason === 'quorum').length"

output:
  directory: "results/quorum-sensitivity"
  formats: ["json", "csv"]
  includeRawRuns: false
  includeManifest: true
```

### Example 3: Governance System Comparison

```yaml
name: "Voting System Comparison"
description: "Compare token, quadratic, and conviction voting"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

sweep:
  parameter: "votingSystem.type"
  values: ["token", "quadratic", "conviction"]

execution:
  runsPerConfig: 50
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 42

metrics:
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Final Gini"
    type: builtin
    builtin: final_gini
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout

output:
  directory: "results/voting-comparison"
  formats: ["json", "csv"]
  includeManifest: true
```

### Example 4: DAO Scale Study

```yaml
name: "DAO Scale Effects"
description: "How does DAO size affect governance metrics?"

baseConfig:
  template: "compound"

sweep:
  parameter: "memberDistribution.totalMembers"
  values: [25, 50, 100, 200, 500]

execution:
  runsPerConfig: 30
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 12345

metrics:
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout
  - name: "Final Gini"
    type: builtin
    builtin: final_gini
  - name: "Total Proposals"
    type: builtin
    builtin: total_proposals

output:
  directory: "results/scale-study"
  formats: ["json", "csv"]
  includeTimeline: true
  includeManifest: true
```

## Schema Validation

The configuration is validated at runtime. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid template" | Unknown template name | Use: compound, optimism, lido, maker, custom |
| "Missing required field" | Field not provided | Check required fields list |
| "Invalid metric type" | Unknown metric | Use 'builtin' or 'custom' |
| "Invalid builtin metric" | Unknown metric ID | Check available metrics list |
| "Invalid seed strategy" | Unknown strategy | Use: sequential, fixed, random |

## See Also

- [RESEARCH_CLI.md](./RESEARCH_CLI.md) - CLI usage guide
- [EXAMPLE_STUDIES.md](./EXAMPLE_STUDIES.md) - Sample research questions
- `experiments/` folder - Working example configs
