import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { authoredDocumentSchema, authoredDraftSchema, authoredKeySchema, authoredProblemSchema, publishableDraftSchema, publicAuthoredRevision, type AuthoredDocument } from "./problem-authoring";
function fixture() {
  const content: AuthoredDocument = { title: "Two-part physics", topicTags: ["Mechanics"], methodTags: ["Energy"], estimatedDifficulty: null,
    context: [{ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: "A mass moves." }, { kind: "math", latex: "m>0" }] }],
    sections: [{ id: randomUUID(), title: "Motion", blocks: [], parts: [ { id: randomUUID(), label: "a", answerMode: "numeric", blocks: [] }, { id: randomUUID(), label: "b", answerMode: "expression", blocks: [] } ] }],
    provenance: { kind: "original", source: "", rightsDeclaration: "I own this work." }, attachments: [] };
  return { problemId: randomUUID(), version: 1, content, privateParts: [
    { partId: content.sections[0].parts[0].id, key: { kind: "numeric" as const, value: 0, units: "m", absTol: 0.01, relTol: 0 }, hints: [], solution: [] },
    { partId: content.sections[0].parts[1].id, key: { kind: "expression" as const, expected: "g*sin(3*theta)^(1/2)", variables: [{ name: "g", domain: "real" as const, assumptions: ["positive" as const] }, { name: "theta", domain: "real" as const, assumptions: [] }], angleUnit: "radians" as const, exclusions: [] }, hints: [], solution: [] },
  ] };
}
test("multi-part statement, private keys, inline math and order round-trip exactly", () => {
  const input = fixture();
  assert.deepEqual(publishableDraftSchema.parse(JSON.parse(JSON.stringify(input))), input);
});
test("incomplete draft may save without keys/rights; publication rejects it", () => {
  const input = fixture(); input.privateParts = []; input.content.provenance.rightsDeclaration = "";
  assert.equal(authoredDraftSchema.safeParse(input).success, true);
  assert.equal(publishableDraftSchema.safeParse(input).success, false);
});
test("rejects duplicate IDs across sections, parts, statement/private blocks and private parts", () => {
  for (const change of [
    (d: ReturnType<typeof fixture>) => { d.content.sections[0].parts[0].id = d.content.context[0].id; },
    (d: ReturnType<typeof fixture>) => { d.privateParts.push(d.privateParts[0]); },
    (d: ReturnType<typeof fixture>) => { d.privateParts[0].solution = [d.content.context[0]] as never; },
  ]) { const d = fixture(); change(d); assert.equal(authoredDraftSchema.safeParse(d).success, false); }
});
test("rejects orphan keys, mismatched modes, client identity and injected answer fields", () => {
  const d = fixture(); d.privateParts[0].partId = randomUUID();
  assert.equal(authoredDraftSchema.safeParse(d).success, false);
  const other = fixture(); other.content.sections[0].parts[0].answerMode = "manual";
  assert.equal(authoredDraftSchema.safeParse(other).success, false);
  assert.equal(authoredDraftSchema.safeParse({ ...fixture(), ownerId: "victim" }).success, false);
  const doc = fixture().content;
  assert.equal(authoredDocumentSchema.safeParse({ ...doc, expected: "secret" }).success, false);
  assert.equal(authoredDocumentSchema.safeParse({ ...doc, context: [{ ...doc.context[0], key: "secret" }] }).success, false);
});
test("numeric keys reject non-finite values and negative tolerances; zero is valid", () => {
  const key = fixture().privateParts[0].key;
  for (const value of [Infinity, NaN, -Infinity]) assert.equal(authoredKeySchema.safeParse({ ...key, value }).success, false);
  assert.equal(authoredKeySchema.safeParse({ ...key, absTol: -1 }).success, false);
  assert.equal(authoredKeySchema.safeParse(key).success, true);
});
test("expression keys reject duplicate/reserved variables and impossible bounds", () => {
  const key = fixture().privateParts[1].key;
  assert.equal(key.kind, "expression");
  if (key.kind !== "expression") throw new Error("fixture key");
  for (const variables of [ [key.variables[0], key.variables[0]], [{ name: "sin", domain: "real", assumptions: [] }], [{ name: "x", domain: "real", min: 3, max: 2, assumptions: [] }], [{ name: "x", domain: "real", max: 0, assumptions: ["positive"] }] ]) assert.equal(authoredKeySchema.safeParse({ ...key, variables }).success, false);
});
test("content has bounded sizes, strict block kinds, unique tags and valid image references", () => {
  const doc = fixture().content;
  for (const patch of [{ title: "x".repeat(201) }, { topicTags: ["a", "a"] }, { context: [{ id: randomUUID(), kind: "html", html: "<script>" }] }, { context: [{ id: randomUUID(), kind: "image", mediaId: randomUUID(), alt: "x", caption: "" }] }]) assert.equal(authoredDocumentSchema.safeParse({ ...doc, ...patch }).success, false);
});
test("publication requires explicit manual key, rights/source, native content and parts", () => {
  const d = fixture(); d.content.sections[0].parts[0].answerMode = "manual"; d.privateParts[0].key = { kind: "manual" } as never;
  assert.equal(publishableDraftSchema.safeParse(d).success, true);
  d.content.provenance.kind = "authorized";
  assert.equal(publishableDraftSchema.safeParse(d).success, false);
  d.content.provenance.source = "Written permission from owner"; d.content.context = [];
  assert.equal(publishableDraftSchema.safeParse(d).success, false);
});
test("public revision maps explicit fields and strips private solution attachment references", () => {
  const d = fixture(); d.content.attachments = [{ id: randomUUID(), purpose: "solution-pdf" }, { id: randomUUID(), purpose: "statement-pdf" }];
  const row = { id: randomUUID(), problemId: d.problemId, number: 1, schemaVersion: 1, content: d.content, publishedAt: "2026-10-31T00:00:00Z", privateParts: d.privateParts, ownerEmail: "secret", seeds: [42] };
  const output = publicAuthoredRevision(row);
  assert.deepEqual(Object.keys(output).sort(), ["id", "problemId", "number", "schemaVersion", "content", "publishedAt"].sort());
  assert.equal(output.content.attachments.length, 1);
  assert.equal(JSON.stringify(output).includes("g*sin"), false);
  assert.equal(JSON.stringify(output).includes("solution-pdf"), false);
  assert.equal(d.content.attachments.length, 2);
});
test("published problem requires revision pointer; slug is bounded and stable", () => {
  const p = { id: randomUUID(), slug: "physics-task", ownerId: "user", state: "published", publishedRevisionId: null };
  assert.equal(authoredProblemSchema.safeParse(p).success, false);
  assert.equal(authoredProblemSchema.safeParse({ ...p, publishedRevisionId: randomUUID() }).success, true);
});
test("mixed-case UUID duplicates are rejected across all identity/reference collections", () => {
  const mixedId = "abcdefab-cdef-4abc-8abc-abcdefabcdef";
  const mutate: ((d: ReturnType<typeof fixture>) => void)[] = [
    d => { d.content.sections[0].parts[0].id = mixedId; d.content.sections[0].parts[1].id = mixedId.toUpperCase(); },
    d => { d.content.context[0].id = mixedId; d.content.sections[0].id = mixedId.toUpperCase(); },
    d => { d.privateParts[0].partId = mixedId; d.privateParts.push({ ...d.privateParts[0], partId: mixedId.toUpperCase() }); d.content.sections[0].parts[0].id = mixedId; },
    d => { d.content.attachments = [{ id: mixedId, purpose: "statement-pdf" }, { id: mixedId.toUpperCase(), purpose: "solution-pdf" }]; },
    d => { d.content.context[0].id = mixedId; d.privateParts[0].solution = [{ id: mixedId.toUpperCase(), kind: "math", latex: "x" }] as never; },
  ];
  for (const change of mutate) { const d = fixture(); change(d); assert.equal(authoredDraftSchema.safeParse(d).success, false); }
});
test("uppercase references and private parts normalize before comparison and JSON persistence", () => {
  const d = fixture();
  const partId = "abcdefab-cdef-4abc-8abc-abcdefabcdef";
  const mediaId = "bcdefabc-defa-4bcd-8bcd-bcdefabcdefa";
  d.problemId = "ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF";
  d.content.sections[0].parts[0].id = partId;
  d.privateParts[0].partId = partId.toUpperCase();
  d.content.context.push({ id: randomUUID().toUpperCase(), kind: "image", mediaId: mediaId.toUpperCase(), alt: "Diagram", caption: "" });
  d.content.attachments = [{ id: mediaId, purpose: "statement-image" }];
  const parsed = publishableDraftSchema.parse(d);
  assert.equal(parsed.problemId, partId);
  assert.equal(parsed.privateParts[0].partId, partId);
  assert.equal(parsed.privateParts[0].partId, parsed.content.sections[0].parts[0].id);
  const image = parsed.content.context[1];
  assert.equal(image.kind, "image");
  if (image.kind === "image") assert.equal(image.mediaId, parsed.content.attachments[0].id);
  assert.deepEqual(authoredDraftSchema.parse(JSON.parse(JSON.stringify(parsed))), parsed);
  assert.equal(d.privateParts[0].partId, partId.toUpperCase(), "parsing must not mutate caller objects");
});
test("Drizzle-shaped Date rows serialize ISO timestamps without leaking private fields", () => {
  const d = fixture();
  d.content.attachments = [{ id: randomUUID(), purpose: "solution-pdf" }];
  const date = new Date("2026-10-31T08:00:00+08:00");
  const row = { id: randomUUID().toUpperCase(), problemId: d.problemId, number: 1, schemaVersion: 1, content: d.content, publishedAt: date,
    privateParts: d.privateParts, ownerEmail: "private", seeds: [42] };
  const result = publicAuthoredRevision(row);
  assert.equal(result.publishedAt, "2026-10-31T00:00:00.000Z");
  assert.deepEqual(result, publicAuthoredRevision({ ...row, publishedAt: date.toISOString() }));
  assert.equal(result.id, row.id.toLowerCase());
  assert.equal(JSON.stringify(result).includes("g*sin"), false);
  assert.equal(JSON.stringify(result).includes("solution-pdf"), false);
  assert.equal("privateParts" in result || "ownerEmail" in result || "seeds" in result, false);
  for (const publishedAt of [new Date(NaN), 0, null, "not-a-date"]) assert.throws(() => publicAuthoredRevision({ ...row, publishedAt }));
  assert.equal(row.publishedAt, date);
});

test("publication requires alt text for both statement and private images", () => {
  const d = fixture(), mediaId = randomUUID();
  d.content.context.push({id:randomUUID(),kind:"image",mediaId,alt:" ",caption:""});
  d.content.attachments.push({id:mediaId,purpose:"statement-image"});
  assert.equal(authoredDraftSchema.safeParse(d).success,true);
  assert.equal(publishableDraftSchema.safeParse(d).success,false);
  (d.content.context[1] as {alt:string}).alt="Diagram";
  assert.equal(publishableDraftSchema.safeParse(d).success,true);
  d.privateParts[0].hints=[{id:randomUUID(),kind:"image",mediaId:randomUUID(),alt:"",caption:""}] as never;
  assert.equal(publishableDraftSchema.safeParse(d).success,false);
});
