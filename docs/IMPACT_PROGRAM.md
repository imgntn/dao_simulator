# Impact program

This is the measurement contract for the next product pass. It keeps feature work tied to user value and research trust.

## Primary outcomes

| Outcome | Event or check | Initial target |
| --- | --- | ---: |
| First meaningful result | Guided scenario opened, simulation started, outcome summary viewed | 60 seconds or less for a fresh user |
| Reproducibility | Replay link contains the full scenario configuration and seed | 100% of shared links restore the same setup |
| Research trust | Evidence registry page and claim statuses are visible | Every legacy claim marked exploratory |
| Conversion | Simulator, evidence, and consulting CTA events | Baseline first, then improve the weakest path weekly |
| Performance | Coarse LCP buckets plus production health checks | No regression to the current healthy release |
| Accessibility | Critical Axe scan, keyboard, zoom, reduced motion, 44px targets | Zero critical violations |

## Product decisions already made

- The public site will not call legacy findings confirmed, causal, or forecasting evidence.
- Guided scenarios default to starting immediately after the user applies one, while advanced tuning remains available.
- Replay links are configuration-first and privacy-preserving; no personal content or server-side result storage is required for the first version.
- Exploratory results are useful for hypothesis formation; claim status changes only after a verified confirmatory campaign.

## Next measurement pass

Review these aggregates weekly from the protected analytics report: `guided_scenario_opened`, `simulation_started`, `outcome_summary_viewed`, `share_config`, `evidence_registry_opened`, `booking_submitted`, and `web_vital_lcp_*`.
