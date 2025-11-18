# Example Scenarios

Run any example with:

```bash
npm run examples -- --scenario=<name>
```

`<name>` may be:

| Scenario | Description |
| --- | --- |
| `basic` | Spins up a small DAO (developers, investors, validators) and prints a 100-step progress log. |
| `market-shock` | Enables stochastic shocks plus a deterministic crash/pump schedule to stress the treasury and price oracle. |
| `governance` | Iterates through `majority`, `quorum`, and `supermajority` rules to compare proposal outcomes and delegation behavior. |
| `all` | Runs every scenario sequentially. |

Each script logs key telemetry (token price, treasury balance, approvals/rejections) and returns the `DAOSimulation` instance for further exploration if you import it directly.

## Adding a Scenario

1. Create `examples/<scenario-name>.ts`, export an async `run<ScenarioName>()`, and follow the existing files for structure.
2. Register the new runner inside `examples/run-scenarios.ts`.
3. Document the scenario here and, if needed, add focused Playwright/Vitest coverage.
