import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publishableDraftSchema, authoredDraftSchema } from "../lib/problem-authoring";
import type { EditorDraft } from "../lib/problem-authoring-editor";
import { editorDraftSchema, newProblem, draftPayload } from "../lib/problem-authoring-editor";
import {
  RIGHTS_TEXT,
  UNITS,
  addEasyPart,
  allParts,
  answerText,
  applyAnswer,
  blocksText,
  easyIssues,
  ensureEasyShape,
  knownUnit,
  partLetter,
  privateFor,
  readAnswer,
  setHint,
  setProblemText,
  setQuestion,
  setRights,
  setSolution,
  setUnits,
  spansToText,
  testAnswer,
  textToSpans,
  verdictLabel,
} from "../components/authoring/easy-model";

// The student route imports server-only modules. The boundary is only enforced by the Next build.
createRequire(import.meta.url)("./server-only-register.cjs");

const uuid = () => crypto.randomUUID();
function blank(): EditorDraft {
  const draft: EditorDraft = { problemId: uuid(), version: 1, state: "draft", slug: "", ...structuredClone(newProblem()) };
  ensureEasyShape(draft);
  return draft;
}
/** Fills a draft the way Easy does: title, text, question, answer, the tick. */
function easyDraft(answer: string, units = ""): EditorDraft {
  const d = blank();
  const id = allParts(d)[0].part.id;
  d.content.title = "Block on a slope";
  setProblemText(d, "A block of mass $m$ slides down a slope.");
  setQuestion(d, id, "Find the acceleration.");
  applyAnswer(d, id, readAnswer(answer), answer);
  if (units) setUnits(d, id, units);
  setRights(d, true);
  return d;
}

test("answers are read as a number or an expression, and the symbols come from the answer", () => {
  assert.deepEqual(readAnswer(""), { kind: "empty" });
  assert.deepEqual(readAnswer("9.8"), { kind: "number", value: 9.8 });
  assert.deepEqual(readAnswer("3e8"), { kind: "number", value: 3e8 });
  assert.deepEqual(readAnswer("\\frac{1}{2}"), { kind: "number", value: 0.5 });
  assert.deepEqual(readAnswer("\\frac{1}{2}mv^2"), { kind: "expression", symbols: ["m", "v"] });
  assert.deepEqual(readAnswer("\\frac{h}{mc}"), { kind: "expression", symbols: ["h", "m", "c"] });
  assert.deepEqual(readAnswer("\\theta_0\\sin(kz)"), { kind: "expression", symbols: ["theta_0", "k", "z"] });
});

test("function names, constants and units are never symbols", () => {
  assert.deepEqual(readAnswer("\\pi r^2"), { kind: "expression", symbols: ["r"] });
  assert.deepEqual(readAnswer("e^{-x}"), { kind: "expression", symbols: ["x"] });
  assert.deepEqual(readAnswer("\\ln(x)\\cos(y)"), { kind: "expression", symbols: ["x", "y"] });
  const withUnit = readAnswer("9.8 m/s^2");
  assert.equal(withUnit.kind, "error");
  assert.match((withUnit as { message: string }).message, /Unit box/);
  const lone = readAnswer("2 N");
  assert.equal(lone.kind, "error");
});

test("an answer that cannot be read says why, in the reader's words", () => {
  const open = readAnswer("x+");
  assert.equal(open.kind, "error");
  assert.match((open as { message: string }).message, /stops too soon/);
  const glued = readAnswer("a/bc");
  assert.equal(glued.kind, "error");
  assert.match((glued as { message: string }).message, /Add brackets/);
  assert.equal(readAnswer("x".repeat(181)).kind, "error");
});

test("text with maths round-trips and keeps unrelated blocks", () => {
  const text = "The mass $m$ moves at $v = 2$ m/s.";
  assert.equal(spansToText(textToSpans(text)), text);
  assert.equal(spansToText(textToSpans("")), "");
  const d = blank();
  d.content.context = [{ id: uuid(), kind: "math", latex: "F=ma" }];
  setProblemText(d, "Hello");
  assert.equal(d.content.context.length, 2);
  assert.equal(d.content.context[1].kind, "math");
  assert.equal(blocksText(d.content.context), "Hello");
});

test("a one-part expression problem written in Easy is a valid, publishable draft", () => {
  const d = easyDraft("\\frac{1}{2}mv^{2}");
  assert.deepEqual(easyIssues(d), []);
  const payload = { problemId: d.problemId, version: d.version, ...draftPayload(d) };
  assert.ok(authoredDraftSchema.safeParse(payload).success);
  const publishable = publishableDraftSchema.safeParse(payload);
  assert.ok(publishable.success, JSON.stringify(publishable.error?.issues));
  const key = privateFor(d, allParts(d)[0].part.id).key;
  assert.equal(key?.kind, "expression");
  if (key?.kind === "expression") {
    assert.deepEqual(key.variables.map((v) => v.name), ["m", "v"]);
    assert.equal(key.angleUnit, "radians");
    assert.deepEqual(key.exclusions, []);
  }
  assert.equal(d.content.provenance.kind, "original");
  assert.equal(d.content.provenance.rightsDeclaration, RIGHTS_TEXT);
  assert.ok(editorDraftSchema.safeParse(d).success);
});

test("a number answer uses the default tolerance of the Arena checker, and a unit from the list", () => {
  const d = easyDraft("9.8", "m/s^2");
  const key = privateFor(d, allParts(d)[0].part.id).key;
  assert.deepEqual(key, { kind: "numeric", value: 9.8, units: "m/s^2", absTol: 1e-9, relTol: 0.01 });
  assert.deepEqual(easyIssues(d), []);
  assert.ok(publishableDraftSchema.safeParse({ problemId: d.problemId, version: 1, ...draftPayload(d) }).success);
  setUnits(d, allParts(d)[0].part.id, "furlong");
  assert.match(easyIssues(d).find((i) => i.field.startsWith("units:"))?.message ?? "", /does not know the unit/);
});

test("each thing that blocks Publish is named next to its own field", () => {
  const d = blank();
  const id = allParts(d)[0].part.id;
  assert.deepEqual(
    easyIssues(d).map((i) => i.field),
    ["title", `question:${id}`, `answer:${id}`, "rights"],
  );
  assert.deepEqual(easyIssues(d, { [id]: "x+" }).find((i) => i.field === `answer:${id}`)?.message.includes("stops too soon"), true);
});

test("letters are automatic", () => {
  const d = blank();
  addEasyPart(d);
  addEasyPart(d);
  assert.deepEqual(allParts(d).map((r) => r.part.label), ["a", "b", "c"]);
  assert.equal(partLetter(26), "a2");
});

// ---------------------------------------------------------------------------------------------------------------
// Switching modes never loses Advanced data
// ---------------------------------------------------------------------------------------------------------------

function advancedDraft(): EditorDraft {
  const d = blank();
  const first = allParts(d)[0].part;
  d.content.title = "Adapted problem";
  d.content.estimatedDifficulty = "Hard";
  d.content.methodTags = ["energy-methods"];
  d.content.provenance = { kind: "authorized", source: "Permission email, 2 November", rightsDeclaration: "I have permission." };
  d.content.context = [
    { id: uuid(), kind: "text", spans: [{ kind: "text", text: "Old text " }, { kind: "math", latex: "x^2" }] },
    { id: uuid(), kind: "math", latex: "E=mc^2" },
  ];
  d.content.sections[0].title = "Setup";
  d.content.sections.push({
    id: uuid(),
    title: "Second section",
    blocks: [{ id: uuid(), kind: "text", spans: [{ kind: "text", text: "More." }] }],
    parts: [{ id: uuid(), label: "B.1", blocks: [], answerMode: "numeric" }],
  });
  const second = d.content.sections[1].parts[0];
  d.privateParts.push({
    partId: second.id,
    key: { kind: "numeric", value: 4.9, units: "m", absTol: 0.5, relTol: 0.2 },
    hints: [
      { id: uuid(), kind: "text", spans: [{ kind: "text", text: "Hint one" }] },
      { id: uuid(), kind: "math", latex: "a=g" },
    ],
    solution: [{ id: uuid(), kind: "math", latex: "s=\\frac12 g t^2" }],
  });
  first.label = "A.1";
  first.answerMode = "expression";
  d.privateParts = d.privateParts.map((p) =>
    p.partId === first.id
      ? {
          ...p,
          key: {
            kind: "expression" as const,
            expected: "x^2+y",
            variables: [
              { name: "x", domain: "real" as const, min: 1, max: 3, assumptions: ["positive" as const] },
              { name: "y", domain: "real" as const, assumptions: ["nonzero" as const] },
            ],
            angleUnit: "degrees" as const,
            exclusions: ["x=2"],
          },
        }
      : p,
  );
  return d;
}

test("editing a draft with Advanced settings in Easy and switching back keeps every Advanced field", () => {
  const before = advancedDraft();
  assert.ok(authoredDraftSchema.safeParse({ problemId: before.problemId, version: 1, ...draftPayload(before) }).success);
  const after = structuredClone(before);
  const first = allParts(after)[0].part;
  // Everything Easy lets the author change.
  after.content.title = "A new title";
  setProblemText(after, "New problem text with $y$.");
  setQuestion(after, first.id, "What is the new question?");
  setHint(after, first.id, "A hint");
  setSolution(after, first.id, "A solution");
  // The same answer typed again, and an equivalent one that keeps the same symbols.
  applyAnswer(after, first.id, readAnswer("x^2+y"), "x^2+y");
  applyAnswer(after, first.id, readAnswer("y+x^2"), "y+x^2");
  const key = privateFor(after, first.id).key;
  assert.equal(key?.kind, "expression");
  if (key?.kind === "expression") {
    assert.equal(key.angleUnit, "degrees");
    assert.deepEqual(key.exclusions, ["x=2"]);
    assert.deepEqual(key.variables, [
      { name: "x", domain: "real", min: 1, max: 3, assumptions: ["positive"] },
      { name: "y", domain: "real", assumptions: ["nonzero"] },
    ]);
  }
  // A number key in another section: new value keeps its tolerance.
  const second = allParts(after)[1].part;
  applyAnswer(after, second.id, readAnswer("5"), "5");
  assert.deepEqual(privateFor(after, second.id).key, { kind: "numeric", value: 5, units: "m", absTol: 0.5, relTol: 0.2 });
  // Put the Easy-edited values back and the two drafts must be identical.
  applyAnswer(after, second.id, readAnswer("4.9"), "4.9");
  after.content.title = before.content.title;
  after.content.context[0] = structuredClone(before.content.context[0]);
  first.blocks = structuredClone(before.content.sections[0].parts[0].blocks);
  const entry = after.privateParts.find((p) => p.partId === first.id)!;
  const original = before.privateParts.find((p) => p.partId === first.id)!;
  entry.hints = structuredClone(original.hints);
  entry.solution = structuredClone(original.solution);
  after.privateParts = after.privateParts.map((p) => (p.partId === first.id ? { ...p, key: structuredClone(original.key) } : p));
  assert.deepEqual(after, before);
  // The rights stay as Advanced set them: Easy does not overwrite permission.
  setRights(after, true);
  assert.equal(after.content.provenance.kind, "authorized");
  assert.equal(after.content.provenance.source, "Permission email, 2 November");
});

test("changing the answer keeps limits for the symbols that stay, and drops only the symbol that left", () => {
  const d = advancedDraft();
  const first = allParts(d)[0].part;
  applyAnswer(d, first.id, readAnswer("x^2+z"), "x^2+z");
  const key = privateFor(d, first.id).key;
  assert.equal(key?.kind === "expression" && key.variables[0].name, "x");
  if (key?.kind === "expression") {
    assert.deepEqual(key.variables[0], { name: "x", domain: "real", min: 1, max: 3, assumptions: ["positive"] });
    assert.deepEqual(key.variables[1], { name: "z", domain: "real", assumptions: [] });
    assert.equal(key.angleUnit, "degrees");
  }
});

test("an unreadable answer changes nothing in the saved key", () => {
  const d = easyDraft("m a");
  const id = allParts(d)[0].part.id;
  const before = structuredClone(d);
  applyAnswer(d, id, readAnswer("m a +"), "m a +");
  assert.deepEqual(d, before);
  assert.equal(answerText(privateFor(d, id).key), "m a");
});

// ---------------------------------------------------------------------------------------------------------------
// Test an answer gives what the student route gives
// ---------------------------------------------------------------------------------------------------------------

type Draft = EditorDraft;
async function studentResult(d: Draft, partId: string, answer: unknown) {
  const { createAuthoredGrader } = await import("../lib/authored-grading");
  const entry = privateFor(d, partId);
  const mode = allParts(d).find((r) => r.part.id === partId)!.part.answerMode;
  const revisionId = uuid();
  const pool = {
    query: async () => ({
      rows: [{ schema_version: 1, answer_mode: mode, private_mode: mode, private_part_id: partId, key: entry.key }],
    }),
  };
  const grade = createAuthoredGrader({ pool: pool as never, user: async () => ({ id: "author", emailVerified: true }) });
  return grade({ problemId: d.problemId, revisionId, partId, answer });
}

test("Test an answer matches the student route for expression answers", async () => {
  const d = easyDraft("\\frac{1}{2}mv^{2}");
  const partId = allParts(d)[0].part.id;
  const attempts = [
    "\\frac{1}{2}mv^2",
    "0.5 m v^2",
    "m v^2 / 2",
    "m v^2",
    "\\frac{1}{2}mv",
    "x",
    "m v^2 +",
    "2 m v^2",
    "v^2 m / 2",
    "\\frac{m v^{2}}{2}",
  ];
  for (const text of attempts) {
    const mine = testAnswer({ key: privateFor(d, partId).key, seed: `${d.problemId}:${partId}`, text, units: "" });
    const theirs = await studentResult(d, partId, { kind: "expression", expression: text });
    assert.equal(mine.kind, "checked", text);
    if (mine.kind === "checked") {
      assert.equal(mine.verdict, theirs.status, `verdict for ${JSON.stringify(text)}`);
      if (mine.verdict === "correct" || mine.verdict === "incorrect") assert.equal(mine.reason, theirs.reason, text);
    }
  }
});

test("Test an answer matches the student route for number answers, on and around the tolerance", async () => {
  const d = easyDraft("9.8", "m/s^2");
  const partId = allParts(d)[0].part.id;
  const key = privateFor(d, partId).key;
  const cases: [string, string][] = [
    ["9.8", "m/s^2"],
    ["9.85", "m/s^2"],
    ["9.898", "m/s^2"],
    ["9.898000000000001", "m/s^2"],
    ["9.9", "m/s^2"],
    ["9.702", "m/s^2"],
    ["10", "m/s^2"],
    ["-9.8", "m/s^2"],
    ["9.8", "m"],
    ["9.8", ""],
    ["9.8", "furlong"],
    ["9.8e0", "m/s^2"],
    ["98e-1", "m/s^2"],
  ];
  for (const [text, units] of cases) {
    const mine = testAnswer({ key, seed: "x", text, units });
    assert.equal(mine.kind, "checked", text);
    const theirs = await studentResult(d, partId, { kind: "numeric", value: Number(text), units });
    if (mine.kind === "checked") {
      assert.equal(mine.verdict, theirs.status, `${text} ${units}`);
      assert.equal(mine.reason, theirs.reason, `${text} ${units}`);
    }
  }
  // Random values around the key, against a key with absolute and relative tolerance.
  const numeric = { kind: "numeric" as const, value: 3.7, units: "m", absTol: 0.02, relTol: 0.015 };
  const d2 = easyDraft("3.7", "m");
  const part2 = allParts(d2)[0].part.id;
  d2.privateParts = d2.privateParts.map((p) => (p.partId === part2 ? { ...p, key: numeric } : p));
  let seed = 12345;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 150; i++) {
    const value = Number((3.7 + (random() - 0.5) * 0.3).toFixed(4));
    const mine = testAnswer({ key: numeric, seed: "x", text: String(value), units: "m" });
    const theirs = await studentResult(d2, part2, { kind: "numeric", value, units: "m" });
    assert.equal(mine.kind === "checked" && mine.verdict, theirs.status, String(value));
  }
});

test("a text answer the student form refuses is refused here too, with a message", () => {
  const d = easyDraft("9.8", "m");
  const key = privateFor(d, allParts(d)[0].part.id).key;
  const result = testAnswer({ key, seed: "x", text: "abc", units: "m" });
  assert.equal(result.kind, "unreadable");
  assert.deepEqual(testAnswer({ key, seed: "x", text: "", units: "" }).kind, "none");
  assert.equal(testAnswer({ key: { kind: "manual" }, seed: "x", text: "1", units: "" }).kind, "none");
});

test("the unit list is the one the student checker knows", async () => {
  const { evaluateNumericAnswer } = await import("../lib/authored-numeric-grading");
  const key = (units: string) => ({ kind: "numeric", value: 1, units, absTol: 0, relTol: 0 });
  for (const unit of UNITS) {
    assert.ok(knownUnit(unit), unit);
    assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 1, units: unit }, key(unit)).status, "correct", unit);
  }
  for (const unit of ["furlong", "eV", "Pa·s", "m/s^3", "N/m", "kg m/s", "metres", "J/K"]) {
    assert.equal(knownUnit(unit), false, unit);
    assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 1, units: unit }, key(unit)).reason, "units-unsupported", unit);
  }
  assert.ok(knownUnit("1") && knownUnit(""));
});

test("the verdict labels are the ones the student page shows", () => {
  const source = readFileSync(new URL("../components/authored/student-workspace.tsx", import.meta.url), "utf8");
  for (const label of Object.values(verdictLabel)) assert.ok(source.includes(`label: "${label}"`), label);
});
