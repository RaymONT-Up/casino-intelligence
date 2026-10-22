<!-- run-note-format: v2 -->

# Local containers and SEO indexing switch — 22 October 2026

## Business task

Two owner-selected improvements, delivered as separate commits through `/feature-delivery`:
(1) run the application (web + API) in Docker for local use; (2) technical SEO as a switch,
keeping indexing OFF by default. Independent review by `code-reviewer` for each commit.

## Acceptance criteria

- Docker: no secrets in the image, no registry push or deployment, API not reachable from
  the host, existing `pnpm start` and `docker compose up db` unchanged.
- SEO: default behaviour identical to before (`noindex`, `Disallow: /`); enabled only by the
  exact value `enabled` plus a public https origin; sitemap from published data only; structured
  data from confirmed fields only; no claims such as licensed, safe, best, trusted.
- Separate commits; gates run before each commit; no push.

## Agents

All were real Agent-tool calls from the main session. Durations and tool-call counts are the
figures reported by the harness.

| Agent                    | Scope                                                        | Execution                                      | Notes                |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------- | -------------------- |
| `researcher` (Docker)    | Dockerfile design, compose, secrets, Chromium, API bind host | Parallel with the SEO researcher (one message) | 21 tool calls, ~64 s |
| `researcher` (SEO)       | Switch design, robots/sitemap, JSON-LD, tests                | Parallel with the Docker researcher            | 31 tool calls, ~70 s |
| `code-reviewer` (Docker) | Review of the uncommitted Docker change                      | After implementation and gates                 | 21 tool calls, ~55 s |
| `code-reviewer` (SEO)    | Review of the uncommitted SEO change                         | After implementation and gates                 | 15 tool calls, ~40 s |

## Findings

CONFIRMED (reviewers, code reading):

- Docker review: ready to commit, no high or medium findings. Low items: nested `.env*` files were not
  excluded by `.dockerignore` (fixed); documentation wording about Chromium (fixed); `env_file` gives every
  service all secrets, and the image carries dev dependencies (accepted for a local image).
- SEO review: fix first. Medium: the "public https origin" check was only a four-entry loopback list, so
  private IPs, `*.local`, `*.internal`, single-label hosts and trailing-dot hosts would have switched
  indexing on (`apps/web/lib/seo.ts`). Fixed with a strict DNS-name check and 16 new test cases.
  Also reused the shared directory selection (`apps/web/lib/operators.ts`) instead of a duplicate.

POTENTIAL RISK:

- Known weakness in `apps/api/src/app.ts:36` (admin token hook on the raw URL, encoded path bypasses it)
  is unchanged. It matters more once an API port is exposed, so the compose API service deliberately has no
  host port mapping.
- `layout.tsx` builds `metadataBase` with `new URL(APP_ORIGIN)`, which throws for a malformed value
  (behaviour existed before this change).
- Two robots meta tags appear on the 404 page when indexing is ON (Next's own `noindex` and the root one);
  crawlers apply the stricter one.

NOT VERIFIED:

- `INSTALL_CHROMIUM=true` build and Chromium sandbox as a non-root user.
- Sitemap error path and layout/admin metadata wiring have no automated test in ON mode (verified manually only).
- Compose behaviour in other Docker versions; reverse-proxy or CDN caching of robots/sitemap.

## Human decisions

- Owner chose the two tasks, asked for separate commits and for the independent reviewer to be used.
- Defaults chosen by the coordinator and reported for the owner to revisit: env name `SEO_INDEXING=enabled`;
  invalid or misconfigured value fails closed; sitemap returns an empty list when off and an error when
  misconfigured; JSON-LD limited to `WebPage`/`CollectionPage` with the legal operator as `about`;
  Chromium excluded from the image by default; API not published to the host.
- Commits were made at the owner's request. Push is blocked for the assistant by `.claude/settings.json`.

## Code changes

- Commit `e36ee56` (Docker): `Dockerfile`, `.dockerignore`, `compose.yaml` (`app` profile: migrate, api, web),
  `apps/api/src/server.ts` (`API_HOST`, default `127.0.0.1`), README, `docs/deployment.md`, `.env.example`.
- Commit `3847cce` (SEO): `apps/web/lib/seo.ts`, `json-ld.tsx`, `sitemap.ts`, `robots.ts`, layout metadata,
  admin noindex, JSON-LD on directory and operator pages, `lib/operators.ts` refactor, tests, docs.
- Before these: `9060a91` README expansion (uncommitted edits from earlier work, committed on its own).

## Test results

- Docker (isolated compose project with its own empty database, removed afterwards): `docker build` passed;
  migrate, api, web healthy; `/health` 200, admin without token 401 and with token 200; web to api 200; host
  web 200, API port not reachable from the host; wrong Origin 403, no session 401; runtime user `node`; no
  secret-named variables or `.env` file in the image; without Chromium `fetchSource('northstar-terms')` returns
  an error and empty content. The default compose profile validates without `.env`; the `app` profile reports
  the missing file. `pnpm check`, integration (11) and `pnpm build` passed.
- SEO: production runs against real published data in three modes. Default: `Disallow: /`, empty sitemap,
  `noindex` everywhere. Enabled with a public origin: robots rules, sitemap with 7 URLs and real capture
  time, `index, follow`, JSON-LD only on directory and operator pages, `/admin` noindex. Enabled with a
  loopback origin: fails closed, sitemap returns 500. Final `pnpm verify`: exit 0 (55 unit, 11 integration,
  build, 3 end-to-end).
- Each end-to-end run leaves one `e2e_*` schema in the local database; the count was 13 at the end of this
  work. They were not deleted (owner consent required).
- GitHub Actions: `Quality gates` succeeded for `9e754a8`; runs for the commits above were not checked
  because they have not been pushed from this machine at the time of writing.

## Git diff / commit

Commits: `9060a91` (README), `e36ee56` (Docker), `3847cce` (SEO). This note and a CI status line in
`docs/deployment.md` are committed separately.

## Remaining risks

- Authorization path weakness above remains; keep the API unpublished.
- Enabling indexing in any reachable environment is the owner's release decision.
- E2E schema cleanup bug (disposable schemas accumulate).
