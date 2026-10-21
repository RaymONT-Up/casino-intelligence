import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
for (const name of ["researcher", "code-reviewer"]) {
  const text = readFileSync(`.claude/agents/${name}.md`, "utf8");
  assert.match(text, new RegExp(`name: ${name}`));
  assert.match(text, /^tools: Read, Glob, Grep$/m);
  assert.doesNotMatch(text.split("---")[1], /Bash|Write|Edit/);
}
const skill = readFileSync(".claude/skills/feature-delivery/SKILL.md", "utf8");
assert.match(skill, /disable-model-invocation: true/);
assert.match(readFileSync("CLAUDE.md", "utf8"), /@AGENTS.md/);
for (const file of [
  "AGENTS.md",
  "docs/architecture.md",
  ".github/workflows/ci.yml",
])
  assert.ok(existsSync(file), file);
console.log(
  "Agent file contracts valid. This does not prove Claude runtime discovery or execution.",
);
