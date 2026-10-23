<!-- run-note-format: v2 -->

# Readable capture failure messages — 2026-10-22

## Business task

Collection history showed `fetch failed` (northstar-home, igo-directory) and a multi-line
Playwright "Executable doesn't exist" banner (northstar-terms). The cause was not visible.
Scope: make failed-capture messages diagnostic. No change to what is captured or published.

## Acceptance criteria

- Failed HTTP capture shows the network cause code, e.g. `fetch failed (ENOTFOUND)`.
- Playwright launch failure is stored as one line.
- Cause message (may hold hosts/paths) is not stored; plain messages are unchanged.
- No change to ingestion, proposals or publication.

## Agents

| Agent           | Scope                                                  | Execution  | Notes                |
| --------------- | ------------------------------------------------------ | ---------- | -------------------- |
| researcher      | tests, error consumers, docs, design proposal          | sequential | read-only            |
| code-reviewer   | changed files and gate evidence (did not run any code) | sequential | no material findings |
| Bugbot          | uncommitted release diff                               | sequential | no bugs found        |
| security-review | uncommitted release diff                               | sequential | tool failed twice    |

## Findings

CONFIRMED (researcher, from source): `Observation.error` is stored in `captures.errors` and
`observation` jsonb with no length limit; non-empty errors yield no proposal.
The Playwright failure is a missing browser in the container: `INSTALL_CHROMIUM` defaults to false.

POTENTIAL RISK (reviewer): first message line can contain an absolute local path (Playwright
executable path); low severity, local prototype. Truncation at 300 chars can cut the appended code.

NOT VERIFIED: actual cause of the two `fetch failed` captures (needs a new capture to show the code);
undici/Playwright wording across versions; timeout paths through `fetchSource` are untested.

## Human decisions

Owner asked to fix the problem. Open: redact absolute paths? Address the silent route catch at
`fetch.ts` (sub-request failures hidden)? Rebuild image with `INSTALL_CHROMIUM=true`?

## Code changes

- `packages/research/errors.ts` (new): `describeCaptureError`.
- `packages/research/fetch.ts`: both catch blocks use it.
- `tests/unit/capture-error.test.ts` (new): 8 offline tests.

## Test results

- `pnpm check`: passed, 5 files / 63 tests.
- `pnpm test:integration`: passed, 2 files / 11 tests.
- `pnpm build`: passed.
- `pnpm test:e2e`: passed, 3 tests. The first `pnpm verify` attempt was blocked by an
  existing Next dev server; after stopping that project process, the full rerun passed.
- `pnpm verify`: passed on 2026-10-23.
- No real captures were re-run.

## Git diff / commit

Prepared for the public repository release commit.

## Remaining risks

Old immutable failure rows keep old text. Root cause of the HTTP failures is still unknown until a new capture.
The dedicated security-review subagent failed to load its model context twice; a local tracked-file
scan found no `.env`, private-key material or common token patterns, but is not a full security review.
