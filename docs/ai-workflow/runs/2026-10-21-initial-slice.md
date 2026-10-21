# Initial vertical slice — actual development record

## Authorization and roles

The owner explicitly requested a TypeScript prototype and Claude Code workflow,
rules, quality gates and CI/CD preparation. Main Codex session implemented the code.
The independent Codex agent `/root/phase0_review` supplied acceptance criteria and
later inspected actual code read-only. It did not modify files.

This is evidence of a **Codex** workflow. Claude Code was not installed or authenticated
in the environment; no Claude execution or live LLM extraction is claimed. Project
Claude agents and skill are configured and their file contracts are checked locally.

## Research outcomes

Use one stable publication scope, lock the casino row, make approvals atomic, preserve
unchanged field provenance, retain unknown states and distinguish observation identity
from semantic proposal identity. Bootstrap decisions must be explicitly simulated.

## Independent findings and fixes

1. Repeating a semantically deduplicated capture lost its proposal reference.
   Added immutable capture_results and migration 002; added regression assertion.
2. Browser tests depended on live demo state and could not repeat rejected proposals.
   Added an isolated E2E schema and dedicated API/web ports; cleanup removes only the
   generated test schema. The user's demo history is preserved.
3. The browser proxy converted backend errors including conflict 409 into 400.
   Added typed ApiError and preserve upstream status; malformed JSON remains 400.

The reviewer then hit its account usage limit. Final re-review was not completed.
The main session corrected the reported findings and ran the automated checks.

## Execution evidence

- First unit run: 10 passed. First real PostgreSQL run: 9 passed.
- Production build compiled successfully; public pages render on request.
- Initial browser run exposed a missing Chromium installation; downloaded the
  matching Playwright browser before retrying. This was not an application pass.
- Final checks: typecheck, ESLint, Prettier and agent contracts passed; 11 unit tests
  and 9 PostgreSQL integration tests passed; production build passed.
- Final Playwright rerun: 2 passed (4.9s), including full approval/rejection/invalid
  input journey and origin/session enforcement. Fixed ambiguous accessible select
  names discovered in the first browser journey. Screenshots were visually inspected.
- The full verify command initially stopped on the browser locator failure. After
  the fix, check/build and E2E passed separately; no green remote CI run is claimed.

## Owner decisions still outstanding

Review the code and architecture; authenticate Claude Code for a live Claude session;
select a repository remote and hosting before claiming GitHub CI or deployment ran.
Release workflow builds an artifact only; no remote deployment has occurred.
