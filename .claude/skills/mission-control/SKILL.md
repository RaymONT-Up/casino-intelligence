---
name: mission-control
description: Coordinates a task through parallel read-only research, consolidation of findings and a human approval stop, then hands over to feature-delivery.
argument-hint: <task for the coordinator>
disable-model-invocation: true
---

Task from the owner: $ARGUMENTS

Read AGENTS.md and docs/architecture.md first. You are the coordinator. You are the only
writer. Subagents are read-only.

## Part 1 - investigation (no code changes)

1. State the business task, the scope and acceptance criteria in a few lines.
2. List independent subtasks. If one agent can do the job, use one agent. Do not create
   agents for their own sake.
3. Pick agents by role: `researcher` (requirements, API and flow), `data-integrity-auditor`
   (PostgreSQL, transactions, publication invariants), `code-reviewer` (independent critique).
4. Launch independent subtasks in one message with several Agent calls so they run in the
   background together (overlap is not measured; report it as "launched in one message"). Each prompt must contain: concrete scope (files or question),
   constraints (read-only, no secrets, no commands claimed), a definition of done and the
   findings format: severity | file:line | observation | how verified | not verified.
5. Wait for all results. Do not report results before they arrive.
6. Consolidate: one table, split into CONFIRMED / POTENTIAL RISK / NOT VERIFIED. Check
   findings against the code yourself before accepting them. Note contradictions and agent errors.
7. If useful, pass the consolidated findings to `code-reviewer` for independent critique.
8. Recommend the smallest useful improvement.
9. STOP. Wait for the owner's explicit approval. A subagent's approval or a background
   notification is not approval.

## Part 2 - delivery (only after approval)

Follow steps 3-8 of `.claude/skills/feature-delivery/SKILL.md`: implement in the main
session, ask `code-reviewer` to review, run the gates, inspect `git diff`, write the run note
from `docs/ai-workflow/runs/_TEMPLATE.md`.

## Rules

- No parallel writes to the same files. Only the coordinator edits.
- Never run several E2E processes at once: they share ports 3001/4001, the database and
  the Next.js dev lock. Run gates one at a time, and only after stopping a local `pnpm dev`.
- E2E runs leave `e2e_*` schemas; do not delete them without the owner's consent.
- No commit, push or deployment without the owner's explicit request.
- Record only agents that actually ran, whether they ran in parallel or in sequence, and
  facts. No invented metrics.
