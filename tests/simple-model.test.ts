import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ratingBands } from "../lib/rating-bands"
import { publishableDraftSchema, authoredDraftSchema } from "../lib/problem-authoring";
import type { EditorDraft } from "../lib/problem-authoring-editor";
import { editorDraftSchema, newProblem, draftPayload } from "../lib/problem-authoring-editor";
import {
  ADAPTED_RIGHTS_TEXT,
  addContextPicture,
  contextPictureOf,
  difficultyLabel,
  difficultyRating,
  removeContextPicture,
  setContextPictureAlt,
  setDifficulty,
  setSourceChoice,
  setSourceText,
  sourceState,
  RIGHTS_TEXT,
  UNITS,
  addPart,
  addPicture,
  advancedNote,
  blocksSpans,
  deriveTitle,
  mathSymbols,
  pictureOf,
  removePicture,
  setIntro,
  setPictureAlt,
  setSolution as setSolutionSpans,
  simpleIssues,
  allParts,
  answerText,
  applyAnswer,
  blocksText,
  ensureSimpleShape,
  knownUnit,
  partLetter,
  privateFor,
  readAnswer,
  setQuestion,
  setRights,
  setUnits,
  spansToText,
  testAnswer,
  textToSpans,
  verdictLabel,
} from "../components/authoring/simple-model";

// The student route imports server-only modules. The boundary is only enforced by the Next build.
createRequire(import.meta.url)("./server-only-register.cjs");

const uuid = () => crypto.randomUUID();
const words = (text: string) => [{ kind: "text" as const, text }];
function blank(): EditorDraft {
  const draft: EditorDraft = { problemId: uuid(), version: 1, state: "draft", slug: "", ...structuredClone(newProblem()) };
  ensureSimpleShape(draft);
  return draft;
}
/** Fills a draft the way Easy does: title, text, question, answer, the tick. */
function easyDraft(answer: string, units = ""): EditorDraft {
  const d = blank();
  const id = allParts(d)[0].part.id;
  d.content.title = "Block on a slope";
  setQuestion(d, id, [{ kind: "text", text: "A block of mass " }, { kind: "math", latex: "m" }, { kind: "text", text: " slides down a slope. Find the acceleration." }]);
  applyAnswer(d, id, readAnswer(answer), answer);
  if (units) setUnits(d, id, units);
  // Simple asks for a worked solution.
  setSolutionSpans(d, id, words("Use the component of gravity along the slope."));
  setRights(d, true);
  setDifficulty(d, "2100");
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
  setIntro(d, words("Hello"));
  assert.equal(d.content.context.length, 2);
  assert.equal(d.content.context[1].kind, "math");
  assert.equal(blocksText(d.content.context), "Hello");
  assert.deepEqual(blocksSpans(d.content.context), words("Hello"));
});

test("the title comes from the first words of the first question until the author writes their own", () => {
  assert.equal(deriveTitle(words("A ball is thrown up at 12 m/s. How high does it go?")), "A Ball is Thrown Up");
  assert.equal(deriveTitle([{ kind: "math", latex: "x" }]), "");
  assert.equal(deriveTitle(words("Find the speed of the")), "Find the Speed");
  const d = blank();
  const id = allParts(d)[0].part.id;
  setQuestion(d, id, words("A pendulum swings through a small angle"));
  assert.equal(d.content.title, "A Pendulum Swings Through");
  setQuestion(d, id, words("A pendulum on a cart"));
  assert.equal(d.content.title, "A Pendulum on a Cart", "the title follows the question while it is the made one");
  d.content.title = "Pendulum on a Cart";
  setQuestion(d, id, words("Something else entirely"));
  assert.equal(d.content.title, "Pendulum on a Cart", "a title the author wrote is kept");
});

test("symbols written in the question's equations are offered, never saved", () => {
  assert.deepEqual(mathSymbols([{ kind: "text", text: "A block of mass " }, { kind: "math", latex: "m" }, { kind: "math", latex: "\\frac{1}{2}gt^2" }]), ["m", "g", "t"]);
  assert.deepEqual(mathSymbols([{ kind: "math", latex: "x+" }]), []);
});

test("a picture is one image block after the question, its alt text is required, and removing it removes the block", () => {
  const d = easyDraft("9.8", "m/s^2");
  const id = allParts(d)[0].part.id;
  const media = uuid();
  addPicture(d, id, media);
  addPicture(d, id, uuid());
  assert.equal(allParts(d)[0].part.blocks.filter((b) => b.kind === "image").length, 1, "only one picture");
  assert.equal(allParts(d)[0].part.blocks[1].kind, "image");
  assert.deepEqual(simpleIssues(d).map((i) => i.field), [`picture:${id}`]);
  setPictureAlt(d, id, "A cart on a slope");
  assert.deepEqual(simpleIssues(d), []);
  assert.deepEqual(pictureOf(allParts(d)[0].part.blocks)?.mediaId, media);
  removePicture(d, id);
  assert.equal(pictureOf(allParts(d)[0].part.blocks), null);
});

test("Simple notes what only Advanced holds", () => {
  assert.equal(advancedNote(blank()), "");
  const d = advancedDraft();
  assert.match(advancedNote(d), /2 sections/);
  assert.match(advancedNote(d), /hints/);
  assert.match(advancedNote(d), /method tags/);
});

test("a one-part expression problem written in Simple is a valid, publishable draft", () => {
  const d = easyDraft("\\frac{1}{2}mv^{2}");
  assert.deepEqual(simpleIssues(d), []);
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
  assert.deepEqual(simpleIssues(d), []);
  assert.ok(publishableDraftSchema.safeParse({ problemId: d.problemId, version: 1, ...draftPayload(d) }).success);
  setUnits(d, allParts(d)[0].part.id, "furlong");
  assert.match(simpleIssues(d).find((i) => i.field.startsWith("units:"))?.message ?? "", /don't know the unit/);
});

test("each thing that blocks Publish is named next to its own field", () => {
  const d = blank();
  const id = allParts(d)[0].part.id;
  assert.deepEqual(
    simpleIssues(d).map((i) => i.field),
    [`question:${id}`, `solution:${id}`, `answer:${id}`, "title", "rights", "difficulty"],
  );
  assert.deepEqual(simpleIssues(d, { [id]: "x+" }).find((i) => i.field === `answer:${id}`)?.message.includes("stops too soon"), true);
});

test("letters are automatic", () => {
  const d = blank();
  addPart(d);
  addPart(d);
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
          hints: [
            { id: uuid(), kind: "text" as const, spans: [{ kind: "text" as const, text: "Think about x" }] },
            { id: uuid(), kind: "math" as const, latex: "y=x^2" },
          ],
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

test("editing a draft with Advanced settings in Simple and switching back keeps every Advanced field", () => {
  const before = advancedDraft();
  assert.ok(authoredDraftSchema.safeParse({ problemId: before.problemId, version: 1, ...draftPayload(before) }).success);
  const after = structuredClone(before);
  const first = allParts(after)[0].part;
  // Everything Simple lets the author change.
  after.content.title = "A new title";
  setIntro(after, [{ kind: "text", text: "New intro with " }, { kind: "math", latex: "y" }]);
  setQuestion(after, first.id, words("What is the new question?"));
  setSolutionSpans(after, first.id, words("A solution"));
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
  // Put the Simple-edited values back and the two drafts must be identical.
  applyAnswer(after, second.id, readAnswer("4.9"), "4.9");
  after.content.title = before.content.title;
  after.content.context[0] = structuredClone(before.content.context[0]);
  first.blocks = structuredClone(before.content.sections[0].parts[0].blocks);
  const entry = after.privateParts.find((p) => p.partId === first.id)!;
  const original = before.privateParts.find((p) => p.partId === first.id)!;
  // Hints are not shown in Simple, so nothing touched them and nothing needs putting back.
  entry.solution = structuredClone(original.solution);
  after.privateParts = after.privateParts.map((p) => (p.partId === first.id ? { ...p, key: structuredClone(original.key) } : p));
  assert.deepEqual(after, before);
  // The rights stay as Advanced set them: Simple does not overwrite permission.
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

test("Studio's Final Answer refuses a bare log, so a new key is explicit, and accepts ln and log10", () => {
  const read = (text: string) => readAnswer(text);
  const bare = read("log(x)");
  assert.equal(bare.kind, "error");
  assert.equal((bare as { message: string }).message, "Write ln for the natural log, or log₁₀ for base 10.");
  assert.equal(read("ln(x)").kind, "expression");
  assert.equal(read(String.raw`\log_{10}(x)`).kind, "expression");
  assert.equal(read("log10(x)").kind, "expression");
});

test("the worked solution is required in Simple, and only in Simple", () => {
  const d = easyDraft("9.8", "m/s^2");
  const id = allParts(d)[0].part.id;
  assert.deepEqual(simpleIssues(d), []);
  setSolutionSpans(d, id, words("   "));
  assert.deepEqual(simpleIssues(d).map((i) => [i.field, i.message]), [[`solution:${id}`, "Add the worked solution."]]);
  // The saved draft is still valid: Advanced and older problems publish without a solution.
  const payload = { problemId: d.problemId, version: d.version, ...draftPayload(d) };
  assert.ok(authoredDraftSchema.safeParse(payload).success);
});

test("Where's it from: I wrote it, or Adapted from with a source and its own rights tick", () => {
  const d = blank();
  assert.deepEqual(sourceState(d), { choice: "wrote", ticked: false });
  setRights(d, true);
  assert.deepEqual(d.content.provenance, { kind: "original", source: "", rightsDeclaration: RIGHTS_TEXT });
  // Switching clears the tick, so a rights claim never carries over.
  setSourceChoice(d, "adapted");
  assert.deepEqual(d.content.provenance, { kind: "authorized", source: "", rightsDeclaration: "" });
  assert.deepEqual(simpleIssues(d).filter((i) => i.field === "source" || i.field === "rights").map((i) => [i.field, i.message]), [
    ["source", "Say where it's from."],
    ["rights", "Tick the box to say you have permission to share it."],
  ]);
  setSourceText(d, "IPhO 2019, Problem 2");
  setRights(d, true);
  assert.deepEqual(d.content.provenance, { kind: "authorized", source: "IPhO 2019, Problem 2", rightsDeclaration: ADAPTED_RIGHTS_TEXT });
  assert.equal(simpleIssues(d).some((i) => i.field === "source" || i.field === "rights"), false);
  assert.deepEqual(sourceState(d), { choice: "adapted", ticked: true, source: "IPhO 2019, Problem 2" });
  // Back to I wrote it: the source goes, the tick goes.
  setSourceChoice(d, "wrote");
  assert.deepEqual(d.content.provenance, { kind: "original", source: "", rightsDeclaration: "" });
  // A rights declaration written in Advanced is kept, not replaced by a tick.
  d.content.provenance = { kind: "authorized", source: "A textbook", rightsDeclaration: "The publisher allows it." };
  assert.deepEqual(sourceState(d), { choice: "advanced" });
  setSourceChoice(d, "wrote");
  setRights(d, true);
  assert.deepEqual(d.content.provenance, { kind: "authorized", source: "A textbook", rightsDeclaration: "The publisher allows it." });
  // What Simple saves is a valid provenance for the server, which is unchanged.
  const adapted = easyDraft("9.8", "m/s^2");
  setSourceChoice(adapted, "adapted");
  setSourceText(adapted, "IPhO 2019, Problem 2");
  setRights(adapted, true);
  assert.deepEqual(simpleIssues(adapted), []);
  assert.ok(publishableDraftSchema.safeParse({ problemId: adapted.problemId, version: adapted.version, ...draftPayload(adapted) }).success);
});

test("Studio keeps band presets and the complete exact-rating scale, and an empty box clears the rating", () => {
  const d = blank()
  assert.equal(difficultyRating(d), null)
  for (const rating of [...ratingBands.map((band) => band.middle), 0, 800, 801, 1800, 1801, 2600, 2601, 3201, 4000]) {
    assert.equal(setDifficulty(d, String(rating)), true)
    assert.equal(difficultyRating(d), rating)
    assert.equal(d.content.estimatedDifficulty, String(rating))
  }
  assert.equal(setDifficulty(d, ""), false)
  assert.equal(d.content.estimatedDifficulty, null)
})

test("estimated difficulty is a rating in the existing field, and an older label is kept until it is replaced", () => {
  const d = blank();
  assert.equal(difficultyRating(d), null);
  assert.equal(setDifficulty(d, "1850"), true);
  assert.equal(d.content.estimatedDifficulty, "1850");
  assert.equal(difficultyRating(d), 1850);
  assert.equal(setDifficulty(d, " 1,950 "), true);
  assert.equal(d.content.estimatedDifficulty, "1950");
  // Anything that is not a rating clears it, so Publish stays blocked until a valid one is typed.
  assert.equal(setDifficulty(d, "very hard"), false, "not saved");
  assert.equal(d.content.estimatedDifficulty, null);
  setDifficulty(d, "1950");
  assert.equal(setDifficulty(d, "4001"), false);
  assert.equal(d.content.estimatedDifficulty, null);
  assert.equal(setDifficulty(d, ""), false);
  assert.equal(d.content.estimatedDifficulty, null);
  d.content.estimatedDifficulty = "Hard";
  assert.equal(difficultyLabel(d), "Hard");
  assert.match(advancedNote(d), /a difficulty label/);
  d.content.estimatedDifficulty = "1850";
  assert.equal(difficultyLabel(d), "");
  assert.doesNotMatch(advancedNote(d), /difficulty/);
});

test("the main question can hold one image, and its alt text is required", () => {
  const d = easyDraft("9.8", "m/s^2");
  setIntro(d, words("Two carts roll on a track."));
  const media = uuid();
  addContextPicture(d, media);
  addContextPicture(d, uuid());
  assert.equal(d.content.context.filter((b) => b.kind === "image").length, 1);
  assert.equal(d.content.context[0].kind, "text");
  assert.equal(d.content.context[1].kind, "image");
  assert.deepEqual(simpleIssues(d).map((i) => i.field), ["picture:main"]);
  assert.doesNotMatch(advancedNote(d), /more blocks/, "Simple shows this image, so Advanced holds nothing more");
  setContextPictureAlt(d, "Two carts on a track");
  assert.deepEqual(simpleIssues(d), []);
  assert.equal(contextPictureOf(d)?.mediaId, media);
  removeContextPicture(d);
  assert.equal(contextPictureOf(d), null);
  assert.equal(blocksSpans(d.content.context).length > 0, true, "the text stays");
});

test("a difficulty rating from 0 to 4,000 is required to publish, in Simple and in the server check", () => {
  const d = easyDraft("9.8", "m/s^2");
  const publishable = () => publishableDraftSchema.safeParse({ problemId: d.problemId, version: d.version, ...draftPayload(d) });
  assert.deepEqual(simpleIssues(d), []);
  assert.ok(publishable().success);
  for (const text of ["", "   ", "abc", "4001", "-5", "12.5"]) {
    setDifficulty(d, text);
    assert.deepEqual(simpleIssues(d).map((i) => i.field), ["difficulty"], text);
    assert.deepEqual(simpleIssues(d).map((i) => i.message), ["Add a difficulty rating from 0 to 4,000."], text);
    assert.equal(publishable().success, false, text);
  }
  for (const rating of [0, 1, 2100, 4000]) {
    setDifficulty(d, String(rating));
    assert.deepEqual(simpleIssues(d), [], String(rating));
    assert.ok(publishable().success, String(rating));
  }
  // An older free-text label is not a rating, so it needs a number before the next publish.
  d.content.estimatedDifficulty = "Hard";
  assert.deepEqual(simpleIssues(d).map((i) => i.field), ["difficulty"]);
});
