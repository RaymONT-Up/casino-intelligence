# Casino page title from display name — 22 October 2026

First feature delivered through Claude Code subagents in this repository (`/feature-delivery`).
Earlier runs in this directory were Codex workflows. Implementation was done by the
main Claude Code session (model: Sonnet 5.5). Nothing is committed, pushed or deployed.

## Task

`generateMetadata` in `apps/web/app/casinos/[slug]/page.tsx` used the URL slug as the
HTML title. Use the brand display name from existing data. Out of scope by owner
instruction: robots/noindex/indexing rules, sitemap, JSON-LD.

## Subagents that actually ran

Both were launched with the Agent tool from the main session, each with only the
`Read, Glob, Grep` allowlist from `.claude/agents/`.

| Agent           | Duration / tool calls | Result                                                                                                                                         |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `researcher`    | ~43 s, 14 tool calls  | Located the bug (`page.tsx:6-13`), proposed a React `cache` wrapper plus `operator.name` as title and e2e assertions. Reported it ran nothing. |
| `code-reviewer` | ~39 s, 14 tool calls  | No blocking bug. One possible scope-creep note (canonical), several low-severity coverage notes. Reported it ran nothing.                      |

Main-session corrections to researcher output: it did not find `vitest.config.ts`
(it exists; unit tests are `vitest run tests/unit`), and it could not confirm fetch
memoization with `cache: "no-store"`, which is why `cache` from React is used.

## Owner decisions

1. Approved the plan after the research phase (explicit message).
2. Authorized terminating the local dev processes that blocked E2E. The main session
   ended PIDs 93672 (`next-server`), 93671 (API) and 93659 (their parent launcher).
   93659 was the wrapper of the same dev server; the owner's wording
   was "завершить процесс".
3. Did not authorize commit, push, deployment or deleting `e2e_*` schemas.

## Changes

- `apps/web/app/casinos/[slug]/page.tsx`: `cache`-wrapped `/research` request shared by
  metadata and page; title is `operator.name` (brand only); unknown slug or missing
  directory calls `notFound()`. Page body uses `findOperator`. Canonical entry unchanged
  (it already existed in HEAD at line 12).
- `apps/web/lib/operators.ts` (new): `findOperator(records, slug)`, type-only import.
- `tests/unit/operators.test.ts` (new): 3 tests (brand vs legal operator, unknown slug,
  empty/document-only data).
- `tests/e2e/review.spec.ts`: title `Bet99 · Casino Intelligence`; `/casinos/unknown-slug`
  returns 404 and its title does not contain the slug.
- Not touched: `robots.ts`, `layout.tsx`, indexing rules.

Tracked-file diff (`git diff --stat`): 2 files changed, 17 insertions, 6 deletions;
plus 2 new untracked files.

## Commands and outcomes

- `pnpm check`: passed; 21 unit tests (previously 18).
- First `pnpm test:e2e`: **blocked** — "Another next dev server is already running"
  (PID 93672, port 3000). Not an application failure.
- After the processes were ended: `pnpm test:e2e` 2 passed.
- `pnpm verify` (exit 0): agent contracts, types, lint, format, 21 unit, 11 PostgreSQL
  integration, production build, 2 Playwright E2E passed.
- No code changed after `pnpm verify`.

## Reviewer findings and handling

- Scope creep (low): canonical on the detail page. Checked against HEAD — it was already
  present, so no change was made.
- Coverage (low), not fixed: no test calls `generateMetadata` directly (title is covered
  only by E2E); duplicate directory records not tested; the 404 title assertion only
  checks the slug is absent, not the exact fallback title.
- Residual: very long brand names would give a long title; the reviewer could not read the
  Next 16 docs on `notFound()` in streamed metadata. Evidence for the 404 behaviour is the
  passing E2E assertion only.

## Remaining problems

- Each successful E2E run leaves a schema `e2e_*` in the local database: 9 before this
  work, 11 after two successful runs. The cleanup in `scripts/e2e-server.mjs` is not
  reliable. Schemas were not deleted (awaiting owner consent).
- Changes are uncommitted. No remote or green CI run exists.
- Real source collection was not run; the feature reads already published data.

## Owner decisions outstanding

Commit this change; delete the `e2e_*` schemas; fix E2E schema cleanup; whether to add a
direct `generateMetadata` test.
