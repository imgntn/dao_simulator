# Simulator Release Readiness Checklist

Use this checklist before assigning A grades under the harder report-card scale.

## Required Commands

Run these commands from the repo root with PowerShell using `npm.cmd`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e:smoke
npm.cmd run test:e2e:report-card
```

## A-Grade Evidence

| Area | Evidence Required |
| --- | --- |
| Performance | `test:e2e:report-card` attaches `performance-budget.json`; health is not `critical`, sim <= 32ms, layout <= 12ms, GPU buffer <= 8ms, render <= 8ms. |
| Rendering Architecture | `renderer-lifecycle.json` shows active renderer count returns to 1 after fallback switch/reset and Three.js memory counters stay bounded. |
| UX | Scenario import test proves invalid JSON feedback, successful import, duplicate update handling, and saved scenario uniqueness. |
| Visual Design | Report-card test attaches screenshots for default, focus, and zoomed Sanctum states and verifies focus mode removes Chronicle clutter. |
| Explainability | `explanation-record.json` includes id, step, confidence, metric deltas, and candidate causes for deterministic replay. |
| Documentation | Current report card references the commands, thresholds, artifacts, and residual risks. |

## Residual Risk Rules

- If an A depends on a manual observation, attach a screenshot or JSON artifact.
- If a budget is changed, update this checklist and the relevant report card in the same commit.
- If a test is flaky, the grade falls back to B until the flake is fixed or the evidence is replaced with a stable check.
