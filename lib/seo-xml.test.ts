import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { xmlEscape } from "./seo/xml";

describe("xmlEscape", () => {
  it("escapes & < > \" '", () => {
    assert.equal(xmlEscape(`&<>"'`), "&amp;&lt;&gt;&quot;&apos;");
  });
  it("escapes & first so entities are not double-escaped", () => {
    assert.equal(
      xmlEscape("https://x.test/?view=problems&topic=Mechanics"),
      "https://x.test/?view=problems&amp;topic=Mechanics",
    );
    assert.equal(xmlEscape("a&amp;b"), "a&amp;amp;b");
  });
  it("leaves plain text alone", () => {
    assert.equal(xmlEscape("https://x.test/dashboard"), "https://x.test/dashboard");
  });
});
