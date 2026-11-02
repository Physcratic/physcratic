import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/smoke.yml", import.meta.url), "utf8");
const docs = readFileSync(new URL("../docs/engineering/SMOKE_TESTS.md", import.meta.url), "utf8");

const jobBlock = (name: string) => {
  const start = workflow.indexOf(`\n  ${name}:`);
  assert.ok(start >= 0, `job ${name}`);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z-]+:\n/);
  return next < 0 ? workflow.slice(start) : workflow.slice(start, start + 1 + next);
};

/** The shell script of one step, dedented, so the test can run the workflow's own logic. */
function stepScript(stepName: string): string {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line.trim() === `- name: ${stepName}`);
  assert.ok(start >= 0, `step ${stepName}`);
  const run = lines.findIndex((line, i) => i > start && /^ {8}run: \|$/.test(line));
  assert.ok(run > start, `run block of ${stepName}`);
  const body: string[] = [];
  for (let i = run + 1; i < lines.length && (lines[i] === "" || lines[i].startsWith(" ".repeat(10))); i++) body.push(lines[i].slice(10));
  return body.join("\n");
}

const work = mkdtempSync(join(tmpdir(), "smoke-workflow-"));
after(() => rmSync(work, { recursive: true, force: true }));
const script = join(work, "target.sh");
writeFileSync(script, stepScript("Work out what to test"));

const SHA = "a".repeat(40);
let counter = 0;
function target(env: Record<string, string>) {
  const out = join(work, `output-${++counter}.txt`);
  writeFileSync(out, "");
  const base = { EVENT_NAME: "repository_dispatch", DEPLOY_ENVIRONMENT: "preview", DEPLOY_SHA: SHA, PAYLOAD_URL: "", INPUT_BASE_URL: "", INPUT_ENV: "", VERCEL_AUTOMATION_BYPASS_SECRET: "secret" };
  const result = spawnSync("bash", [script], { encoding: "utf8", env: { ...process.env, ...base, ...env, GITHUB_OUTPUT: out } });
  const outputs = Object.fromEntries(readFileSync(out, "utf8").split("\n").filter(Boolean).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
  return { status: result.status, text: result.stdout + result.stderr, outputs };
}

describe("smoke.yml triggers", () => {
  it("runs on Vercel's repository_dispatch events and manually, and no longer on deployment_status", () => {
    const on = workflow.slice(workflow.indexOf("\non:"), workflow.indexOf("\npermissions:"));
    assert.match(on, /repository_dispatch:\n {4}types:\n {6}- vercel\.deployment\.success\n {6}- vercel\.deployment\.ready\n/);
    assert.match(on, /workflow_dispatch:/);
    assert.ok(!on.includes("deployment_status"));
    assert.ok(!jobBlock("smoke").includes("deployment_status") && !jobBlock("skipped").includes("deployment_status"));
  });

  it("filters on the payload: only financial-dashboard, never a codex/ ref, and a manual run always", () => {
    const smoke = jobBlock("smoke");
    assert.match(smoke, /github\.event_name == 'workflow_dispatch' \|\|/);
    assert.match(smoke, /github\.event\.client_payload\.project\.name == 'financial-dashboard'/);
    assert.match(smoke, /!startsWith\(github\.event\.client_payload\.git\.ref, 'codex\/'\)/);
    assert.ok(!/contains\(github\.event\.client_payload\.project\.name/.test(smoke), "the project name is matched exactly");
  });

  it("reads the documented payload fields", () => {
    assert.match(workflow, /DEPLOY_ENVIRONMENT: \$\{\{ github\.event\.client_payload\.environment \}\}/);
    assert.match(workflow, /DEPLOY_REF: \$\{\{ github\.event\.client_payload\.git\.ref \}\}/);
    assert.match(workflow, /DEPLOY_SHA: \$\{\{ github\.event\.client_payload\.git\.sha \}\}/);
    assert.match(workflow, /PAYLOAD_URL: \$\{\{ github\.event\.client_payload\.url \}\}/);
  });

  it("posts the Smoke tests status on the payload's sha, only for dispatched runs", () => {
    const smoke = jobBlock("smoke");
    assert.equal((smoke.match(/statuses\/\$DEPLOY_SHA/g) ?? []).length, 2);
    assert.match(smoke, /Mark commit status pending\n {8}if: github\.event_name == 'repository_dispatch'/);
    assert.match(smoke, /if: always\(\) && github\.event_name == 'repository_dispatch'/);
  });
});

describe("the skipped job", () => {
  it("logs why a codex/ preview was skipped, and makes no request", () => {
    const skipped = jobBlock("skipped");
    assert.match(skipped, /github\.event\.client_payload\.project\.name == 'financial-dashboard'/);
    assert.match(skipped, /startsWith\(github\.event\.client_payload\.git\.ref, 'codex\/'\)/);
    assert.ok(!skipped.includes("!startsWith"));
    assert.match(skipped, /echo "Skipped: codex branch preview"/);
    assert.ok(!/node scripts\/smoke|gh api|curl|statuses/.test(skipped));
  });
});

describe("the 'Work out what to test' step", () => {
  it("maps environment production to production and anything else to preview", () => {
    assert.equal(target({ DEPLOY_ENVIRONMENT: "production", PAYLOAD_URL: "https://financial-dashboard-abc-team.vercel.app" }).outputs.smoke_env, "production");
    assert.equal(target({ DEPLOY_ENVIRONMENT: "preview", PAYLOAD_URL: "https://financial-dashboard-abc-team.vercel.app" }).outputs.smoke_env, "preview");
    assert.equal(target({ DEPLOY_ENVIRONMENT: "staging", PAYLOAD_URL: "https://financial-dashboard-abc-team.vercel.app" }).outputs.smoke_env, "preview");
  });

  it("uses the payload url, adds https:// when it is missing and trims it", () => {
    assert.equal(target({ PAYLOAD_URL: "financial-dashboard-abc-team.vercel.app" }).outputs.base_url, "https://financial-dashboard-abc-team.vercel.app");
    assert.equal(target({ PAYLOAD_URL: "  https://financial-dashboard-abc-team.vercel.app//  " }).outputs.base_url, "https://financial-dashboard-abc-team.vercel.app");
  });

  it("only tests Vercel and production hosts, because the bypass secret is sent to the host", () => {
    for (const url of ["https://evil.example", "https://vercel.app.evil.example", "https://evilvercel.app.example.com/", "https://physcratic.com.evil.example"]) {
      const r = target({ PAYLOAD_URL: url });
      assert.equal(r.status, 1, url);
      assert.match(r.text, /not a vercel\.app or physcratic\.com host/);
    }
    assert.equal(target({ PAYLOAD_URL: "https://physcratic.com", VERCEL_AUTOMATION_BYPASS_SECRET: "" }).status, 0);
  });

  it("rejects an empty url, http and a sha that is not 40 hex characters", () => {
    assert.equal(target({ PAYLOAD_URL: "" }).status, 1);
    assert.equal(target({ PAYLOAD_URL: "http://financial-dashboard-abc-team.vercel.app" }).status, 1);
    assert.equal(target({ PAYLOAD_URL: "https://financial-dashboard-abc-team.vercel.app", DEPLOY_SHA: "abc1234" }).status, 1);
  });

  it("asks for the bypass secret on vercel.app hosts, production or preview", () => {
    for (const environment of ["production", "preview"]) {
      const r = target({ DEPLOY_ENVIRONMENT: environment, PAYLOAD_URL: "https://financial-dashboard-abc-team.vercel.app", VERCEL_AUTOMATION_BYPASS_SECRET: "" });
      assert.equal(r.status, 1);
      assert.match(r.text, /VERCEL_AUTOMATION_BYPASS_SECRET is missing/);
    }
  });

  it("still takes the base url and environment from the manual inputs", () => {
    const r = target({ EVENT_NAME: "workflow_dispatch", INPUT_BASE_URL: "https://example-preview.vercel.app/", INPUT_ENV: "preview", DEPLOY_SHA: "" });
    assert.equal(r.status, 0, r.text);
    assert.deepEqual(r.outputs, { base_url: "https://example-preview.vercel.app", smoke_env: "preview" });
  });
});

describe("SMOKE_TESTS.md", () => {
  it("describes the repository_dispatch trigger, the payload fields, the codex rule and how to confirm", () => {
    assert.match(docs, /repository_dispatch/);
    assert.match(docs, /vercel\.deployment\.success/);
    assert.match(docs, /vercel\.deployment\.ready/);
    assert.match(docs, /client_payload\.project\.name/);
    assert.match(docs, /codex\/` branches are skipped/);
    assert.match(docs, /Skipped: codex branch preview/);
    assert.match(docs, /How to confirm/);
    assert.ok(!/\(`deployment_status`\)/.test(docs), "the old trigger is gone from the table");
  });
});
