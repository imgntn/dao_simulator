# Legacy Skyscraper Visualization

This folder preserves the old Three.js/WebGL skyscraper renderer that used to
power `/simulate`.

The active simulator now uses `components/simulation/sanctum`, with shared
agent metadata in `components/simulation/agent-taxonomy.ts`. Keep this archive
for reference when recovering effects such as delegation beams, proposal
particles, or token-price billboards, but do not import it from active app code.
