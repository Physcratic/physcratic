import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import { findProblemImage } from "./seo/problem-image";
import { allProblemPages } from "./seo/problem-pages";

const require = createRequire(import.meta.url);

describe("problem image metadata", () => {
  it("preserves every public problem's existing SEO title and topic, without other fields", () => {
    for (const page of allProblemPages()) {
      assert.deepEqual(findProblemImage(page.id), { metaTitle: page.metaTitle, topic: page.topic }, page.id);
    }
  });

  it("rejects unknown, malformed, retired and authored IDs", () => {
    for (const id of ["", "unknown", "IPHO-2024-T1", "../ipho-2024-t1", "ipho-2024-t1.json", "kinematics-1", "00000000-0000-4000-8000-000000000001"]) {
      assert.equal(findProblemImage(id), undefined, id);
    }
  });

  it("works in a fresh process without the repository's public statement files", () => {
    const cwd = mkdtempSync(join(tmpdir(), "physcratic-problem-image-"));
    try {
      const moduleUrl = pathToFileURL(join(process.cwd(), "lib/seo/problem-image.ts")).href;
      const child = spawnSync(process.execPath, ["--import", require.resolve("tsx"), "--input-type=module", "-e", `
        import assert from 'node:assert/strict';
        const { findProblemImage } = await import(${JSON.stringify(moduleUrl)});
        for (const id of ['ipho-2024-t1', 'eupho-2024-t2', 'arena-the-infinite-v']) {
          assert.ok(findProblemImage(id)?.metaTitle, id);
        }
        assert.equal(findProblemImage('unknown'), undefined);
      `], { cwd, encoding: "utf8", timeout: 30_000 });
      assert.equal(child.error, undefined);
      assert.equal(child.status, 0, child.stderr);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
