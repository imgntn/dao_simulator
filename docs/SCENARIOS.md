# Scenario Tutorial Format

Tutorial scenarios guide new users through the simulation by defining a series
of objectives. Each objective tracks a simple metric and is marked as completed
once the threshold is reached.

Create a YAML or JSON file containing a list of steps:

```yaml
- description: Submit your first proposal
  metric: proposal_count
  threshold: 1
- description: Reach two simulation steps
  metric: step
  threshold: 2
```

Supported metrics are:

- `step` – current simulation step number
- `proposal_count` – total proposals created
- `approved_proposals` – proposals with status `approved`
- `member_count` – number of DAO members
- `project_count` – number of active projects
- `token_price` – current DAO token price
- `guild_count` – number of guilds created

Place the scenario file path in the `scenario_file` option when creating
`DAOSimulation` or pass `--scenario-file` to the CLI. Progress is published via
the `scenario_progress` event and shown on the web dashboard.

### Example Guild Scenario

```yaml
- description: Form your first guild
  metric: guild_count
  threshold: 1
```

