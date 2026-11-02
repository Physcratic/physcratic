import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

/**
 * Runs scripts/close-deploy-blocked.sh against a fake `gh` that reads its answers from a JSON
 * fixture and logs every issue it is asked to close. It needs bash and jq, which are on
 * the GitHub runners and on most dev machines.
 */

const script = new URL("../scripts/close-deploy-blocked.sh", import.meta.url).pathname;
const workflow = readFileSync(new URL("../.github/workflows/deploy-watch.yml", import.meta.url), "utf8");
const work = mkdtempSync(join(tmpdir(), "deploy-watch-"));
after(() => rmSync(work, { recursive: true, force: true }));

const FAKE_GH = `#!/usr/bin/env bash
fx="$GH_FIXTURE"
if [[ "$1" == api ]]; then
  path="\${2#repos/*/*/}"
  case "$path" in
    compare/*) jq -r --arg k "\${path#compare/}" '.compare[$k] // "unknown"' "$fx" ;;
    commits/*) jq -r --arg k "\${path#commits/}" '.commits[$k] // empty' "$fx" ;;
  esac
elif [[ "$1 $2" == "issue list" ]]; then
  jq -c '.issues' "$fx"
elif [[ "$1 $2" == "issue close" ]]; then
  number="$3"
  while [[ $# -gt 0 ]]; do if [[ "$1" == --comment ]]; then comment="$2"; fi; shift; done
  if jq -e --argjson n "$number" '(.failClose // []) | index($n)' "$fx" >/dev/null; then exit 1; fi
  echo "close #$number: $comment" >> "$GH_LOG"
fi
`;
writeFileSync(join(work, "gh"), FAKE_GH);
chmodSync(join(work, "gh"), 0o755);

const sha = (c: string) => c.repeat(40);
const LIVE = sha("c");
const issue = (number: number, commit: string) => ({
  number,
  title: `Production deploy did not go live for ${commit.slice(0, 7)}`,
  body: `Commit: https://github.com/Physcratic/physcratic/commit/${commit}\n\nVercel reported \`error\`.`,
});

let counter = 0;
function run(fixture: Record<string, unknown>, liveSha = LIVE) {
  const id = ++counter;
  const fixturePath = join(work, `fixture-${id}.json`);
  const logPath = join(work, `log-${id}.txt`);
  writeFileSync(fixturePath, JSON.stringify(fixture));
  writeFileSync(logPath, "");
  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${work}:${process.env.PATH}`, REPO: "Physcratic/physcratic", LIVE_SHA: liveSha, GH_FIXTURE: fixturePath, GH_LOG: logPath },
  });
  return { status: result.status, out: result.stdout + result.stderr, closed: readFileSync(logPath, "utf8").split("\n").filter(Boolean) };
}

const onMain = { [`main...${LIVE}`]: "identical" };

describe("close-deploy-blocked.sh", () => {
  it("closes every open issue whose commit is an ancestor of the live commit, with the short SHA", () => {
    const r = run({
      compare: { ...onMain, [`${sha("a")}...${LIVE}`]: "ahead", [`${sha("b")}...${LIVE}`]: "ahead", [`${LIVE}...${LIVE}`]: "identical" },
      issues: [issue(1, sha("a")), issue(2, sha("b")), issue(3, LIVE)],
    });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(r.closed, ["close #1: Live in ccccccc.", "close #2: Live in ccccccc.", "close #3: Live in ccccccc."]);
  });

  it("leaves issues for newer or unrelated commits open", () => {
    const r = run({
      compare: { ...onMain, [`${sha("a")}...${LIVE}`]: "ahead", [`${sha("d")}...${LIVE}`]: "behind", [`${sha("e")}...${LIVE}`]: "diverged" },
      issues: [issue(1, sha("a")), issue(2, sha("d")), issue(3, sha("e"))],
    });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(r.closed, ["close #1: Live in ccccccc."]);
    assert.match(r.out, /#2: ddddddd is not an ancestor/);
  });

  it("does nothing when the live commit is not on main", () => {
    for (const relation of ["ahead", "diverged", "unknown"]) {
      const r = run({ compare: { [`main...${LIVE}`]: relation, [`${sha("a")}...${LIVE}`]: "ahead" }, issues: [issue(1, sha("a"))] });
      assert.equal(r.status, 0, r.out);
      assert.deepEqual(r.closed, [], relation);
    }
    assert.equal(run({ compare: { [`main...${LIVE}`]: "behind", [`${sha("a")}...${LIVE}`]: "ahead" }, issues: [issue(1, sha("a"))] }).closed.length, 1);
  });

  it("copes with no open issues", () => {
    const r = run({ compare: onMain, issues: [] });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(r.closed, []);
  });

  it("finds the commit from the short SHA in the title when the body has none", () => {
    const r = run({
      compare: { ...onMain, [`${sha("a")}...${LIVE}`]: "ahead" },
      commits: { aaaaaaa: sha("a") },
      issues: [{ number: 7, title: "Production deploy did not go live for aaaaaaa", body: "No link here" }, { number: 8, title: "Something else", body: "" }],
    });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(r.closed, ["close #7: Live in ccccccc."]);
    assert.match(r.out, /#8: no commit found/);
  });

  it("keeps going and exits 1 when one issue cannot be closed", () => {
    const r = run({ compare: { ...onMain, [`${sha("a")}...${LIVE}`]: "ahead", [`${sha("b")}...${LIVE}`]: "ahead" }, issues: [issue(1, sha("a")), issue(2, sha("b"))], failClose: [1] });
    assert.equal(r.status, 1);
    assert.deepEqual(r.closed, ["close #2: Live in ccccccc."]);
  });

  it("rejects a live SHA that is not 40 hex characters", () => {
    assert.equal(run({ compare: {}, issues: [] }, "abc1234").status, 2);
  });
});

describe("deploy-watch.yml", () => {
  it("runs on push to main and on status events, and the watch job only on push", () => {
    assert.match(workflow, /on:\n {2}push:\n {4}branches: \[main\]\n {2}status:\n/);
    assert.match(workflow, /watch:[\s\S]*?if: github\.event_name == 'push'/);
  });

  it("cleans up on a successful financial-dashboard status and after a successful push check", () => {
    assert.match(workflow, /cleanup:[\s\S]*?github\.event_name == 'status'[\s\S]*?github\.event\.state == 'success'[\s\S]*?contains\(github\.event\.context, 'financial-dashboard'\)/);
    assert.match(workflow, /LIVE_SHA: \$\{\{ github\.event\.sha \}\}/);
    assert.match(workflow, /LIVE_SHA: \$\{\{ github\.sha \}\}/);
    assert.equal((workflow.match(/bash scripts\/close-deploy-blocked\.sh/g) ?? []).length, 2);
  });

  it("keeps one issue per blocked SHA and the label", () => {
    assert.match(workflow, /Never open a second issue for the same SHA/);
    assert.match(workflow, /--label deploy-blocked/);
  });

  it("can write issues", () => {
    assert.match(workflow, /issues: write/);
    assert.match(workflow, /contents: read/);
  });
});
