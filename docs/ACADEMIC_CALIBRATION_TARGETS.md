# Academic calibration targets

This document identifies the canonical target artifacts and their interpretation.
It intentionally does not copy numeric targets into prose because copied tables
become stale when source corrections or partition definitions change.

## Canonical artifacts

- Training profiles: `results/historical/validation/train/*_profile.json`
- Held-out profiles: `results/historical/validation/holdout/*_profile.json`
- Raw-source checksums: `results/historical/source-checksums.json`
- Compiler: `python/data_ingestion/compile_calibration.py`
- Temporal validation runner: `scripts/run-calibration-validation.ts`

Every profile contains its inclusive UTC period, partition label, selected row
counts and date ranges, raw-source SHA-256 values, source-quality counts, and
field-level observed/derived/unavailable status.

## Frozen temporal design

- Training/calibration period: 2023-01-01 through 2024-12-31 UTC.
- Held-out evaluation period: 2025-01-01 through 2025-12-31 UTC.
- The training profile may configure simulator parameters.
- The held-out profile may only score predictions.
- Aggregate profiles are diagnostic and cannot support held-out claims.
- A run is invalid if training and evaluation periods overlap.

## Target interpretation

Governance outcome rates use only classifiable terminal outcomes. Snapshot
binary outcomes are reconstructed from weighted yes/no or for/against votes and
must meet the recorded quorum when one exists. Participation uses the fixed
observed-voter denominator defined by the compiler; it is a behavioral proxy,
not token-holder turnout. Proposal cadence includes inactive calendar months.
Protocol, forum, and market targets are period-filtered by their actual UTC
timestamp columns.

Unavailable measurements are represented as `null`, never as plausible-looking
defaults. In particular, the corpus does not currently identify delegation
events or contain an independently sourced ETH benchmark, so delegation rate
and correlation to ETH are unavailable. Voter-cluster majority alignment is
derived from comparable vote records and weighted proposal majorities.

## Required reporting

Publication tables must show per-DAO metric scores and uncertainty, the
historical-persistence null, the paired uncalibrated-simulation null, and both
absolute and normalized skill. Composite scores are secondary and must include
their weights and a weight-sensitivity analysis.

The legacy hand-copied 2024 target table and its obsolete quarterly paths are
preserved only in the immutable legacy archive listed in
`docs/LEGACY_ARTIFACT_INVENTORY.md`.
