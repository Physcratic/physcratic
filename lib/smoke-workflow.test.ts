import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/smoke.yml", import.meta.url), "utf8");
const jobBlock = (name: string) => {
  const start = workflow.indexOf(`\n  ${name}:`);
  assert.ok(start >= 0, `job ${name}`);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z-]+:\n/);
  return next < 0 ? workflow.slice(start) : workflow.slice(start, start + 1 + next);
};

describe("smoke.yml", () => {
  it("does not run the smoke job for codex/ previews, but still allows a manual run", () => {
    const smoke = jobBlock("smoke");
    assert.match(smoke, /github\.event_name == 'workflow_dispatch' \|\|/);
    assert.match(smoke, /!startsWith\(github\.event\.deployment\.ref, 'codex\/'\)/);
    assert.match(smoke, /github\.event\.deployment_status\.state == 'success'/);
    assert.match(smoke, /contains\(github\.event\.deployment\.environment, 'financial-dashboard'\)/);
  });

  it("logs why a codex/ preview was skipped", () => {
    const skipped = jobBlock("skipped");
    assert.match(skipped, /startsWith\(github\.event\.deployment\.ref, 'codex\/'\)/);
    assert.ok(!skipped.includes("!startsWith"));
    assert.match(skipped, /github\.event\.deployment_status\.state == 'success'/);
    assert.match(skipped, /echo "Skipped: codex branch preview"/);
  });

  it("never sends a request or writes a status from the skipped job", () => {
    const skipped = jobBlock("skipped");
    assert.ok(!/node scripts\/smoke|gh api|curl|statuses/.test(skipped));
  });

  it("explains the rule in the docs", () => {
    const docs = readFileSync(new URL("../docs/engineering/SMOKE_TESTS.md", import.meta.url), "utf8");
    assert.match(docs, /codex\/` branches are skipped/);
    assert.match(docs, /staging database/);
    assert.match(docs, /Skipped: codex branch preview/);
  });
});
