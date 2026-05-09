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
npm.cmd audit --audit-level=moderate
```

## A-Grade Evidence

| Area | Evidence Required |
| --- | --- |
| Performance | `test:e2e:report-card` attaches `performance-budget.json`; health is not `critical`, sim <= 32ms, layout <= 12ms, GPU buffer <= 8ms, render <= 8ms. |
| Rendering Architecture | `renderer-lifecycle.json` shows active renderer count returns to 1 after fallback switch/reset and Three.js memory counters stay bounded. |
| UX | Scenario import test proves invalid JSON feedback, successful import, duplicate update handling, and saved scenario uniqueness. |
| Visual Design | Report-card test attaches screenshots for default, focus, and zoomed Sanctum states and verifies focus mode removes Chronicle clutter. |
| Explainability | `explanation-record.json` includes id, step, confidence, metric deltas, and candidate causes for deterministic replay. |
| Documentation | Current report card references the commands, thresholds, artifacts, security checks, and residual risks. |
| Security | `npm.cmd audit --audit-level=moderate` reports 0 vulnerabilities and GitHub Dependabot has no open alerts for the default branch. |

## Security Check

Run the local npm audit:

```powershell
npm.cmd audit --audit-level=moderate
```

When GitHub CLI is authenticated, verify open Dependabot alerts:

```powershell
gh api 'repos/imgntn/dao_simulator/dependabot/alerts?state=open'
```

If GitHub reports a vulnerability during push but both checks are clear, treat the push message as stale and record the checked timestamp in the relevant report card.

## Residual Risk Rules

- If an A depends on a manual observation, attach a screenshot or JSON artifact.
- If a budget is changed, update this checklist and the relevant report card in the same commit.
- If a test is flaky, the grade falls back to B until the flake is fixed or the evidence is replaced with a stable check.
- If a security alert is open, release readiness falls back to B until the dependency is updated or the alert is confirmed fixed.
