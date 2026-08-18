# Reproducing the DAO Simulator Evidence

This repository separates immutable simulation evidence from derived publication
files. A campaign is accepted only when its resolved task plan, run index,
accounting, provenance, and every indexed byte pass verification. Publication
tables, figures, claim extracts, and LaTeX fragments are regenerated from that
verified campaign; they are never treated as primary evidence.

## Prerequisites

- Node.js 22 and npm
- Python 3.12 or newer for the calibration ingestion tests
- A verified campaign directory
- Docker 24 or newer only when using the container path

Install the exact JavaScript dependency graph with `npm ci`. For local Python
research checks, create an isolated environment and install
`python/requirements-research.txt`.

## Fast artifact reproduction

This verifies every indexed campaign byte, regenerates the publication bundle,
verifies every derived byte, and writes a machine-readable report:

```bash
npm run reproduce -- \
  --campaign artifacts/campaigns/<campaign-id> \
  --profile artifacts
```

The default outputs are:

- `publication/campaigns/<campaign-id>/`
- `results/reproduction/<campaign-id>-artifacts.json`

Use `--output` and `--report` to select other locations. The publication
manifest and console output expose the bundle identity as a SHA-256 digest.

## Full independent reproduction

The full profile adds linting, TypeScript checking, the complete unit suite,
Python ingestion tests, and the production application build before deriving
publication assets:

```bash
npm run reproduce -- \
  --campaign artifacts/campaigns/<campaign-id> \
  --profile full
```

A failed check produces a failed reproduction report and a nonzero process
exit. Campaign input is read-only throughout this workflow.

## Container path

The research image pins Node 22, the Python analysis packages, and the TeX
packages required by the manuscript. It is deliberately separate from the
smaller deployment image.

PowerShell:

```powershell
$env:DAO_SIM_CAMPAIGN_DIR = (Resolve-Path 'artifacts/campaigns/<campaign-id>')
New-Item -ItemType Directory -Force 'results/container-reproduction' | Out-Null
$env:DAO_SIM_REPRODUCTION_OUTPUT = (Resolve-Path 'results/container-reproduction')
docker compose -f compose.research.yml run --build --rm reproduce
```

Git Bash:

```bash
export DAO_SIM_CAMPAIGN_DIR="$(pwd)/artifacts/campaigns/<campaign-id>"
mkdir -p results/container-reproduction
export DAO_SIM_REPRODUCTION_OUTPUT="$(pwd)/results/container-reproduction"
docker compose -f compose.research.yml run --build --rm reproduce
```

The campaign mount is read-only. The publication bundle and reproduction
report are written under the explicit output mount.

## Rerunning simulation campaigns

Campaign execution and artifact reproduction are separate operations so a
reviewer can inspect the expensive primary computation before deriving paper
files:

```bash
npm run campaign:run -- \
  --campaign-id <new-campaign-id> \
  --config-dir experiments/final \
  --workers 4

npm run reproduce -- \
  --campaign artifacts/campaigns/<new-campaign-id> \
  --profile full
```

Final evidence campaigns require a clean Git worktree. The campaign manifest
records the exact commit, resolved configurations, seeds, replicate indices,
condition identities, runtime, dependency lock hash, and content hashes.

## Integrity interpretation

Two reproductions are byte-identical at the publication layer when their
publication bundle identities match. Campaign identities bind the source and
resolved design; individual run hashes bind the raw outcomes. The reproduction
report records the runtime and the status of every gate but is not itself part
of the deterministic publication bundle.
