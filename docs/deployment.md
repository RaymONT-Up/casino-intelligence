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

The API binds loopback by default (`API_HOST`, default `127.0.0.1`). Local `pnpm start`
runs a production Next build with the API; real collection is restricted to the fixed source allowlist.

## Local containers (not a deployment)

`Dockerfile` and the `app` profile in `compose.yaml` run the migration, API and web in
containers for local use: `docker compose --profile app up --build`. Only the web port is
published, and only on `127.0.0.1` (`WEB_PORT`, default 3000); the API is reachable
inside the compose network. Inside its container the API sets `API_HOST=0.0.0.0`, which is
safe only because no host port is mapped to it. Do not publish it beyond loopback.

Secrets are read from the private `.env` at run time and are not part of the image.
The compose database password `local-demo-only` is for local use only. Chromium is not
installed by default: collecting the NorthStar terms page in the container fails (checked
at the `fetchSource` level, not in the UI) and a failed snapshot is written to the capture
history. Build with `INSTALL_CHROMIUM=true` to include it (browser sandbox behaviour
as root or non-root has not been verified). No image is pushed to a registry.
