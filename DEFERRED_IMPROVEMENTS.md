# Deferred Improvements

These items are intentionally outside the normal local verification loop because they require long-running experiments, GPU/model workloads, production credentials, or live external services.

## Long-Running / GPU / Model Work

- Finish the paused `12b` big-tier LLM experiment and regenerate the affected paper prose.
- Run GPU-backed neural-network or RL sweeps that require extended training time.
- Run full LLM agent benchmark comparisons across Ollama model tiers.
- Regenerate heavyweight charts, media, or paper assets that depend on local model or image pipelines.

## External Service Validation

- Add Redis and PostgreSQL integration tests using CI services or a Docker Compose test profile.
- Add production deployment smoke checks after a real deploy target is available.
- Add email delivery verification against a sandbox SMTP provider.
- Add Sentry/OpenTelemetry export validation once a real collector endpoint is configured.

## Scheduled CI Work

- Add load tests for simulation create/step/export endpoints with realistic Redis/Postgres backing.
- Add browser performance budgets for WebGL startup, worker throughput, and long-running simulation sessions.

## Dependency Migrations

- Evaluate major upgrades separately: ESLint 10, TypeScript 6, Zod 4, `@types/node` 25, and Auth.js/NextAuth stable migration paths.
- Run compatibility tests for React Three Fiber, Drei, Three.js, Recharts, and Playwright updates in isolated PRs.
