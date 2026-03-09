# DAO Simulator – Experience TODO

These items enhance the “virtual organization” feel of the DAO while keeping it a serious simulator with light game dynamics.

## 1. Organizational Map & Control Surface

- [x] Expand `CozyMap` into an organization/department map (Treasury, Governance, Dev Hub, Market/Risk).
- [x] Represent each area as a tile whose state (healthy, stressed, critical) is driven by live simulation metrics.
- [x] Surface context for each area (treasury runway, governance backlog, market shocks) as short status lines.
- [x] Add a compact “org map” section on the dashboard that lets you read DAO health at a glance.

## 2. Strategy Playbooks / Loadouts

- [x] Introduce a “Strategy” selector separate from technical presets/challenges on the dashboard.
- [x] Define a small set of executive playbooks (Baseline, Risk‑Off Treasury, Growth Mode, Validator Governance, Community‑First).
- [x] Implement each strategy as an overlay on the simulation config (agent mix, governance rule, shock frequency, memberships).
- [x] Display the active strategy in the Scenario card, run history, and run summary.

## 3. Operations & Incident Feed

- [x] Turn the internal `runLog` + market shocks into an “Operations Log” with human‑readable events (snapshot, shock, mission).
- [x] Classify events by severity (info / incident / critical) and style them differently in the UI.
- [x] Highlight shocks and mission completions as notable events in both the dashboard and the summary modal.
- [ ] Group related events into short “incident threads” (e.g., price shock → liquidity move → governance response).
- [x] Timeline annotations — double-click to add notes at specific simulation steps.

## 4. Org History, KPIs & Milestones

- [x] Track cumulative statistics across runs in local storage (total runs, total steps, peak treasury, max shocks in a run, wins/losses).
- [x] Add an “Org History & KPIs” panel to the dashboard summarizing these long‑term stats.
- [x] Show a few simple milestones framed as organizational achievements (first run, 500 steps, treasury > 10,000).
- [ ] Expand the milestone set and add icons/badges for unlocked items.
- [x] Metric threshold alerts with toast notifications for KPI monitoring.

## 5. Outcome Reports & Scenario Templates

- [x] Differentiate outcomes by cause: mission completion, treasury insolvency, token price collapse, governance backlog.
- [x] Feed the outcome cause into `RunSummaryModal` to adjust language and emphasis.
- [x] Include the active strategy in the outcome report for easier comparison between runs.
- [ ] Define a small pool of mission templates aligned with specific presets/strategies and rotate them per scenario.
- [x] What-if branching — fork simulation state and run divergent configs for comparison.
- [ ] Optionally “unlock” new strategy/mission combinations after specific outcomes as new what‑if experiments.

