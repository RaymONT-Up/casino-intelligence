---
name: feature-delivery
description: Delivers a bounded Casino Intelligence feature through research, implementation, verification and independent review.
disable-model-invocation: true
---

Read AGENTS.md and docs/architecture.md. Use the user's requested feature as scope.

1. Ask the researcher subagent to inspect affected files and propose acceptance tests.
2. Present a short implementation plan. Continue if scope is already authorized;
   otherwise obtain the owner's agreement before expanding scope.
3. Implement in the main session. No competing writers or unexplained dependencies.
4. Run `pnpm check`; run PostgreSQL and browser tests for behavioral changes.
   Publication/auth changes require `pnpm verify`.
5. Ask code-reviewer to independently inspect the changed files and gate evidence.
6. Fix material issues. Run the affected checks again.
7. Save a factual run note under docs/ai-workflow/runs with task, files, commands,
   outcomes, reviewer findings, fixes and outstanding owner decisions.
8. Show the result and concise diff explanation. Stop before merge/deployment unless
   that exact action has already been authorized.

Do not fabricate agent execution, CI results, screenshots or test success.
If Claude is unauthenticated, report the limitation; do not substitute fake output.
