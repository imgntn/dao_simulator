# Living Academic Paper

This directory contains a **living academic paper** that automatically updates as experiments are run. The paper follows arxiv/computer science style and covers multi-agent simulation of DAO governance.

## Structure

```
paper/
├── main.tex              # Main LaTeX document
├── references.bib        # Bibliography
├── sections/             # Auto-updated section files
│   ├── abstract.tex
│   ├── introduction.tex
│   ├── background.tex
│   ├── theory.tex
│   ├── architecture.tex
│   ├── methodology.tex
│   ├── results.tex       # Heavily auto-updated
│   ├── discussion.tex
│   ├── limitations.tex
│   ├── conclusion.tex
│   └── appendix_*.tex
├── figures/              # Generated charts
├── generated/            # Temporary generation files
└── workflows/            # ComfyUI & Ollama configs
    ├── chart-stylizer.json
    └── ollama-prompts.json
```

## Usage

### Update Paper with Latest Results

```bash
# Update all sections and regenerate charts
npm run paper:update

# Only regenerate charts
npm run paper:charts

# Update and compile to PDF
npm run paper:compile

# Update specific section
npm run paper:update -- --section=results
```

### Workflow

1. **Run experiments**: `npm run experiment -- experiments/quorum-sweep.yaml`
2. **Update paper**: `npm run paper:update`
3. **Review changes**: Check `sections/*.tex` for updated content
4. **Compile PDF**: `npm run paper:compile` (requires LaTeX)

### Auto-Update Flow

```
┌─────────────────┐
│  Run Experiment │
│  npm run exp... │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Results saved  │
│  results/*.csv  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  paper:update   │────▶│    Ollama       │
│  Load results   │     │  (deepseek-r1)  │
└────────┬────────┘     │  Generate text  │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Generate       │────▶│   matplotlib    │
│  Charts         │     │   (Python)      │
└────────┬────────┘     └─────────────────┘
         │
         │              ┌─────────────────┐
         └─────────────▶│    ComfyUI      │
                        │  (optional)     │
                        │  Style charts   │
                        └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Update LaTeX   │
│  sections/*.tex │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Compile PDF    │
│  (if requested) │
└─────────────────┘
```

## Template Variables

The LaTeX files contain template variables that get replaced:

| Variable | Description |
|----------|-------------|
| `{{TIMESTAMP}}` | When section was last updated |
| `{{EXPERIMENT_COUNT}}` | Number of experiment types |
| `{{TOTAL_RUNS}}` | Total simulation runs |
| `{{QUORUM_FINDING_1}}` | First quorum finding |
| `{{SCALE_EXPONENT}}` | Power-law exponent for scale |
| ... | (see sections for more) |

## Ollama Integration

Uses deepseek-r1:32b (ultrathink) for:
- Generating findings from data
- Updating section text
- Writing figure captions
- Generating discussion points

### Prompts

See `workflows/ollama-prompts.json` for prompt templates.

### Manual Generation

```bash
# Ask Ollama directly
ollama run deepseek-r1:32b "Based on pass_rate=0.72 at quorum=5%, write a finding."
```

## ComfyUI Integration

Optional: Use ComfyUI to stylize charts for publication quality.

### Workflow

`workflows/chart-stylizer.json` - Enhances matplotlib charts while preserving data accuracy.

### Usage

1. Generate base chart with `npm run paper:charts`
2. Open ComfyUI at http://localhost:8188
3. Load workflow from `workflows/chart-stylizer.json`
4. Load chart image in "Load Chart Image" node
5. Run workflow
6. Output saved with "paper_chart" prefix

## Compiling PDF

Requires LaTeX installation (TeX Live, MiKTeX, etc.):

```bash
# Install on Windows (via Chocolatey)
choco install miktex

# Or download from https://miktex.org/download

# Then compile
npm run paper:compile
```

## Paper Content

### Theoretical Framework

The paper integrates:
- **Multi-Agent Systems (MAS)**: Agent heterogeneity, emergent behavior
- **Mechanism Design**: Voting rules, incentive compatibility
- **Computational Social Choice**: Aggregation, manipulation
- **Complex Adaptive Systems**: Scale effects, path dependence
- **Agent-Based Modeling**: Monte Carlo methods, statistical analysis

### Research Questions

1. How do quorum thresholds affect governance outcomes?
2. What is the relationship between DAO size and participation?
3. How do voting mechanisms compare (token vs quadratic vs conviction)?
4. Under what conditions do delegation systems help?

## Contributing

To add new experiment types:

1. Create experiment config in `experiments/`
2. Add chart generation in `scripts/paper-update.ts`
3. Add template variables to relevant `sections/*.tex`
4. Run `npm run paper:update` to test

## Citation

If using this paper or framework:

```bibtex
@article{dao-simulator,
  title={Emergent Governance Dynamics in DAOs: A Multi-Agent Simulation Framework},
  author={...},
  year={2024},
  note={Living document, last updated: TIMESTAMP}
}
```
