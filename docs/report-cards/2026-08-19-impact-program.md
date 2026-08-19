# Impact Program Report Card

- Date: `2026-08-19`
- Base: `origin/main` commit `84dd0618e`
- Scope: first-result activation, research trust, replayability, conversion, interpretation, accessibility, and observability
- Status: `Implemented and verification-ready`

## Current grades

| Area | Grade | Evidence | Remaining A bar |
| --- | ---: | --- | --- |
| First-result activation | A- | Question-first paths, guided wizard, default auto-start, and visible first-result prompt | Fresh visitors reach a meaningful outcome in <=60 seconds in production telemetry |
| Research trust | A- | Public claim registry, exploratory labels, confirmatory workflow, canonical status module | Frozen campaign artifacts are published and independently reviewed |
| Replayability | A- | Configuration/seed links, replay marker, JSON/CSV exports | Shared links are tested for deterministic restoration across browsers |
| Interpretation | A- | Outcome summary on desktop and mobile with deltas and exploratory caveat | Users can compare two runs and understand the tradeoff without opening advanced panels |
| Conversion | A- | Three question cards, evidence CTA, simulator CTA, and existing contact funnel | Weekly funnel review identifies and improves the weakest conversion step |
| Accessibility/performance | A- | Critical Axe scans, reduced motion, 44px controls, LCP buckets, capped renderer | Zero remaining moderate Axe findings and a real Web Vitals dashboard |
| Operations | A- | Coolify production, health checks, smoke gates, analytics hooks | Automated alerting and rollback drill are exercised on a scheduled cadence |
| Overall | A- | High-leverage product and trust improvements are implemented without weakening release gates | Confirmatory evidence and measured user outcomes move the product from A- to A |

## Completed in this pass

- Added `/[locale]/evidence` with a public exploratory claim registry and confirmatory workflow.
- Added question-first homepage paths for participation, capture risk, and shock resilience.
- Added a first-result prompt and default guided-run behavior.
- Added outcome interpretation with participation, inequality, treasury, and event deltas.
- Improved replay-link language and added an explicit replay marker.
- Added privacy-preserving coarse LCP buckets to the existing analytics stream.
- Added a measurement contract in `docs/IMPACT_PROGRAM.md`.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- focused UTF-8 and claim-registry tests
- smoke: 7/7
- report-card: 5/5
- critical accessibility Axe scans: 2/2
