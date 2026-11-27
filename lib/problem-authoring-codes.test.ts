import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publishableDraftSchema } from "./problem-authoring";
import { DRAFT_RULE_CODES, ISSUE_CODES, PUBLISH_RULE_CODES, codeOfIssue } from "./problem-authoring-codes";
import { BREAKS, broken, payload, validDraft } from "../tests/publish-rule-fixtures";

const issues = (d: ReturnType<typeof validDraft>) => publishableDraftSchema.safeParse(payload(d)).error?.issues ?? [];

test("the valid fixture publishes", () => {
  assert.deepEqual(issues(validDraft()).map((i) => i.message), []);
});

test("every rule, broken on its own, is reported by the schema with its known code and nothing comes back unknown", () => {
  for (const code of Object.keys(BREAKS) as (keyof typeof BREAKS)[]) {
    const found = issues(broken(code));
    assert.ok(found.length > 0, `${code}: the schema refuses it`);
    const codes = found.map((i) => codeOfIssue(i));
    assert.ok(codes.includes(code), `${code}: the schema reports it, got ${codes.join(", ")}`);
    const unknown = found.filter((i) => codeOfIssue(i) === "unknown").map((i) => i.message);
    assert.deepEqual(unknown, [], `${code}: a schema message has no code. A publish message changed, update the code map in lib/problem-authoring-codes.ts`);
  }
});

test("every code in the map has a broken draft, and codes are unique", () => {
  const codes = Object.values(ISSUE_CODES);
  assert.equal(new Set(codes).size, codes.length, "a code is used twice");
  assert.deepEqual([...codes].sort(), Object.keys(BREAKS).sort());
});

test("a message outside the map reads as unknown", () => {
  assert.equal(codeOfIssue({ message: "Too big: expected string to have <=200 characters" }), "unknown");
  assert.equal(codeOfIssue({ message: "title and rights provenance required" }), "unknown");
});

// The pinned file's messages, read from its source. A copy edit there fails here before the map goes stale.
const source = readFileSync(new URL("./problem-authoring.ts", import.meta.url), "utf8");
const publishStart = source.indexOf("export const publishableDraftSchema");
const publishSource = source.slice(publishStart, source.indexOf("\n});", publishStart));
const draftSource = source.slice(0, publishStart);
const messages = (s: string) => [...s.matchAll(/message: "([^"]+)"/g)].map((m) => m[1]);
const refineMessages = (s: string) => [...s.matchAll(/, "([A-Z][^"]+)"\)/g)].map((m) => m[1]);

test("the publish messages are exactly these, byte for byte", () => {
  const snapshot = [
    "Title and rights provenance required",
    "Add a statement and at least one part. Use text, statement images or a statement PDF.",
    "Every image requires descriptive alternative text before publication",
    "Every published part requires a key or explicit manual mode",
    "Add a difficulty rating from 0 to 4,000.",
  ];
  assert.deepEqual(messages(publishSource), snapshot, "a publish message changed, update the code map in lib/problem-authoring-codes.ts");
  assert.deepEqual(Object.keys(PUBLISH_RULE_CODES), snapshot, "a publish message changed, update the code map in lib/problem-authoring-codes.ts");
});

test("the draft rule messages are exactly these, byte for byte", () => {
  const snapshot = [
    "Duplicate tags",
    "Duplicate section, part or block ID",
    "Duplicate media reference",
    "Image requires statement-image reference",
    "Document exceeds total size limit",
    "Reserved variable",
    "Reversed variable bounds",
    "Empty variable domain",
    "Duplicate variables",
    "Missing, duplicate or mismatched private part",
    "Duplicate private block ID",
    "Draft exceeds total size limit",
  ];
  const found = [...messages(draftSource), ...refineMessages(draftSource)];
  assert.deepEqual([...found].sort(), [...snapshot].sort(), "a draft rule message changed, update the code map in lib/problem-authoring-codes.ts");
  assert.deepEqual(Object.keys(DRAFT_RULE_CODES), snapshot, "a draft rule message changed, update the code map in lib/problem-authoring-codes.ts");
});
