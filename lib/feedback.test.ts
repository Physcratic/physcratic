import assert from "node:assert/strict";
import test from "node:test";
import { buildFeedbackHref, MAX_PAGE_LENGTH } from "./feedback";

const TALLY = "https://tally.so/r/rD5oVX?page={page}&ref={ref}";

test("unset and blank base give null", () => {
  assert.equal(buildFeedbackHref(undefined, { page: "/a" }), null);
  assert.equal(buildFeedbackHref("", { page: "/a" }), null);
  assert.equal(buildFeedbackHref("   ", { page: "/a" }), null);
});

test("unsafe or unsupported schemes give null", () => {
  for (const base of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,hi",
    "http://example.com/form",
    "not a url",
  ]) {
    assert.equal(buildFeedbackHref(base, { page: "/a" }), null, base);
  }
});

test("real Tally URL with raw tokens", () => {
  assert.equal(
    buildFeedbackHref(TALLY, { page: "/dashboard?view=problems", ref: "abc123" }),
    "https://tally.so/r/rD5oVX?page=%2Fdashboard%3Fview%3Dproblems&ref=abc123",
  );
});

test("URL-encoded tokens, any case", () => {
  assert.equal(
    buildFeedbackHref("https://x.test/f?p=%7Bpage%7D&r=%7BREF%7D", {
      page: "/a b",
      ref: "r&1",
    }),
    "https://x.test/f?p=%2Fa%20b&r=r%261",
  );
});

test("missing ref becomes an empty string", () => {
  assert.equal(
    buildFeedbackHref(TALLY, { page: "/x" }),
    "https://tally.so/r/rD5oVX?page=%2Fx&ref=",
  );
});

test("https without tokens is returned unchanged", () => {
  const base = "https://forms.example.com/feedback";
  assert.equal(buildFeedbackHref(base, { page: "/x", ref: "y" }), base);
});

test("hash is dropped from page", () => {
  assert.equal(
    buildFeedbackHref(TALLY, { page: "/x?a=1#section" }),
    "https://tally.so/r/rD5oVX?page=%2Fx%3Fa%3D1&ref=",
  );
});

test("mailto without a query", () => {
  assert.equal(
    buildFeedbackHref("mailto:beta@example.com", { page: "/x" }),
    `mailto:beta@example.com?subject=${encodeURIComponent("Physcratic beta feedback")}&body=${encodeURIComponent("Page: /x\n\n")}`,
  );
});

test("mailto includes Reference only when present", () => {
  const withRef = buildFeedbackHref("mailto:b@e.com", { page: "/x", ref: "d1" })!;
  assert.ok(withRef.includes(encodeURIComponent("Reference: d1")));
  const without = buildFeedbackHref("mailto:b@e.com", { page: "/x" })!;
  assert.ok(!without.includes("Reference"));
});

test("mailto preserves an existing query", () => {
  const href = buildFeedbackHref("mailto:b@e.com?cc=c%40e.com", { page: "/x" })!;
  assert.ok(href.startsWith("mailto:b@e.com?cc=c%40e.com&subject="));
  assert.ok(href.includes("&body="));
});

test("long page is truncated to 300 characters", () => {
  const href = buildFeedbackHref(TALLY, { page: "/" + "a".repeat(1000) })!;
  const page = decodeURIComponent(href.split("page=")[1].split("&")[0]);
  assert.equal(page.length, MAX_PAGE_LENGTH);
});
