# Claude Code entry point

@AGENTS.md

Use project agents in `.claude/agents/` and `/feature-delivery`.
Before implementation, read `docs/architecture.md` and the relevant tests.
Researcher and code-reviewer have read-only tool allowlists. Main session implements.
Never treat a subagent's approval as permission to deploy or spend money.
Record actual work in `docs/ai-workflow/runs/`; distinguish plans from executed evidence.
The local product contains no live LLM integration; report `NOT_CONFIGURED` accurately.
