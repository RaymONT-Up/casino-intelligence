import { readFileSync, readdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
for (const name of ["researcher", "code-reviewer", "data-integrity-auditor"]) {
  const text = readFileSync(`.claude/agents/${name}.md`, "utf8");
  assert.match(text, new RegExp(`name: ${name}`));
  assert.match(text, /^tools: Read, Glob, Grep$/m);
  assert.doesNotMatch(text.split("---")[1], /Bash|Write|Edit/);
}
for (const name of ["feature-delivery", "mission-control"]) {
  const skill = readFileSync(`.claude/skills/${name}/SKILL.md`, "utf8");
  assert.match(skill, /disable-model-invocation: true/);
}
assert.match(readFileSync("CLAUDE.md", "utf8"), /@AGENTS.md/);
const settings = JSON.parse(readFileSync(".claude/settings.json", "utf8"));
const deny = settings.permissions?.deny ?? [];
for (const rule of ["Read(./.env)", "Bash(git push *)"])
  assert.ok(deny.includes(rule), `settings.json must deny ${rule}`);
assert.ok(
  !deny.some((rule) => rule.includes(".env.example")),
  ".env.example must stay readable",
);
const runs = "docs/ai-workflow/runs";
const unchecked = [];
for (const file of readdirSync(runs).filter((name) => name.endsWith(".md"))) {
  const text = readFileSync(`${runs}/${file}`, "utf8");
  if (file.startsWith("_")) continue;
  if (!text.includes("run-note-format: v2")) {
    unchecked.push(file);
    continue;
  }
  for (const heading of [
    "## Business task",
    "## Acceptance criteria",
    "## Agents",
    "## Findings",
    "## Human decisions",
    "## Code changes",
    "## Test results",
    "## Git diff / commit",
    "## Remaining risks",
  ])
    assert.ok(text.includes(heading), `${file} lacks "${heading}"`);
}
for (const file of [
  "AGENTS.md",
  "docs/architecture.md",
  ".github/workflows/ci.yml",
  `${runs}/_TEMPLATE.md`,
])
  assert.ok(existsSync(file), file);
if (unchecked.length)
  console.log(
    `Run notes without format v2 were not checked: ${unchecked.join(", ")}`,
  );
console.log(
  "Agent file contracts valid. This does not prove Claude runtime discovery or execution.",
);
