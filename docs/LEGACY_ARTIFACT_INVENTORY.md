# Legacy Artifact Inventory

**Inventory date:** 2026-07-17
**Legacy code baseline:** `5829bdbea511af349fef6aed168d03912ca9baf9`
**Research status:** Historical and non-publishable without reconstruction

## Result stores

| Location | Approximate contents | Status |
|---|---|---|
| `results/paper` | 22,209 raw run files; approximately 98.6 MB | March-era raw runs remain, but summaries/statistics/manifests were overwritten with dummy artifacts |
| `results/archive` | Approximately 172,753 files; approximately 3 GB | Mixed historical archives; provenance requires per-archive verification |
| `results/historical` | Historical campaigns and derived material | Preserve for comparison; do not mix with new campaigns |
| `results/validation` | Multiple validation generations | Contains accumulated old/new runs and newly generated 2026-07-17 diagnostics |
| `paper/main.pdf` | February-era compiled manuscript | Stale |
| `paper/sections/results.tex` | Results prose predating later experiments and engine fixes | Stale |

## Known contamination

- `summary.json` files in paper outputs were replaced with one-run dummy summaries.
- `stats.csv` files were replaced with `placeholder,0`.
- `manifest.json` files were replaced with `dummyhash`.
- Old and new raw validation files can coexist because exporters do not clear or isolate output roots.
- Some status files report `completed` despite all runs failing.
- Current raw paper runs predate material April 2026 simulator changes.

## Preservation policy

The legacy tree is evidence of prior development, not evidence for the new paper. A checksummed archive is preserved under `artifacts/legacy/2026-07-17-pre-publication-foundation-v3/`. New research output must use immutable campaign directories and may not write into any path listed above.

## Preserved archive identity

| Property | Value |
|---|---|
| Archive | `2026-07-17-pre-publication-foundation-v3` |
| Files | 22,226 legacy payload files |
| Payload bytes | 103,719,997 |
| Manifest | `archive-manifest.json` |
| Manifest SHA-256 | `463dee2ec1cc380742e6c3c320899f6938b9b9550f3b4a7f5416373128f37dc7` |
| Status | Historical, immutable, non-publishable |
