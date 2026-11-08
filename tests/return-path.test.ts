import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnTo, returnFallbackPath } from "../components/account/return-path";

test("the fallback is the dashboard, never the submissions page", () => {
  assert.equal(returnFallbackPath, "/dashboard");
  assert.notEqual(returnFallbackPath, "/dashboard/submissions");
});

test("same-site paths are kept as they are", () => {
  for (const good of ["/dashboard", "/dashboard/submissions", "/dashboard/problems/incline", "/dashboard?view=problems&topic=Waves", "/settings", "/coaching", "/problems/topics/waves#top", "/", "/a/b?next=https://example.com"])
    assert.equal(safeReturnTo(good), good, good);
});

test("addresses on other sites fall back", () => {
  for (const bad of ["https://evil.com", "http://evil.com/dashboard", "//evil.com", "//evil.com/dashboard", "///evil.com", "/\\evil.com", "\\\\evil.com", "/dashboard\\evil.com", "evil.com", "ftp://evil.com"])
    assert.equal(safeReturnTo(bad), "/dashboard", bad);
});

test("schemes that run code or carry data fall back", () => {
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "/javascript:alert(1)\\"])
    assert.equal(safeReturnTo(bad), "/dashboard", bad);
});

test("tabs, newlines and spaces that the URL parser would strip fall back", () => {
  for (const bad of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/ /evil.com", "/dashboard\nSet-Cookie: x=1", "/dash board", "/\u0000", "/\u007f"])
    assert.equal(safeReturnTo(bad), "/dashboard", JSON.stringify(bad));
});

test("anything that is not a non-empty string falls back", () => {
  for (const bad of [undefined, null, 5, {}, [], ["/dashboard"], "", true]) assert.equal(safeReturnTo(bad), "/dashboard");
});

test("a very long value falls back", () => {
  assert.equal(safeReturnTo("/" + "a".repeat(2001)), "/dashboard");
  assert.equal(safeReturnTo("/" + "a".repeat(1999)), "/" + "a".repeat(1999));
});
