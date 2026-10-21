# CI/CD status

CI configuration is included; a green GitHub run is not claimed until pushed and run.
`Quality gates` installs a frozen lockfile, migrates a disposable PostgreSQL service,
runs types/lint/format/unit/DB/build/browser checks and preserves browser failure traces.
Set that job as a required branch-protection check; a workflow file cannot enable this.

The manually triggered release workflow builds an artifact. Configure required reviewers
on `release-approval` in GitHub settings. Without this setting the environment name alone
does not enforce human approval. This is release preparation, **not a working remote deployment**.

Before a real deployment: choose hosting, wire an exact approved commit whose full CI
passed, create production authentication, managed DB/secrets, migrations with rollback
strategy, backups, HTTPS, monitoring and a staging smoke test. Fixture routes are disabled in the application server. Never reuse local credentials
for a reachable deployment.

The current API deliberately binds loopback. Hosting this unchanged in separate
containers requires explicit private networking configuration. Local `pnpm start`
runs a production Next build with the API; real collection is restricted to the fixed source allowlist.
