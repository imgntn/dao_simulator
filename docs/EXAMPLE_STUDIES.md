# Example Research Studies

This document provides sample research questions that can be explored using the DAO Simulator, along with ready-to-use experiment configurations.

## Table of Contents

1. [Quorum Sensitivity](#1-quorum-sensitivity)
2. [DAO Scale Effects](#2-dao-scale-effects)
3. [Voting System Comparison](#3-voting-system-comparison)
4. [Participation Rate Impact](#4-participation-rate-impact)
5. [Delegation Effects](#5-delegation-effects)
6. [Treasury Size Impact](#6-treasury-size-impact)
7. [Governance Feature Analysis](#7-governance-feature-analysis)

---

## 1. Quorum Sensitivity

### Research Question
How does the quorum threshold affect proposal outcomes, governance efficiency, and member behavior?

### Hypothesis
Higher quorum requirements lead to lower proposal pass rates but potentially higher quality decisions due to broader participation requirements.

### Experiment Design

**Independent Variable:** Quorum percentage (1-20%)
**Dependent Variables:**
- Proposal pass rate
- Average voter turnout
- Time to proposal decision
- Treasury utilization

### Configuration

```yaml
# experiments/quorum-sensitivity.yaml
name: "Quorum Sensitivity Analysis"
description: "Study how quorum thresholds affect governance outcomes"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100
    simulationParams:
      votingActivity: 0.4

sweep:
  parameter: "quorumConfig.baseQuorumPercent"
  range:
    min: 1
    max: 20
    step: 1

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
  - name: "Total Proposals"
    type: builtin
    builtin: total_proposals
  - name: "Final Treasury"
    type: builtin
    builtin: final_treasury

output:
  directory: "results/quorum-sensitivity"
  formats: ["json", "csv"]
  includeManifest: true
```

### Analysis Approach

```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('results/quorum-sensitivity/metrics.csv')

# Find optimal quorum (maximize pass rate while ensuring turnout)
optimal = df.groupby('sweep_value').agg({
    'Proposal Pass Rate': 'mean',
    'Average Turnout': 'mean'
}).reset_index()

# Plot tradeoff
fig, ax1 = plt.subplots()
ax1.plot(optimal['sweep_value'], optimal['Proposal Pass Rate'], 'b-', label='Pass Rate')
ax2 = ax1.twinx()
ax2.plot(optimal['sweep_value'], optimal['Average Turnout'], 'r-', label='Turnout')
```

---

## 2. DAO Scale Effects

### Research Question
How do governance dynamics change as DAOs grow from small communities to large organizations?

### Hypothesis
Larger DAOs face coordination challenges leading to lower participation rates and potentially more plutocratic outcomes.

### Experiment Design

**Independent Variable:** DAO size (25-500 members)
**Dependent Variables:**
- Voter participation rate
- Wealth concentration (Gini coefficient)
- Proposal volume and pass rate
- Delegation patterns

### Configuration

```yaml
# experiments/dao-scale.yaml
name: "DAO Scale Effects"
description: "Study how governance changes with organization size"

baseConfig:
  template: "compound"
  overrides:
    simulationParams:
      proposalFrequency: 0.5

sweep:
  parameter: "memberDistribution.totalMembers"
  values: [25, 50, 100, 200, 300, 500]

execution:
  runsPerConfig: 50
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 12345

metrics:
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout
  - name: "Final Gini"
    type: builtin
    builtin: final_gini
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Total Proposals"
    type: builtin
    builtin: total_proposals

output:
  directory: "results/dao-scale"
  formats: ["json", "csv"]
  includeTimeline: true
  includeManifest: true
```

### Analysis Approach

Look for inflection points where governance dynamics change significantly. Common findings:
- Participation drops sharply above ~100 members
- Delegation becomes critical above ~200 members
- Gini coefficient stabilizes at larger scales

---

## 3. Voting System Comparison

### Research Question
How do different voting mechanisms affect governance outcomes and wealth distribution?

### Hypothesis
Quadratic voting reduces plutocratic influence but may lower overall participation due to complexity.

### Experiment Design

**Independent Variable:** Voting system type
**Dependent Variables:**
- Proposal pass rate
- Wealth distribution changes
- Participation patterns
- Minority voice representation

### Configuration

```yaml
# experiments/voting-comparison.yaml
name: "Voting System Comparison"
description: "Compare token, quadratic, and conviction voting mechanisms"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100
    simulationParams:
      votingActivity: 0.5

sweep:
  parameter: "votingSystem.type"
  values: ["token", "quadratic", "conviction"]

execution:
  runsPerConfig: 100
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
  - name: "Total Proposals"
    type: builtin
    builtin: total_proposals

output:
  directory: "results/voting-comparison"
  formats: ["json", "csv"]
  includeManifest: true
```

### Analysis Approach

Statistical comparison using ANOVA or Kruskal-Wallis test for non-normal distributions. Box plots for visualization.

---

## 4. Participation Rate Impact

### Research Question
What is the relationship between member engagement and governance effectiveness?

### Hypothesis
There's an optimal participation rate - too low leads to unrepresentative decisions, too high may cause voter fatigue.

### Configuration

```yaml
# experiments/participation-study.yaml
name: "Participation Rate Impact"
description: "Study how voter engagement affects governance quality"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

sweep:
  parameter: "simulationParams.votingActivity"
  values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

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
  directory: "results/participation-study"
  formats: ["json", "csv"]
  includeManifest: true
```

---

## 5. Delegation Effects

### Research Question
How does token delegation affect power concentration and governance efficiency?

### Hypothesis
Delegation improves efficiency but may concentrate power among delegates.

### Configuration

```yaml
# experiments/delegation-effects.yaml
name: "Delegation Effects Study"
description: "Study how delegation patterns affect governance"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100
      distribution:
        - type: "whale"
          count: 5
          tokenShare: 0.30
        - type: "delegate"
          count: 10
          tokenShare: 0.20
        - type: "active"
          count: 30
          tokenShare: 0.30
        - type: "passive"
          count: 55
          tokenShare: 0.20

sweep:
  parameter: "simulationParams.delegationRate"
  values: [0, 0.2, 0.4, 0.6, 0.8]

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
  - name: "Final Gini"
    type: builtin
    builtin: final_gini

output:
  directory: "results/delegation-effects"
  formats: ["json", "csv"]
  includeManifest: true
```

---

## 6. Treasury Size Impact

### Research Question
Does treasury size affect governance behavior and proposal quality?

### Hypothesis
Larger treasuries attract more proposals and higher-stakes conflicts.

### Configuration

```yaml
# experiments/treasury-impact.yaml
name: "Treasury Size Impact"
description: "Study how treasury size affects governance dynamics"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

sweep:
  parameter: "treasury.initialBalance"
  values: [100000, 500000, 1000000, 5000000, 10000000, 50000000]

execution:
  runsPerConfig: 50
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 42

metrics:
  - name: "Total Proposals"
    type: builtin
    builtin: total_proposals
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Final Treasury"
    type: builtin
    builtin: final_treasury
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout

output:
  directory: "results/treasury-impact"
  formats: ["json", "csv"]
  includeManifest: true
```

---

## 7. Governance Feature Analysis

### Research Question
What impact do advanced governance features (timelock, Easy Track, etc.) have on outcomes?

### Configuration

```yaml
# experiments/feature-analysis.yaml
name: "Governance Feature Analysis"
description: "Compare DAOs with and without advanced features"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

sweep:
  parameter: "features.timelockEnabled"
  values: [false, true]

execution:
  runsPerConfig: 100
  stepsPerRun: 500
  seedStrategy: sequential
  baseSeed: 42

metrics:
  - name: "Proposal Pass Rate"
    type: builtin
    builtin: proposal_pass_rate
  - name: "Final Treasury"
    type: builtin
    builtin: final_treasury
  - name: "Average Turnout"
    type: builtin
    builtin: average_turnout

output:
  directory: "results/feature-analysis"
  formats: ["json", "csv"]
  includeManifest: true
```

---

## Running These Studies

```bash
# Run any study from the experiments folder
npm run experiment -- experiments/quorum-sensitivity.yaml

# Use concurrent execution for faster results
npm run experiment -- experiments/dao-scale.yaml -c 4

# Run multiple studies sequentially
for study in quorum-sensitivity dao-scale voting-comparison; do
  npm run experiment -- experiments/${study}.yaml -c 4
done
```

## Analyzing Results

All experiments export to CSV format compatible with pandas and R:

```python
# Load and combine multiple studies
import pandas as pd
import glob

studies = {}
for path in glob.glob('results/*/metrics.csv'):
    name = path.split('/')[1]
    studies[name] = pd.read_csv(path)
```

## Publication Checklist

For publishable research:

- [ ] Run at least 50 iterations per configuration
- [ ] Report confidence intervals, not just means
- [ ] Include reproducibility manifest in supplementary materials
- [ ] Document any modifications to experiment configs
- [ ] Save raw data for peer verification
- [ ] Record git commit hash and software versions

## See Also

- [RESEARCH_CLI.md](./RESEARCH_CLI.md) - CLI usage guide
- [EXPERIMENT_CONFIG.md](./EXPERIMENT_CONFIG.md) - Full configuration reference
