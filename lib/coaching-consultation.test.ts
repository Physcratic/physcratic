import assert from "node:assert/strict";
import test from "node:test";
import { CONSULTATION_FORM_URL, TUTOR_FORM_URL, coachingPathways, consultationHref, consultationSource, tutorFormHref } from "./coaching/consultation";

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

test("the form URLs are the two Tally forms", () => {
  assert.equal(CONSULTATION_FORM_URL, "https://tally.so/r/XxZBr4");
  assert.equal(TUTOR_FORM_URL, "https://tally.so/r/MeodDX");
});

test("tutor link carries only the source", () => {
  assert.equal(tutorFormHref({ source: "direct" }), `${TUTOR_FORM_URL}?source=direct`);
  assert.equal(tutorFormHref({ source: "news site/a&b" }), `${TUTOR_FORM_URL}?source=news%20site%2Fa%26b`);
  assert.equal(tutorFormHref({ source: "x".repeat(150) }), `${TUTOR_FORM_URL}?source=${"x".repeat(100)}`);
  assert.equal(tutorFormHref({ source: "" }), TUTOR_FORM_URL);
  assert.equal(tutorFormHref({}), TUTOR_FORM_URL);
});

test("the consultation page asks for 'Not sure yet' and the training page asks for 'IB or A-Level'", () => {
  assert.equal(consultationHref({ pathway: "Not sure yet", source: "direct" }), `${CONSULTATION_FORM_URL}?pathway=Not%20sure%20yet&source=direct`);
  assert.equal(consultationHref({ pathway: "IB or A-Level", source: "direct" }), `${CONSULTATION_FORM_URL}?pathway=IB%20or%20A-Level&source=direct`);
});
