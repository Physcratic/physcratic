import assert from "node:assert/strict";
import test from "node:test";
import { CONSULTATION_FORM_URL, coachingPathways, consultationHref, consultationSource } from "./coaching/consultation";

test("pathways are in the agreed order", () => {
  assert.deepEqual([...coachingPathways], ["Olympiad Beginner", "Olympiad Intermediate", "Olympiad Advanced", "IB or A-Level", "Not sure yet"]);
});

test("href encodes pathway and source", () => {
  assert.equal(
    consultationHref({ pathway: "IB or A-Level", source: "news site/a&b" }),
    `${CONSULTATION_FORM_URL}?pathway=IB%20or%20A-Level&source=news%20site%2Fa%26b`,
  );
});

test("href leaves out empty values", () => {
  assert.equal(consultationHref({ pathway: "Not sure yet", source: "" }), `${CONSULTATION_FORM_URL}?pathway=Not%20sure%20yet`);
  assert.equal(consultationHref({ pathway: "", source: "direct" }), `${CONSULTATION_FORM_URL}?source=direct`);
  assert.equal(consultationHref({}), CONSULTATION_FORM_URL);
});

test("href rejects an unknown pathway", () => {
  assert.throws(() => consultationHref({ pathway: "Tutor inquiry", source: "direct" }));
});

test("utm_source wins over the referrer", () => {
  assert.equal(consultationSource("?utm_source=newsletter", "https://www.google.com/"), "newsletter");
});

test("referrer hostname is used when no utm_source", () => {
  assert.equal(consultationSource("", "https://www.google.com/search?q=x"), "google.com");
});

test("own-site referrer gives direct", () => {
  assert.equal(consultationSource("", "https://physcratic.com/dashboard"), "direct");
  assert.equal(consultationSource("", "https://www.physcratic.com/"), "direct");
  assert.equal(consultationSource("", ""), "direct");
  assert.equal(consultationSource("", "not a url"), "direct");
});

test("source is capped at 100 characters", () => {
  assert.equal(consultationSource(`?utm_source=${"a".repeat(300)}`, "").length, 100);
});
