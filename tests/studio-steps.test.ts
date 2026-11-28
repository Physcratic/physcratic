import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { publishableDraftSchema } from "../lib/problem-authoring";
import type { EditorDraft } from "../lib/problem-authoring-editor";
import { newProblem } from "../lib/problem-authoring-editor";
import { blockerField, publishBlockers, STEP_OF_CODE } from "../components/authoring/publish-blockers";
import { ensureSimpleShape, issueTarget, simpleIssues } from "../components/authoring/simple-model";
import { STUDIO_STEPS, barText, blockerJump, fieldStep, stepSummary } from "../components/authoring/studio-steps";
import { tours } from "../components/tour/tours";
import { BREAKS, broken, payload, validDraft } from "./publish-rule-fixtures";

function blank(): EditorDraft {
  const d = { problemId: randomUUID(), version: 1, state: "draft", slug: "", ...structuredClone(newProblem()) } as EditorDraft;
  ensureSimpleShape(d);
  return d;
}
const drafts = (): [string, EditorDraft][] => [
  ["blank", blank()],
  ["valid", validDraft()],
  ...(Object.keys(BREAKS) as (keyof typeof BREAKS)[]).map((code) => [code, broken(code)] as [string, EditorDraft]),
];

// The fields Simple names, as simpleIssues and blockerField write them. A part's fields carry its id.
const PART_FIELDS = ["question", "picture", "answer", "units", "solution", "options", "solution-options"];
const PROBLEM_FIELDS = ["parts", "statement", "picture:main", "title", "source", "rights", "difficulty", "topics", "options:problem", "review"];

test("every Simple field belongs to exactly one step", () => {
  const id = randomUUID();
  for (const field of [...PROBLEM_FIELDS, ...PART_FIELDS.map((kind) => `${kind}:${id}`)]) {
    const steps = STUDIO_STEPS.filter((s) => fieldStep(field) === s);
    assert.equal(steps.length, 1, `${field} is in one step`);
  }
  assert.equal(fieldStep("nothing"), null);
  assert.equal(fieldStep("answer"), null, "a part field needs its part");
});

test("every field Simple reports and every blocker field has a step", () => {
  for (const [name, d] of drafts()) {
    for (const issue of simpleIssues(d)) assert.ok(fieldStep(issue.field), `${name}: Simple's ${issue.field} has a step`);
    for (const fileFirst of [true]) for (const issue of simpleIssues(d, {}, fileFirst)) assert.ok(fieldStep(issue.field), `${name}: files view ${issue.field} has a step`);
    for (const b of publishBlockers(d)) assert.ok(fieldStep(blockerField(b, d)), `${name}: ${b.code} field has a step`);
  }
});

test("every blocker code's step contains its field", () => {
  for (const [name, d] of drafts()) {
    for (const b of publishBlockers(d)) {
      const field = blockerField(b, d);
      assert.equal(fieldStep(field), b.step, `${name}: ${b.code} is fixed in its own step, at ${field}`);
    }
  }
  // Each code's step from STEP_OF_CODE, with a part where the code is about one.
  const d = validDraft();
  const partId = d.content.sections[0].parts[0].id;
  for (const code of Object.keys(STEP_OF_CODE) as (keyof typeof STEP_OF_CODE)[]) {
    const b = { code, partId: ["part-needs-key", "reserved-variable", "reversed-variable-bounds", "empty-variable-domain", "duplicate-variable", "mismatched-private-part"].includes(code) ? partId : undefined, step: STEP_OF_CODE[code] };
    const field = blockerField(b, d);
    assert.equal(fieldStep(field), STEP_OF_CODE[code], `${code}: its step holds ${field}`);
  }
});

test("each undescribed image counts on the step where it is edited, with no exceptions", () => {
  const d = validDraft();
  const [a] = d.content.sections[0].parts;
  const img = (alt: string) => ({ id: randomUUID(), kind: "image" as const, mediaId: randomUUID(), alt, caption: "" });
  const mainPicture = img(""), sharedSetup = img(""), first = img("A ramp"), second = img(""), hint = img(""), solution = img(""), section = img("");
  d.content.context.push(mainPicture, sharedSetup);
  d.content.sections[0].blocks.push(section);
  a.blocks.push(first, second);
  d.privateParts[0].hints.push(hint);
  d.privateParts[0].solution.push(solution);
  d.content.attachments = [mainPicture, sharedSetup, section, first, second].map((x) => ({ id: x.mediaId, purpose: "statement-image" as const }));
  const where = publishBlockers(d).map((b) => [b.blockId, blockerField(b, d), b.step, stepSummary(d).counts[b.step] > 0]);
  assert.deepEqual(where, [
    [mainPicture.id, "picture:main", "question", true],
    [second.id, `options:${a.id}`, "question", true],
    [hint.id, `solution-options:${a.id}`, "worked-solution", true],
    [solution.id, `solution-options:${a.id}`, "worked-solution", true],
    [sharedSetup.id, "options:problem", "details", true],
    [section.id, "options:problem", "details", true],
  ], "in step order, each on the step that edits it");
  for (const b of publishBlockers(d)) assert.equal(fieldStep(blockerField(b, d)), b.step, `${b.blockId} is fixed on its own step`);
});

test("the rail counts each blocker on the step that holds its field", () => {
  for (const [name, d] of drafts()) {
    const counts = stepSummary(d).counts;
    for (const s of STUDIO_STEPS) assert.equal(counts[s], publishBlockers(d).filter((b) => blockerJump(b, d).step === s).length, `${name}: ${s}`);
  }
});

test("the bar counts exactly what publishBlockers lists, and is empty exactly when the server accepts", () => {
  for (const [name, d] of drafts()) {
    const summary = stepSummary(d);
    assert.equal(summary.blockers.length, publishBlockers(d).length, `${name}: the bar count`);
    assert.equal(Object.values(summary.counts).reduce((x, y) => x + y, 0), summary.blockers.length, `${name}: the step counts add up`);
    assert.equal(summary.text, barText(summary.blockers.length));
    assert.equal(summary.blockers.length === 0, publishableDraftSchema.safeParse(payload(d)).success, `${name}: Ready to publish only when the server accepts`);
  }
  assert.deepEqual([0, 1, 2, 7].map(barText), ["Ready to publish", "1 thing left", "2 things left", "7 things left"]);
});

test("the worked solution and the final answer Simple asks for are nudges, not counted", () => {
  const d = blank();
  const asks = simpleIssues(d).map((i) => i.field.split(":")[0]);
  assert.ok(asks.includes("solution") && asks.includes("answer"), "Simple asks for both");
  const codes = publishBlockers(d).map((b) => b.code);
  assert.deepEqual(codes, ["missing-statement", "missing-title-or-rights", "missing-difficulty"]);
});

test("jumping to a blocker opens the step that holds its field", () => {
  for (const [name, d] of drafts()) {
    for (const b of publishBlockers(d)) {
      const jump = blockerJump(b, d);
      assert.equal(jump.step, fieldStep(jump.field), `${name}: ${b.code} opens ${jump.step}`);
      assert.ok(issueTarget(jump.field), `${name}: ${b.code} has a place to focus`);
    }
  }
  const d = broken("missing-title-or-rights");
  assert.deepEqual(blockerJump(publishBlockers(d)[0], d), { step: "details", field: "title" });
  d.content.title = "Bob's Ramp";
  d.content.provenance.rightsDeclaration = "";
  assert.deepEqual(blockerJump(publishBlockers(d)[0], d), { step: "details", field: "rights" });
  const key = broken("part-needs-key");
  assert.deepEqual(blockerJump(publishBlockers(key)[0], key), { step: "answer", field: `answer:${key.privateParts[1].partId}` });
});

test("every Studio tour step names the step its target is on", () => {
  const where: Record<string, string> = {
    "studio-main": "question", "studio-question": "question", "studio-equation": "question", "studio-image": "question",
    "studio-answer": "answer", "studio-try": "answer", "studio-solution": "worked-solution",
    "studio-source": "details", "studio-difficulty": "details", "studio-more": "details", "studio-publish": "review",
  };
  for (const step of tours.studio.steps) {
    assert.ok(STUDIO_STEPS.includes(step.reveal as never), `${step.id} reveals a step`);
    for (const target of step.targets) assert.equal(where[target], step.reveal, `${step.id}: ${target} is on ${step.reveal}`);
  }
  // The tour follows the steps in order.
  const order = tours.studio.steps.map((s) => STUDIO_STEPS.indexOf(s.reveal as never));
  assert.deepEqual(order, [...order].sort((x, y) => x - y));
});
