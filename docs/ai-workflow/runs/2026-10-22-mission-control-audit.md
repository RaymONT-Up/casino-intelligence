<!-- run-note-format: v2 -->

# Mission-control setup and publication-boundary audit — 22 October 2026

## Business task

Set up a minimal multi-agent orchestration (coordinator + read-only specialists) in Claude Code
and prove it with a real run: "can unverified data reach a public Casino Intelligence page?".
Application code, migrations and external sources were out of scope for this run.

## Acceptance criteria

- Reuse existing agents and `/feature-delivery`; no duplicates, nothing removed.
- Add `data-integrity-auditor` (read-only), `/mission-control`, project permissions, run-note template.
- Run two independent read-only agents in parallel, then an independent critic.
- Findings labelled CONFIRMED / POTENTIAL RISK / NOT VERIFIED with file:line evidence.
- Stop for the owner's approval before changing anything in the application.

## Agents

All agents were real Agent-tool calls from the main Claude Code session (Sonnet 5.5).
Durations and tool calls are the figures the harness reported.

| Agent                            | Scope                                                                   | Execution                                                                          | Notes                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `claude-code-guide`              | Verify current permissions / agent / skill syntax against official docs | Alone, before configuration was written                                            | 12 tool calls, ~90 s. Some points it could not confirm (listed below).                     |
| `researcher` (run 1)             | API, auth and publication path                                          | Alone                                                                              | 16 tool calls, ~53 s. Ran alone because its partner failed to start.                       |
| `data-integrity-auditor` (try 1) | DB integrity                                                            | Launched in the same message as researcher run 1                                   | **Failed to start**: "Agent type ... not found" (agent not yet registered in the session). |
| `data-integrity-auditor` (try 2) | PostgreSQL schema, triggers, transactions, pointer                      | **Parallel** with researcher run 2 (one message, two Agent calls, both background) | 11 tool calls, ~42 s.                                                                      |
| `researcher` (run 2)             | API, auth, publication path, full `service.ts`, `tests/e2e/server.ts`   | **Parallel** with the auditor                                                      | 19 tool calls, ~45 s.                                                                      |
| `code-reviewer` (critic)         | Independent critique of the consolidated findings                       | Sequential, after both                                                             | 9 tool calls, ~49 s.                                                                       |

Parallelism is claimed only for the auditor (try 2) and researcher (run 2): they were started in one
assistant message and both ran in the background. Exact overlap in time was not measured.
The coordinator also ran two in-memory probes itself (below).

## Findings

Labels follow the critic's calibration where it disagreed with the first reports.

### CONFIRMED DEFECT

| Severity                             | file:line                | Observation                                                                                                                                                                                     | How verified                                                                                                                                                                                                                                                                                                                                 | Not verified                                                                                                                     |
| ------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| High (contract) / Medium (practical) | `apps/api/src/app.ts:36` | Token check tests the raw `req.url.startsWith("/admin/")`; Fastify decodes the path. `/%61dmin/...` skips the hook and reaches the `/admin/...` routes. Includes `POST /admin/research-review`. | **Runtime**: in-memory `buildApp(...).inject` with a DB stub that throws when touched (no network, no `.env`). `POST /admin/research-review` no token → 401; `GET /%61dmin/research` → 500 and DB accessed; `POST /%61dmin/research-review` no token, invalid body → 400 from Zod (handler reached). `//admin`, `/ADMIN`, `/admin%2F` → 404. | A full unauthenticated approval against a real DB (not attempted). Reachability beyond 127.0.0.1 (`server.ts:6` binds loopback). |

### CONFIRMED (code reading)

- `packages/database/003_research.sql:1,3,4,7-9`: no trigger on `research_sources` or `research_proposals`;
  `current_capture_id` only has an FK; proposal columns are updatable; status has only a CHECK.
  `docs/architecture.md:26` ("only status changes") is a convention, not enforced by the schema.
  Critic: low–medium, it needs direct DB credentials and hardens against bugs rather than attackers.
- `packages/research/service.ts:301-315,324`: the public read joins pointer → approved proposal →
  approved decision, so a pointer at a pending/rejected capture publishes nothing (a real second layer).
  Holes: no `proposals.sourceId = sources.id` / `captures.sourceId` check; `errors`/`payload` not rechecked (`payload!`).
- Only `reviewResearch` writes `currentCaptureId` (`service.ts:226-230`); lock order and rollback are covered by
  `tests/integration/research.test.ts:114-160`. Both researcher runs and the critic found no unapproved-data path
  through the application interface other than the auth bypass above.
- Demo routes are off in production (`server.ts:4`, `app.ts:104`).

### POTENTIAL RISK

- Login limiter is process-global (`apps/web/app/api/editor/route.ts:9`); `inFlight` is per process (`service.ts:159`).
- Constant actor `local-editor` (`app.ts:100`): audit cannot show who approved.
- Deny-by-prefix auth: any future route outside `/admin/` is public by default.
- Migrations have no checksum (`migrate.ts:11-22`); row triggers do not fire on TRUNCATE.

### NOT VERIFIED

- Collector SSRF / allowlist (`fetch.ts`) in this run; DB roles and grants; CSRF at runtime;
  whether any proxy exposes port 4000; Read-deny behaviour for `.env` (see Test results).

### Corrections made by the coordinator

- Researcher run 1 listed `//admin/` and `/ADMIN/` as possible bypasses; the probe showed only the
  percent-encoded form works. The auditor's HIGH labels on schema gaps were lowered by the critic.
- `claude-code-guide` could not confirm that single-message parallel Agent calls run concurrently
  or that Read-deny applies to subagents; the run above is the only evidence for the former.

## Human decisions

- Owner defined the task, boundaries (no app changes, no migrations, no external sources, no commit) and
  authorized creating Claude configuration and documentation files.
- Owner approval of the proposed improvement: **pending** at the time of this note.

## Code changes

Configuration and documentation only; no application code.
New: `.claude/agents/data-integrity-auditor.md`, `.claude/skills/mission-control/SKILL.md`,
`.claude/settings.json` (permissions.deny only), `docs/ai-workflow/runs/_TEMPLATE.md`, this note.
Changed: `scripts/check-agents.mjs`, `CLAUDE.md`. Presentation and training documents were written
during the run but kept outside the repository (moved to the owner's desktop at the owner's request).

## Test results

- `pnpm check` (agents, types, lint, format, 21 unit tests): PASSED.
- `.claude/settings.json` deny: a `git push --dry-run` call was blocked by the harness before running
  ("Permission ... has been denied"), so the Bash rule is loaded. The `Read(./.env)` rule was **not**
  tested, to avoid opening a real secret. Bash and Read deny rules are not a security boundary
  (bypass via `git -C . push`, `sh -c`, other tools); a sandbox or hook is needed for hard guarantees.
- `/mission-control` skill file exists and passes `agents:check`; the skill itself was not invoked in this run.
- E2E and `pnpm verify` were not run (no application change; avoids leaking another `e2e_*` schema).
- CI was never executed on GitHub.

## Git diff / commit

Uncommitted when written: `git status` showed 2 modified files (`CLAUDE.md`, `scripts/check-agents.mjs`) and
5 untracked entries (the agent file, `.claude/settings.json`, the `.claude/skills/mission-control/` directory,
`_TEMPLATE.md` and this note). Last commit: `316dbc0`. A pre-commit review by `code-reviewer` followed;
its required documentation fixes were applied before committing.

## Remaining risks

- The auth bypass is unfixed pending owner approval. Proposed fix: default-deny hook using the matched
  route (`req.routeOptions.url`) with a public allowlist (`/health`, `/research`), plus tests for encoded paths,
  a wrong token, and no DB access. Follow-ups: `sourceId` equality in `publishedResearch`; a trigger guarding
  `research_proposals` and the pointer.
- `data-integrity-auditor` was not registered at session start and appeared only later.
