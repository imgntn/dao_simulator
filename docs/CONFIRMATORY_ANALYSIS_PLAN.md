# Frozen Confirmatory Analysis Plan

Status: frozen before the final confirmatory campaign. Pilot-driven amendments must be appended to the deviation log and must not overwrite this file after a campaign manifest is created.

The complete developmental-pilot evidence and endpoint decisions are recorded
in [`PILOT_DECISION_LOG.md`](PILOT_DECISION_LOG.md).

## Scope and experimental unit

The primary experimental unit is one simulation replicate identified by its immutable seed. Conditions in an experiment use the same ordered seed schedule. Comparisons therefore operate on within-seed differences, not independent condition means. A DAO is a grouping factor when results are pooled across calibrated DAO profiles.

## Primary estimands

1. RQ1 quorum response: mean paired change in proposal completion rate relative to the declared reference quorum.
2. RQ2 capture mitigation: factorial main and two-way interaction effects on the top token-holding decile's share of cast proposal vote weight.
3. RQ3 proposal pipeline: factorial main and two-way interaction effects on median time to decision, with unresolved proposals retained in the completion outcome.
4. RQ4 treasury resilience: factorial main and two-way interaction effects on maximum peak-to-trough treasury drawdown, with survival, recovery time, and conservation error as secondary outcomes.

The RQ2 and RQ4 primary outcomes were amended on 2026-07-17 after the
developmental pilot—but before confirmatory execution—because their original
endpoints were structurally degenerate (all-zero delegation HHI and all-one
treasury survival, respectively). The amendment, source-run hashes, and
reanalysis artifacts are retained in the publication evidence trail.

Each experiment configuration declares one primary outcome, a smallest effect of interest, its unit and rationale, its comparison family, and its experimental unit. Secondary outcomes are interpreted as secondary; all other recorded metrics are exploratory diagnostics.

## Estimation and uncertainty

- Two-condition contrasts use seed-paired mean differences, Student-t 95% confidence intervals, deterministic percentile-bootstrap intervals, Cohen's dz, and a paired sign-flip randomization test.
- Factorial studies use ordinary least squares containing all declared main effects and all estimable two-way interactions. Coefficients, standard errors, t tests, confidence intervals, adjusted R-squared, residual skewness, and Cook's-distance influence flags are reported.
- Cross-DAO summaries report DAO-specific estimates and a random-effects meta-analysis with between-DAO variance and I-squared. DAO identity is never discarded by concatenating runs.
- Raw condition values and raw paired differences are retained in the analysis artifact.

## Multiplicity and post-hoc rules

Confirmatory primary contrasts within an analysis family use Holm family-wise error control at alpha 0.05. Secondary/exploratory families use Benjamini-Hochberg false-discovery-rate control and are labeled accordingly. Pairwise post-hoc contrasts for a factorial factor are only interpreted after its predeclared omnibus/model term passes the applicable corrected threshold.

## Practical importance

Every confirmatory analysis reports statistical uncertainty and practical importance separately. A result is practically important only when its 95% interval lies wholly beyond the predeclared smallest-effect threshold. A result is practically equivalent only when its 95% interval lies wholly inside the symmetric practical-equivalence interval. All other results are inconclusive with respect to practical importance.

## Missingness, failures, retries, and exclusions

Non-finite outcomes are scientific failures and are never replaced or coerced to zero. Analysis artifacts list expected, completed, failed, missing, retried, excluded, and finite counts. A paired comparison uses only seeds present and finite in both conditions and reports every unmatched or excluded seed. Infrastructure retries retain their original run identity and diagnostics. Exclusions require a stable reason code and an appended deviation record.

## Robustness and assumptions

Primary paired estimates are accompanied by a sign-flip test and bootstrap interval. Factorial outputs include residual skewness and influential-row diagnostics. Strong skew, boundary mass, zero inflation, influential observations, or disagreement between parametric and robust results triggers a documented robustness analysis, not silent model replacement.

## Pilot power and freeze rules

Final replicate counts are calculated from pilot paired-difference variance and the predeclared smallest effect of interest, targeting at least 80% power at two-sided alpha 0.05. Complex factorial and hierarchical designs additionally use simulation-based power before final freeze. Pilot results may change replicate counts, remove non-varying factors, or refine clearly invalid outcomes; each change must be recorded in the deviation log. Confirmatory models, outcomes, contrast families, and corrections freeze when the final campaign manifest is created.

## Reproducibility

The paper generator and Evidence workbench consume the same versioned analysis artifact produced by `lib/research/confirmatory-analysis.ts`. UI components do not recompute inferential statistics. Tables, figures, claim records, and manuscript values must resolve to verified raw runs, a campaign manifest, metric-registry versions, and the frozen analysis-plan hash.
