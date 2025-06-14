# Event Engine

The event engine lets you script market shocks, marketing campaigns and other
changes outside of the normal agent behaviour. Provide a YAML or JSON file with
a list of events:

```yaml
- step: 0
  type: market_shock
  severity: 0.25
- step: 10
  type: marketing_campaign
  campaign_type: recruitment
  budget: 100
  recruits: 3
- step: 5
  type: create_proposal
  title: Upgrade
```

Each entry requires a `step` field which matches the simulation step number and a
`type` describing the action. Supported event types are:

- `market_shock` — calls `DAOSimulation.trigger_market_shock` with the optional
  `severity` parameter.
- `marketing_campaign` — runs one of the marketing campaign classes. Specify
  `campaign_type` as `social_media`, `demand_boost`, `recruitment` or
  `referral_bonus`. Optional parameters like `budget`, `recruits`, `price_boost`
  and `bonus` map directly to campaign constructor arguments.
- `create_proposal` — generates a simple proposal at the given step. The optional
  `title` prefix is used when naming the proposal.

Pass the file path to `DAOSimulation(events_file="path.yaml")` or use the
`--events-file` argument on the CLI. Events are checked each step before agents
act, allowing scripted scenarios or external influences.
