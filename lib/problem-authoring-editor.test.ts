import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  DraftEditorSession,
  DraftRequestError,
  draftRequest,
  editorDraftSchema,
  moveItem,
  newBlock,
  newProblem,
  type EditorDraft,
} from "./problem-authoring-editor";
import { authoredDraftSchema } from "./problem-authoring";
function fixture(): EditorDraft {
  return {
    problemId: randomUUID(),
    version: 1,
    state: "draft",
    slug: "test",
    ...newProblem(),
  };
}
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const saved = async (d: EditorDraft) => ({ ...d, version: d.version + 1 });
test("native block factories and reordering preserve stable IDs and exact content", () => {
  const a = newBlock("text"),
    b = newBlock("math"),
    c = newBlock("text");
  const list = [a, b, c];
  assert.deepEqual(moveItem(list, 1, -1), [b, a, c]);
  assert.equal(moveItem(list, 0, -1), list);
  assert.deepEqual(moveItem(moveItem(list, 1, -1), 0, 1), list);
});
test("debounced edits coalesce and clear recovery only after success", async () => {
  const local = storage();
  const calls: EditorDraft[] = [];
  const session = new DraftEditorSession(
    fixture(),
    async (d) => {
      calls.push(d);
      return saved(d);
    },
    local,
    "author:draft",
    10,
  );
  session.edit((d) => {
    d.content.title = "First";
  });
  session.edit((d) => {
    d.content.title = "Latest";
  });
  assert.ok(local.getItem("author:draft"));
  await wait(60);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].content.title, "Latest");
  assert.equal(session.snapshot().draft.version, 2);
  assert.equal(session.snapshot().phase, "saved");
  assert.equal(local.getItem("author:draft"), null);
  session.dispose();
});
test("edits during a save are preserved and serialized against the returned version", async () => {
  const calls: EditorDraft[] = [];
  let release!: (d: EditorDraft) => void;
  const session = new DraftEditorSession(
    fixture(),
    (d) => {
      calls.push(structuredClone(d));
      return calls.length === 1
        ? new Promise((r) => {
            release = r;
          })
        : saved(d);
    },
    undefined,
    "",
    10000,
  );
  session.edit((d) => {
    d.content.title = "A";
  });
  const flight = session.flush();
  session.edit((d) => {
    d.content.title = "B";
  });
  release({ ...calls[0], version: 2 });
  assert.equal(await flight, true);
  assert.deepEqual(
    calls.map((d) => [d.content.title, d.version]),
    [
      ["A", 1],
      ["B", 2],
    ],
  );
  assert.equal(session.snapshot().draft.content.title, "B");
  assert.equal(session.snapshot().draft.version, 3);
  session.dispose();
});
test("failed autosave pauses, retains newer work, and explicit retry uses it", async () => {
  const local = storage();
  let fail = true;
  const session = new DraftEditorSession(
    fixture(),
    async (d) => {
      if (fail) throw new DraftRequestError(503, "Service unavailable");
      return saved(d);
    },
    local,
    "u:d",
    10000,
  );
  session.edit((d) => {
    d.content.title = "Local";
  });
  assert.equal(await session.flush(), false);
  assert.equal(session.snapshot().phase, "error");
  session.edit((d) => {
    d.content.title = "Newer local";
  });
  assert.equal(session.snapshot().phase, "error");
  assert.ok(local.getItem("u:d")?.includes("Newer local"));
  fail = false;
  assert.equal(await session.flush(), true);
  assert.equal(session.snapshot().draft.version, 2);
  session.dispose();
});
test("409 never retries or discards local work until explicit conflict decision", async () => {
  const local = storage();
  let calls = 0;
  const session = new DraftEditorSession(
    fixture(),
    async () => {
      calls++;
      throw new DraftRequestError(409, "stale");
    },
    local,
    "u:d",
    5,
  );
  session.edit((d) => {
    d.content.title = "Keep me";
  });
  assert.equal(await session.flush(), false);
  session.edit((d) => {
    d.content.title = "Keep newest";
  });
  await wait(30);
  assert.equal(await session.flush(), false);
  assert.equal(calls, 1);
  const latest = {
    ...fixture(),
    problemId: session.snapshot().draft.problemId,
    version: 5,
  };
  session.keepLocal(latest);
  assert.equal(session.snapshot().draft.content.title, "Keep newest");
  assert.equal(session.snapshot().draft.version, 5);
  assert.equal(session.snapshot().phase, "editing");
  assert.ok(local.getItem("u:d"));
  session.dispose();
});
test("private partial-number and expression buffers recover explicitly across reloads", () => {
  const local = storage(),
    initial = fixture(),
    id = randomUUID();
  initial.content.sections = [
    {
      id: randomUUID(),
      title: "",
      blocks: [],
      parts: [{ id, label: "a", blocks: [], answerMode: "numeric" }],
    },
  ];
  initial.privateParts = [
    {
      partId: id,
      key: { kind: "numeric", value: 0, units: "m", absTol: 0.1, relTol: 0 },
      hints: [],
      solution: [],
    },
  ];
  const first = new DraftEditorSession(
    initial,
    saved,
    local,
    "owner:id",
    10000,
  );
  first.edit((d) => {
    d.privateParts[0].key = {
      kind: "numeric",
      value: null,
      units: "m",
      absTol: null,
      relTol: 0,
    };
    d.privateParts[0].solution = [
      { id: randomUUID(), kind: "math", latex: "PRIVATE" },
    ];
  });
  first.dispose();
  const second = new DraftEditorSession(initial, saved, local, "owner:id");
  assert.equal(second.snapshot().dirty, false);
  assert.ok(second.snapshot().recovery);
  second.restoreRecovery();
  assert.equal(second.snapshot().phase, "editing");
  assert.equal(second.snapshot().draft.privateParts[0].key?.kind, "numeric");
  assert.equal(
    authoredDraftSchema.safeParse(second.snapshot().draft).success,
    false,
  );
  assert.equal(
    editorDraftSchema.safeParse(second.snapshot().draft).success,
    true,
  );
  second.dispose();
  const another = new DraftEditorSession(
    initial,
    saved,
    local,
    "different-owner:id",
  );
  assert.equal(another.snapshot().recovery, null);
  another.dispose();
});
test("older recovery is conflicted; choosing server is explicit and clears backup", () => {
  const local = storage(),
    initial = fixture();
  local.setItem(
    "key",
    JSON.stringify({
      ...initial,
      content: { ...initial.content, title: "Unsaved" },
    }),
  );
  const session = new DraftEditorSession(
    { ...initial, version: 3 },
    saved,
    local,
    "key",
  );
  session.restoreRecovery();
  assert.equal(session.snapshot().phase, "conflict");
  assert.equal(session.snapshot().draft.content.title, "Unsaved");
  session.useServer({ ...initial, version: 3 });
  assert.equal(session.snapshot().draft.version, 3);
  assert.equal(local.getItem("key"), null);
  session.dispose();
});
test("publication flushes latest edits, locks editing, and consumes returned version", async () => {
  const session = new DraftEditorSession(
    fixture(),
    saved,
    undefined,
    "",
    10000,
  );
  session.edit((d) => {
    d.content.title = "Ready";
  });
  assert.equal(
    await session.publish("publish", async (d) => {
      assert.equal(d.version, 2);
      session.edit((next) => {
        next.content.title = "must not apply";
      });
      return { version: 3 };
    }),
    true,
  );
  assert.equal(session.snapshot().draft.content.title, "Ready");
  assert.equal(session.snapshot().draft.state, "published");
  assert.equal(session.snapshot().draft.version, 3);
  assert.equal(session.snapshot().busy, false);
  session.dispose();
});
test("incomplete numeric save never reaches the API or publishing callback", async () => {
  let calls = 0;
  const initial = fixture(),
    id = randomUUID();
  initial.content.sections = [
    {
      id: randomUUID(),
      title: "",
      blocks: [],
      parts: [{ id, label: "a", blocks: [], answerMode: "numeric" }],
    },
  ];
  initial.privateParts = [
    {
      partId: id,
      key: { kind: "numeric", value: 1, units: "", absTol: 0.1, relTol: 0 },
      hints: [],
      solution: [],
    },
  ];
  const session = new DraftEditorSession(
    initial,
    async (d) => {
      calls++;
      return saved(d);
    },
    undefined,
    "",
    10000,
  );
  session.edit((d) => {
    d.privateParts[0].key = {
      kind: "numeric",
      value: null,
      units: "",
      absTol: 0.1,
      relTol: 0,
    };
  });
  assert.equal(
    await session.publish("publish", async () => {
      calls++;
      return { version: 2 };
    }),
    false,
  );
  assert.equal(calls, 0);
  assert.equal(session.snapshot().dirty, true);
  session.dispose();
});
test("unavailable storage is reported without stopping saves; Strict Mode reactivation works", async () => {
  const denied = {
    getItem: () => {
      throw Error("denied");
    },
    setItem: () => {
      throw Error("denied");
    },
    removeItem: () => {
      throw Error("denied");
    },
  };
  const session = new DraftEditorSession(
    fixture(),
    saved,
    denied,
    "key",
    10000,
  );
  assert.equal(session.snapshot().storageWarning, true);
  session.dispose();
  session.activate();
  session.edit((d) => {
    d.content.title = "Still works";
  });
  assert.equal(await session.flush(), true);
  session.dispose();
});
test("HTTP adapter sends JSON/version with same-origin credentials and exposes status for conflicts", async () => {
  const fetcher: typeof fetch = async (_url, options) => {
    assert.equal(options?.credentials, "same-origin");
    assert.equal(options?.cache, "no-store");
    assert.deepEqual(JSON.parse(options?.body as string), { version: 4 });
    return Response.json({ error: "Changed" }, { status: 409 });
  };
  await assert.rejects(
    draftRequest("/draft", "PUT", { version: 4 }, fetcher),
    (error) => error instanceof DraftRequestError && error.status === 409,
  );
});
test("undo to old baseline during an in-flight save still protects recovery and unload", async () => {
  const local = storage(),
    initial = fixture();
  initial.content.title = "B";
  let release!: (d: EditorDraft) => void;
  const session = new DraftEditorSession(
    initial,
    () =>
      new Promise((r) => {
        release = r;
      }),
    local,
    "key",
    10000,
  );
  session.edit((d) => {
    d.content.title = "A";
  });
  const pending = session.flush();
  session.edit((d) => {
    d.content.title = "B";
  });
  assert.equal(session.snapshot().dirty, true);
  assert.ok(local.getItem("key"));
  session.dispose();
  release({
    ...initial,
    content: { ...initial.content, title: "A" },
    version: 2,
  });
  await pending;
  const reloaded = new DraftEditorSession(initial, saved, local, "key", 10000);
  assert.ok(
    reloaded.snapshot().recovery,
    "even an equal-value server read must not discard a pending-write recovery copy",
  );
  reloaded.restoreRecovery();
  assert.equal(reloaded.snapshot().draft.content.title, "B");
  assert.equal(await reloaded.flush(), true);
  reloaded.dispose();
});
test("unrecognized local recovery is preserved for explicit download/discard", () => {
  const local = storage();
  local.setItem("key", '{"unrecognized":"PRIVATE ORIGINAL"}');
  const session = new DraftEditorSession(fixture(), saved, local, "key");
  assert.ok(session.snapshot().recoveryRaw?.includes("PRIVATE ORIGINAL"));
  assert.ok(local.getItem("key"));
  session.discardRecovery();
  assert.equal(local.getItem("key"), null);
  session.dispose();
});
test("restoring pending-write uncertainty protects an equal-value copy through a second reload", () => {
  const local = storage(),
    initial = fixture();
  local.setItem("key", JSON.stringify({ draft: initial, pendingSave: true }));
  const first = new DraftEditorSession(initial, saved, local, "key");
  first.restoreRecovery();
  first.dispose();
  const second = new DraftEditorSession(initial, saved, local, "key");
  assert.ok(second.snapshot().recovery);
  second.dispose();
});
test("raw numeric/expression input remains recoverable while server validation stays strict", () => {
  const d = fixture(),
    id = randomUUID();
  d.content.sections = [
    {
      id: randomUUID(),
      title: "",
      blocks: [],
      parts: [{ id, label: "a", blocks: [], answerMode: "expression" }],
    },
  ];
  d.privateParts = [
    {
      partId: id,
      key: {
        kind: "expression",
        expected: "",
        variables: [{ name: "", domain: "real", min: "-", assumptions: [] }],
        angleUnit: "radians",
        exclusions: Array(21).fill("x != 0"),
      },
      hints: [],
      solution: [],
    },
  ];
  assert.equal(editorDraftSchema.safeParse(d).success, true);
  const local = storage();
  local.setItem("key", JSON.stringify({ draft: d, pendingSave: false }));
  const session = new DraftEditorSession(
    { ...d, privateParts: [] },
    saved,
    local,
    "key",
  );
  assert.ok(session.snapshot().recovery);
  session.restoreRecovery();
  assert.equal(
    session.snapshot().draft.privateParts[0].key?.kind,
    "expression",
  );
  session.dispose();
});
