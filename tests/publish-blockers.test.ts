import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { publishableDraftSchema } from "../lib/problem-authoring";
import { ISSUE_CODES, codeOfIssue, type IssueCode } from "../lib/problem-authoring-codes";
import type { EditorDraft } from "../lib/problem-authoring-editor";
import { PUBLISH_STEPS, STEP_OF_CODE, publishBlockers, type PublishBlocker } from "../components/authoring/publish-blockers";
import { issueTarget, simpleIssues } from "../components/authoring/simple-model";
import { BREAKS, broken, payload, validDraft } from "./publish-rule-fixtures";

const server = (d: EditorDraft) => publishableDraftSchema.safeParse(payload(d));
const codesOf = (d: EditorDraft) => new Set((server(d).error?.issues ?? []).map((i) => codeOfIssue(i)));
const ALL_CODES = [...Object.values(ISSUE_CODES), "unknown"] as IssueCode[];
// The forms issueTarget gives and Simple renders as data-simple-field.
const TARGET = /^(title|source|rights|difficulty|topics|statement|parts|o:problem|[qaupso]:(main|[0-9a-f-]{36}))$/;

test("every code has a step and a target", () => {
  const d = validDraft();
  const partId = d.content.sections[0].parts[0].id;
  for (const code of ALL_CODES) {
    assert.ok(PUBLISH_STEPS.includes(STEP_OF_CODE[code]), `${code} has a step`);
    for (const blocker of [{ code, step: STEP_OF_CODE[code] }, { code, partId, step: STEP_OF_CODE[code] }] as PublishBlocker[])
      assert.match(issueTarget(blocker, d), TARGET, `${code} has a target`);
  }
  assert.equal(STEP_OF_CODE.unknown, "review");
});

test("one broken draft per rule: publishBlockers names it, with a step and a target", () => {
  for (const code of Object.keys(BREAKS) as (keyof typeof BREAKS)[]) {
    const d = broken(code);
    const blockers = publishBlockers(d);
    assert.ok(blockers.some((b) => b.code === code), `${code}: listed, got ${blockers.map((b) => b.code)}`);
    for (const b of blockers) assert.match(issueTarget(b, d), TARGET, `${code}: ${b.code} has a target`);
  }
});

function parityDrafts(): [string, EditorDraft][] {
  const drafts: [string, EditorDraft][] = [["valid", validDraft()]];
  for (const code of Object.keys(BREAKS) as (keyof typeof BREAKS)[]) drafts.push([code, broken(code)]);
  const several = validDraft();
  for (const code of ["missing-title-or-rights", "missing-difficulty", "part-needs-key", "duplicate-tag"] as const) BREAKS[code](several);
  drafts.push(["several at once", several]);
  const tooLong = validDraft();
  tooLong.content.title = "x".repeat(201);
  drafts.push(["a built-in length check", tooLong]);
  const manual = validDraft();
  manual.content.sections[0].parts[1].answerMode = "manual";
  manual.privateParts[1].key = { kind: "manual" };
  drafts.push(["valid with a manual part", manual]);
  return drafts;
}

test("parity: publishBlockers is empty exactly when the server accepts, and names the same codes", () => {
  for (const [name, d] of parityDrafts()) {
    const blockers = publishBlockers(d);
    assert.equal(blockers.length === 0, server(d).success, `${name}: empty exactly when publishable`);
    assert.deepEqual(new Set(blockers.map((b) => b.code)), codesOf(d), `${name}: the same codes as the server`);
  }
});

test("an issue with no code is still a blocker, in review", () => {
  const d = validDraft();
  d.content.title = "x".repeat(201);
  assert.deepEqual(publishBlockers(d), [{ code: "unknown", step: "review" }]);
});

test("each part without a key is listed by its id", () => {
  const d = validDraft();
  d.privateParts.forEach((p) => (p.key = null));
  const [a, b] = d.content.sections[0].parts.map((p) => p.id);
  assert.deepEqual(publishBlockers(d), [{ code: "part-needs-key", partId: a, step: "answer" }, { code: "part-needs-key", partId: b, step: "answer" }]);
  assert.deepEqual(publishBlockers(d).map((x) => issueTarget(x, d)), [`a:${a}`, `a:${b}`]);
});

test("each undescribed image is listed by its block, and one in the worked solution is in that step", () => {
  const d = validDraft();
  const [a, b] = d.content.sections[0].parts;
  const described = { id: randomUUID(), kind: "image" as const, mediaId: randomUUID(), alt: "A ramp", caption: "" };
  const inPart = { ...described, id: randomUUID(), mediaId: randomUUID(), alt: "" };
  const second = { ...described, id: randomUUID(), mediaId: randomUUID(), alt: " " };
  const inContext = { ...described, id: randomUUID(), mediaId: randomUUID(), alt: "" };
  const inSolution = { ...described, id: randomUUID(), mediaId: randomUUID(), alt: "" };
  a.blocks.push(inPart);
  b.blocks.push(described, second);
  d.content.context.push(inContext);
  d.privateParts[1].solution = [inSolution];
  d.content.attachments = [inPart, described, second, inContext].map((x) => ({ id: x.mediaId, purpose: "statement-image" as const }));
  const blockers = publishBlockers(d);
  assert.deepEqual(blockers, [
    { code: "image-needs-alt", blockId: inContext.id, step: "question" },
    { code: "image-needs-alt", blockId: inPart.id, partId: a.id, step: "question" },
    { code: "image-needs-alt", blockId: second.id, partId: b.id, step: "question" },
    { code: "image-needs-alt", blockId: inSolution.id, partId: b.id, step: "worked-solution" },
  ]);
  assert.deepEqual(blockers.map((x) => issueTarget(x, d)), ["p:main", `p:${a.id}`, `o:${b.id}`, `o:${b.id}`]);
});

test("blockers are ordered by step, then by the schema's order", () => {
  const d = validDraft();
  for (const code of ["missing-difficulty", "duplicate-private-id", "part-needs-key", "missing-statement", "missing-title-or-rights"] as const) BREAKS[code](d);
  const blockers = publishBlockers(d);
  assert.deepEqual(blockers.map((b) => b.code), ["missing-statement", "part-needs-key", "missing-title-or-rights", "missing-difficulty", "duplicate-private-id"]);
  const steps = blockers.map((b) => PUBLISH_STEPS.indexOf(b.step));
  assert.deepEqual(steps, [...steps].sort((x, y) => x - y));
});

test("a tag issue knows its list, and a variable issue knows its part", () => {
  const d = validDraft();
  d.content.methodTags = ["energy", "energy"];
  assert.deepEqual(publishBlockers(d), [{ code: "duplicate-tag", list: "methodTags", step: "details" }]);
  assert.equal(issueTarget(publishBlockers(d)[0], d), "o:problem");
  const t = broken("duplicate-tag");
  assert.equal(issueTarget(publishBlockers(t)[0], t), "topics");
  const v = broken("reserved-variable");
  const partId = v.privateParts[1].partId;
  assert.deepEqual(publishBlockers(v), [{ code: "reserved-variable", partId, step: "answer" }]);
  assert.equal(issueTarget(publishBlockers(v)[0], v), `a:${partId}`);
});

test("the worked solution stays a nudge: it is not a blocker", () => {
  const d = validDraft();
  d.privateParts.forEach((p) => (p.solution = []));
  assert.equal(server(d).success, true);
  assert.deepEqual(publishBlockers(d), []);
  assert.ok(simpleIssues(d).some((i) => i.field.startsWith("solution:")), "Simple still asks for it");
});

test("issueTarget for a field string is unchanged", () => {
  const id = randomUUID();
  assert.equal(issueTarget(`question:${id}`), `q:${id}`);
  assert.equal(issueTarget(`answer:${id}`), `a:${id}`);
  assert.equal(issueTarget(`units:${id}`), `u:${id}`);
  assert.equal(issueTarget(`picture:${id}`), `p:${id}`);
  assert.equal(issueTarget(`solution:${id}`), `s:${id}`);
  assert.equal(issueTarget(`options:${id}`), `o:${id}`);
  for (const plain of ["title", "rights", "source", "difficulty", "topics", "statement", "parts"]) assert.equal(issueTarget(plain), plain);
});
