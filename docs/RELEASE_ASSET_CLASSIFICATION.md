# Release Asset Classification

**Status:** Pre-release classification; external publication remains approval-gated.

| Asset class | Intended release | Conditions |
|---|---|---|
| Simulator source and tests | Public | Secret scan, dependency-license review, publication tag |
| Experiment configurations and metric registry | Public | Frozen versions corresponding to the paper |
| Campaign manifests, derived tables, and figures | Public | Verified hashes and claim-registry linkage |
| Raw synthetic simulation runs | Public artifact deposit | Storage budget, checksums, durable archive |
| Calibration transformation code | Public | Source licenses and attribution documented |
| Historical raw governance inputs | Conditional | Release only where source license permits redistribution |
| Derived calibration profiles | Conditional | Confirm source licenses and remove restricted source payloads |
| LLM prompts and response caches | Conditional | Model/provider terms, privacy scan, and size review |
| Legacy corrupted/dummy campaign | Not a paper artifact | Retain locally as historical diagnostic evidence |
| Credentials, local environment files, absolute private paths | Never | Remove and scan repository history and release bundle |

No repository, dataset, artifact, or manuscript is externally released until the final release audit passes and James explicitly approves publication.
