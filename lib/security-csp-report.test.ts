import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { POST } from "../app/api/csp-report/route";
import { MAX_REPORT_BYTES, blockedOrigin, pagePath, parseCspReports } from "./security/csp-report";

describe("parseCspReports", () => {
  it("reads the report-uri shape and drops query strings and paths", () => {
    const lines = parseCspReports({ "csp-report": { "document-uri": "https://physcratic.com/coaching?goal=x&token=secret#frag", "violated-directive": "script-src-elem 'self'", "effective-directive": "script-src-elem", "blocked-uri": "https://evil.example/a/b.js?key=1" } });
    assert.deepEqual(lines, [{ directive: "script-src-elem", blocked: "https://evil.example", path: "/coaching" }]);
  });

  it("reads the Reporting API shape, several reports at once", () => {
    const lines = parseCspReports([
      { type: "csp-violation", url: "https://physcratic.com/learn?q=1", body: { effectiveDirective: "img-src", blockedURL: "https://cdn.example/x.png?sig=1" } },
      { type: "csp-violation", url: "https://physcratic.com/", body: { effectiveDirective: "script-src", blockedURL: "inline", documentURL: "https://physcratic.com/dashboard?view=problems" } },
      { type: "deprecation", body: {} },
    ]);
    assert.deepEqual(lines, [
      { directive: "img-src", blocked: "https://cdn.example", path: "/learn" },
      { directive: "script-src", blocked: "inline", path: "/dashboard" },
    ]);
  });

  it("keeps keywords and schemes, and survives junk", () => {
    assert.equal(blockedOrigin("eval"), "eval");
    assert.equal(blockedOrigin("data:image/png;base64,AAAA"), "data:");
    assert.equal(blockedOrigin("blob:https://physcratic.com/uuid"), "https://physcratic.com");
    assert.equal(blockedOrigin(undefined), "unknown");
    assert.equal(pagePath(undefined), "unknown");
    assert.equal(pagePath("/already/a/path?x=1"), "/already/a/path");
    assert.deepEqual(parseCspReports(null), []);
    assert.deepEqual(parseCspReports("text"), []);
    assert.deepEqual(parseCspReports([1, null, {}]), []);
  });

  it("cuts long values and removes line breaks so a report cannot forge a log line", () => {
    const [line] = parseCspReports({ "csp-report": { "violated-directive": "script-src\n[csp] fake", "blocked-uri": "x".repeat(300), "document-uri": "https://a.example/" + "p".repeat(300) } });
    assert.ok(!/[\n\r]/.test(JSON.stringify(line).replace(/\\n/g, "")) && !line.directive.includes("\n"));
    assert.ok(line.blocked.length <= 100 && line.path.length <= 100);
  });
});

describe("POST /api/csp-report", () => {
  let warn: ReturnType<typeof mock.method>;
  beforeEach(() => { warn = mock.method(console, "warn", () => {}); });
  afterEach(() => { warn.mock.restore(); });

  const send = (body: string, type = "application/csp-report") => POST(new Request("http://localhost/api/csp-report", { method: "POST", headers: { "content-type": type }, body }));
  const report = JSON.stringify({ "csp-report": { "document-uri": "https://physcratic.com/sign-up?email=a@b.c", "effective-directive": "frame-src", "blocked-uri": "https://www.google.com/recaptcha/enterprise/anchor?k=1" } });

  it("logs one line per report and answers 204", async () => {
    const res = await send(report);
    assert.equal(res.status, 204);
    assert.equal(warn.mock.callCount(), 1);
    assert.deepEqual(warn.mock.calls[0].arguments, ["[csp]", "frame-src", "https://www.google.com", "/sign-up"]);
    assert.ok(!JSON.stringify(warn.mock.calls[0].arguments).includes("email"));
  });

  it("accepts application/reports+json with a charset", async () => {
    const res = await send(JSON.stringify([{ type: "csp-violation", url: "https://physcratic.com/", body: { effectiveDirective: "img-src", blockedURL: "https://x.example/i.png" } }]), "application/reports+json; charset=utf-8");
    assert.equal(res.status, 204);
    assert.deepEqual(warn.mock.calls[0].arguments, ["[csp]", "img-src", "https://x.example", "/"]);
  });

  it("answers 204 and logs nothing for a wrong type, bad JSON or an oversized body", async () => {
    assert.equal((await send(report, "text/plain")).status, 204);
    assert.equal((await send("{not json")).status, 204);
    assert.equal((await send(JSON.stringify({ "csp-report": { "blocked-uri": "x".repeat(MAX_REPORT_BYTES) } }))).status, 204);
    assert.equal((await send("")).status, 204);
    assert.equal(warn.mock.callCount(), 0);
  });

  it("only exports POST", async () => {
    const route = await import("../app/api/csp-report/route");
    assert.deepEqual(Object.keys(route).filter((key) => /^(GET|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(key)), []);
  });
});
