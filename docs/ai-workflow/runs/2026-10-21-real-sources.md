# Real-source vertical slice — 21 October 2026

Implemented real source adapters for iGaming Ontario directory and NorthStar
homepage/terms. Collected five real operator identities and two operator documents.
Stored raw captures, SHA-256, original URLs, extraction versions, errors and review
history in PostgreSQL. Removed fictional offer fixtures from public application routes.

Local initial decisions were recorded as **AI-assisted source review (Codex)**,
not as human editorial approval. No external deployment or owner release approval
is implied. Older extractions were retained and explicitly rejected as superseded.

## Independent review

Read-only reviewer `review_real_sources` found:

1. Saved text unavailable to editor: fixed with authenticated on-demand text evidence
   for both proposal and baseline; rendered as escaped React text, never executable HTML.
2. Failed captures not immediately visible: workspace now refreshes in finally.
3. Published URL read from mutable configuration: now comes from saved observation.

Reviewer rechecked fixes and reported no remaining material findings in reviewed changes.
Prior review also prompted private-address and browser routing checks, preserving old
referenced evidence beyond the recent-capture window, exact text offsets and content hashes.

## Executed checks

- `pnpm collect:real`: all three configured sources captured without errors.
- `pnpm verify`: passed after review fixes, including agent contracts, TypeScript,
  ESLint, formatting, 18 unit tests, 11 real PostgreSQL integration tests,
  production Next.js build and 2 Playwright end-to-end tests.
- Browser tests use isolated schemas and controlled source inputs, not casino network calls.
- Initial factual evidence independently inspected in saved captures before local decisions.

The agent-contract gate checks project files, not Claude installation or execution.
No live LLM extractor, paid API, scheduling service, affiliate agreement or deployment
was configured. Production egress isolation, authentication, permissions to republish
source material, province-specific checks and operational monitoring remain owner decisions.
