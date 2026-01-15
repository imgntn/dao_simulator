# DAO Simulator - Research CLI Guide

This guide covers using the DAO Simulator's command-line interface (CLI) for running research experiments. The CLI enables batch execution of simulations with parameter sweeps, reproducibility tracking, and data export for statistical analysis.

## Quick Start

```bash
# Run a basic experiment
npm run experiment -- experiments/example.yaml

# Run with 4 concurrent simulations (faster)
npm run experiment -- experiments/quorum-sweep.yaml -c 4

# Resume from checkpoint after interruption
npm run experiment -- experiments/long-study.yaml --resume
```

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Command-Line Options](#command-line-options)
- [Creating Experiments](#creating-experiments)
- [Using the Designer](#using-the-designer)
- [Output Files](#output-files)
- [Analyzing Results](#analyzing-results)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Installation

The CLI is included with the DAO Simulator. Ensure you have the project set up:

```bash
# Clone the repository
git clone <repository-url>
cd dao-simulator

# Install dependencies
npm install

# Verify the CLI works
npm run experiment -- --help
```

## Basic Usage

### Running an Experiment

```bash
npm run experiment -- <config-file> [options]
```

The CLI reads a YAML or JSON configuration file that defines:
- The base DAO configuration
- Optional parameter sweeps
- Number of runs per configuration
- Metrics to capture
- Output settings

### Example Output

```
Loading config: experiments/quorum-sweep.yaml

Experiment: Quorum Sensitivity Analysis
Description: How does quorum threshold affect proposal pass rate?
Sweep: quorumConfig.baseQuorumPercent (5 values)
Runs: 50 (10 per config, 500 steps each)
Concurrency: 4
Output: results/quorum-sweep

[==============================] 100% (50/50) (8.2 runs/s) ETA: 0s

=== Experiment Complete ===
Duration: 6.1s
Total runs: 50
Successful: 50
Output directory: results/quorum-sweep
Files created: 54

=== Results Summary ===
Sweep value: 2
  Proposal Pass Rate: 0.8521 (std: 0.0342)
Sweep value: 5
  Proposal Pass Rate: 0.7234 (std: 0.0567)
...
```

## Command-Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Override output directory | Config value |
| `--runs` | `-r` | Override runs per configuration | Config value |
| `--steps` | `-s` | Override steps per run | Config value |
| `--seed` | | Override base random seed | Config value |
| `--concurrency` | `-c` | Run N simulations concurrently | 1 |
| `--resume` | | Resume from checkpoint if available | false |
| `--quiet` | `-q` | Suppress progress output | false |
| `--help` | `-h` | Show help message | |

### Examples

```bash
# Run more simulations for statistical significance
npm run experiment -- experiments/study.yaml --runs 50

# Use concurrent execution for speed
npm run experiment -- experiments/study.yaml -c 8

# Custom output location
npm run experiment -- experiments/study.yaml -o results/2024-01-15-study

# Shorter simulation for testing
npm run experiment -- experiments/study.yaml --steps 100 --runs 3

# Set reproducible seed
npm run experiment -- experiments/study.yaml --seed 12345
```

## Creating Experiments

### Using the Designer (Recommended)

The easiest way to create an experiment is through the web-based Designer:

1. Open the Designer: `npm run dev` then visit `http://localhost:3000/designer`
2. Configure your DAO using the visual interface
3. Click the **"Research CLI"** button in the header
4. Configure experiment settings (runs, steps, parameter sweep)
5. Download the generated YAML file
6. Save to `experiments/` folder
7. Run with `npm run experiment -- experiments/your-config.yaml`

### Manual Configuration

Create a YAML file in the `experiments/` folder. See [EXPERIMENT_CONFIG.md](./EXPERIMENT_CONFIG.md) for the full reference.

**Simple experiment (no sweep):**

```yaml
name: "Basic Test"
description: "Test a single configuration"

baseConfig:
  template: "compound"
  overrides:
    memberDistribution:
      totalMembers: 100

execution:
  runsPerConfig: 30
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

output:
  directory: "results/basic-test"
  formats: ["json", "csv"]
  includeRawRuns: true
  includeManifest: true
```

**Parameter sweep:**

```yaml
name: "Quorum Sensitivity"
description: "How does quorum affect proposal pass rate?"

baseConfig:
  template: "compound"

sweep:
  parameter: "quorumConfig.baseQuorumPercent"
  values: [2, 5, 10, 15, 20]

execution:
  runsPerConfig: 30
  stepsPerRun: 500

# ... rest of config
```

## Using the Designer

The Designer provides a friendly interface for DAO configuration with a "Research CLI" button that generates experiment configs.

### Workflow

1. **Design** - Use the visual Designer to configure your DAO
2. **Export** - Click "Research CLI" to open the export modal
3. **Configure** - Set experiment parameters:
   - Experiment name and description
   - Runs per config (statistical replication)
   - Steps per run (simulation length)
   - Optional parameter sweep
4. **Download** - Get the YAML config file
5. **Run** - Execute via CLI: `npm run experiment -- experiments/your-config.yaml`
6. **Analyze** - Load CSV results in pandas, R, or your preferred tool

### Parameter Sweep Options

The export modal offers common sweep parameters:

| Parameter | Description | Example Values |
|-----------|-------------|----------------|
| Quorum Percentage | Minimum vote threshold | 2, 5, 10, 15, 20 |
| Total Members | DAO size | 30, 50, 100, 200 |
| Voting Activity | Member participation rate | 0.2, 0.4, 0.6, 0.8 |
| Proposal Frequency | Proposals per day | 0.3, 0.5, 1.0, 1.5 |
| Initial Treasury | Starting funds | 100000, 1000000, 10000000 |

## Output Files

After running an experiment, results are saved to the output directory:

```
results/my-experiment/
├── summary.json          # Experiment summary and aggregated stats
├── manifest.json         # Reproducibility manifest
├── metrics.csv           # Raw metrics from all runs
├── stats.csv             # Aggregated statistics per sweep value
└── runs/                 # (if includeRawRuns: true)
    ├── run-001.json
    ├── run-002.json
    └── ...
```

### File Descriptions

| File | Description | Use Case |
|------|-------------|----------|
| `summary.json` | Full experiment summary with statistics | Programmatic access to all data |
| `manifest.json` | Reproducibility info (seeds, versions, hashes) | Reproducing results |
| `metrics.csv` | One row per run, columns for each metric | Statistical analysis in pandas/R |
| `stats.csv` | Aggregated stats (mean, std, etc.) per sweep value | Quick overview |
| `runs/*.json` | Full data for each individual run | Deep dives into specific runs |

### metrics.csv Format

```csv
run_id,sweep_value,seed,duration_ms,Proposal Pass Rate,Average Turnout,Final Treasury,...
quorum-2-run-001,2,42,1234,0.85,0.34,9500000,...
quorum-2-run-002,2,43,1198,0.82,0.31,9250000,...
quorum-5-run-001,5,44,1156,0.72,0.38,8800000,...
```

### stats.csv Format

```csv
sweep_value,run_count,Proposal Pass Rate_mean,Proposal Pass Rate_std,...
2,10,0.8521,0.0342,...
5,10,0.7234,0.0567,...
10,10,0.6012,0.0423,...
```

## Analyzing Results

### Python (pandas)

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load metrics
df = pd.read_csv('results/quorum-sweep/metrics.csv')

# Group by sweep value
summary = df.groupby('sweep_value')['Proposal Pass Rate'].agg(['mean', 'std'])
print(summary)

# Plot
plt.errorbar(summary.index, summary['mean'], yerr=summary['std'], capsize=5)
plt.xlabel('Quorum Percentage')
plt.ylabel('Proposal Pass Rate')
plt.title('Effect of Quorum on Proposal Pass Rate')
plt.savefig('quorum_analysis.png')
```

### R

```r
library(tidyverse)

# Load data
df <- read_csv('results/quorum-sweep/metrics.csv')

# Summary statistics
df %>%
  group_by(sweep_value) %>%
  summarise(
    mean_pass_rate = mean(`Proposal Pass Rate`),
    sd_pass_rate = sd(`Proposal Pass Rate`)
  )

# Plot
ggplot(df, aes(x = sweep_value, y = `Proposal Pass Rate`)) +
  stat_summary(fun.data = mean_se, geom = "errorbar", width = 0.5) +
  stat_summary(fun = mean, geom = "point", size = 3) +
  labs(x = "Quorum Percentage", y = "Proposal Pass Rate")
```

## Best Practices

### Statistical Significance

- Use at least 30 runs per configuration for reliable statistics
- For publication-quality results, consider 50-100 runs
- Report confidence intervals, not just means

### Reproducibility

- Always include the reproducibility manifest with published results
- Use deterministic seeds (`seedStrategy: sequential`)
- Record the git commit hash
- Keep experiment configs in version control

### Performance

- Use concurrent execution for large studies: `-c 4` or `-c 8`
- Start with fewer steps (100-200) for testing
- Use `--quiet` for batch jobs to reduce I/O

### Organization

- Use descriptive experiment names
- Include dates in output directories for longitudinal studies
- Keep a research log documenting each experiment's purpose

## Troubleshooting

### Common Issues

**"Config file not found"**
- Ensure the path is relative to project root
- Check file extension (.yaml or .yml)

**"Invalid template"**
- Valid templates: `compound`, `optimism`, `lido`, `maker`, `custom`
- Use `inline` config for custom DAOs

**Checkpoint mismatch**
- Delete `.checkpoints/` directory if config changed
- Or use `--seed` to force new run

**Out of memory**
- Reduce concurrency with `-c 1`
- Use shorter simulations with `--steps`

### Getting Help

- Check experiment config syntax against [EXPERIMENT_CONFIG.md](./EXPERIMENT_CONFIG.md)
- Run with `DEBUG=1 npm run experiment -- ...` for verbose output
- File issues at the project repository

## Next Steps

- [EXPERIMENT_CONFIG.md](./EXPERIMENT_CONFIG.md) - Full configuration reference
- [EXAMPLE_STUDIES.md](./EXAMPLE_STUDIES.md) - Sample research questions and configs
- `experiments/` folder - Working example configurations
