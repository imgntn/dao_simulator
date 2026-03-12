# Archived Data

Data archived to Cloudflare R2 on 2026-03-12 during repo cleanup.

## R2 Bucket: `dao-research-media`

All archives stored under the `dao-simulator-archives/` prefix.

| Archive | Size | Contents |
|---------|------|----------|
| `results-paper.tar.gz` | 35 MB | Experiment results from `results/paper/`, `results/paper-pack-2026-01-30/`, `results/example/` (~94,860 files) |
| `archive.tar.gz` | 2.6 MB | Old checkpoints and paper snapshots from `archive/` (1,043 files) |
| `paper-variants.tar.gz` | 9.6 MB | Paper phase builds from `paper_p1/`, `paper_p2/`, `paper_llm/` (197 files) |
| `paper-pdfs.tar.gz` | 20 MB | All generated PDFs: research papers, figures, press releases (43 files) |

## Download

```bash
# Download a specific archive
wrangler r2 object get dao-research-media/dao-simulator-archives/results-paper.tar.gz --file results-paper.tar.gz --remote

# Extract
tar xzf results-paper.tar.gz
```

## Also removed

- `legacy-python/` — Original Python codebase (pre-TypeScript rewrite). Preserved in git history.
- `__pycache__/` and `*.pyc` — Python bytecode cache (151 files)
- LaTeX build artifacts (`*.aux`, `*.bbl`, `*.blg`, `*.out`)
- Empty directories: `frontend/`, `hooks/`, `types/`
