import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

test("written submission and evidence routes reject changed accounts before parsing or accessing storage", async () => {
  // Load the real route handlers with synthetic service bindings. No database or provider is initialized.
  const require = createRequire(import.meta.url);
  const loader = require("node:module") as { _load: (name: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  let touches = 0;
  const forbidden = () => { touches++; throw Error("Unexpected storage access"); };
  const fixtures: Record<string, unknown> = {
    "@/lib/db": { db: { select: forbidden, transaction: forbidden }, pool: {} },
    "@/lib/db/schema": {},
    "@/lib/individual-rating-server": { checkAndRateSubmission: forbidden, getSubmissionAssessment: forbidden },
    "@/lib/submission-source": { getSubmissionSource: forbidden },
    "@/lib/author-media-storage": { authoringPreviewBlobCredentials: forbidden },
    "@/lib/private-upload": { acknowledgePrivateUpload: forbidden, preparePrivateUpload: forbidden },
    "@vercel/blob": { put: forbidden, del: forbidden },
    "@/lib/submission-server": {
      submissionUser: async () => ({ id: "B" }),
      isSubmissionOrigin: () => true,
      submissionError: (error: string, status: number) => Response.json({ error }, { status }),
    },
  };
  let submissions: { POST: (r: Request) => Promise<Response> }, evidence: { POST: (r: Request) => Promise<Response> };
  try {
    loader._load = function(name, parent, isMain) {
      return Object.hasOwn(fixtures, name) ? fixtures[name] : original.call(this, name, parent, isMain);
    };
    submissions = require("../app/api/submissions/route.ts");
    evidence = require("../app/api/solution-evidence/route.ts");
  } finally { loader._load = original; }
  for (const route of [submissions!, evidence!]) {
    const response = await route.POST(new Request("https://physcratic.test/api", {
      method: "POST", headers: { "X-Practice-Account": "A", "Content-Type": "application/json" }, body: "invalid JSON which must not be parsed",
    }));
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /account changed/i);
  }
  assert.equal(touches, 0);
  const legacy = await evidence!.POST(new Request("https://physcratic.test/api", { method: "POST", body: "not multipart" }));
  assert.equal(legacy.status, 415, "legacy callers still use the authenticated session and normal validation");
});
