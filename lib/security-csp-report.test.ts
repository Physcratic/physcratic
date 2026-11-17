import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { POST } from "../app/api/csp-report/route";
import { MAX_REPORT_BYTES, MAX_REPORT_READ_MS, blockedOrigin, pagePath, parseCspReports } from "./security/csp-report";

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
    assert.equal(pagePath("/already/a/path?x=1"), "other");
    assert.deepEqual(parseCspReports(null), []);
    assert.deepEqual(parseCspReports("text"), []);
    assert.deepEqual(parseCspReports([1, null, {}]), []);
  });

  it("projects private path segments to fixed route labels in both report formats", () => {
    for (const [path, label] of [
      ["/u/private_person", "/u/[handle]"],
      ["/dashboard/authored/private-id", "/dashboard/authored/[id]"],
      ["/dashboard/contests/private-id", "/dashboard/contests/[id]"],
      ["/dashboard/problems/private-id", "/dashboard/problems/[id]"],
      ["/learn/private-id", "/learn/[slug]"],
      ["/problems/topics/private-id", "/problems/topics/[slug]"],
      ["/private_person@example.invalid/private-id", "other"],
      ["/u/private_person/extra-private-id", "other"],
      ["/u/%70rivate_person", "/u/[handle]"],
    ]) {
      const uri = `https://physcratic.test${path}?token=secret#secret`;
      assert.equal(pagePath(uri), label);
      assert.equal(pagePath(`${path}?token=secret`), label);
      const payloads = [
        { "csp-report": { "document-uri": uri, "effective-directive": "script-src", "blocked-uri": "eval" } },
        [{ type: "csp-violation", url: uri, body: { effectiveDirective: "script-src", blockedURL: "eval" } }],
      ];
      for (const payload of payloads) {
        const lines = parseCspReports(payload);
        assert.deepEqual(lines, [{ directive: "script-src", blocked: "eval", path: label }]);
        assert.doesNotMatch(JSON.stringify(lines), /private_person|private-id|secret|token/);
      }
    }
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

  it("never logs a profile handle or private resource ID", async () => {
    for (const path of ["/u/private_person", "/dashboard/authored/private-id", "/unknown/private-id"]) {
      assert.equal((await send(JSON.stringify({ "csp-report": { "document-uri": `https://physcratic.test${path}`, "effective-directive": "script-src", "blocked-uri": "eval" } }))).status, 204);
    }
    assert.equal(warn.mock.callCount(), 3);
    assert.deepEqual(warn.mock.calls.map(call => call.arguments.at(-1)), ["/u/[handle]", "/dashboard/authored/[id]", "other"]);
    assert.doesNotMatch(JSON.stringify(warn.mock.calls), /private_person|private-id/);
  });

  it("finishes a stalled body within the read deadline even when cancellation stalls", async t => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode("{")); },
      cancel() { cancelled = true; return new Promise<void>(() => {}); },
    });
    const request = new Request("http://localhost/api/csp-report", { method: "POST", headers: { "content-type": "application/csp-report" }, body: stream, duplex: "half" } as RequestInit);
    const pending = POST(request);
    t.mock.timers.tick(MAX_REPORT_READ_MS + 1);
    assert.equal((await pending).status, 204);
    assert.equal(cancelled, true);
    assert.equal(warn.mock.callCount(), 0);
  });

  it("answers 204 and logs nothing for a wrong type, bad JSON or an oversized body", async () => {
    assert.equal((await send(report, "text/plain")).status, 204);
    assert.equal((await send("{not json")).status, 204);
    const invalidUtf8 = new Uint8Array([
      ...new TextEncoder().encode('{"csp-report":{"document-uri":"https://physcratic.test/u/'),
      255,
      ...new TextEncoder().encode('","effective-directive":"script-src","blocked-uri":"eval"}}'),
    ]);
    assert.equal((await POST(new Request("http://localhost/api/csp-report", { method: "POST", headers: { "content-type": "application/csp-report" }, body: invalidUtf8 }))).status, 204);
    assert.equal((await send(JSON.stringify({ "csp-report": { "blocked-uri": "x".repeat(MAX_REPORT_BYTES) } }))).status, 204);
    assert.equal((await send("")).status, 204);
    assert.equal(warn.mock.callCount(), 0);
  });

  it("only exports POST", async () => {
    const route = await import("../app/api/csp-report/route");
    assert.deepEqual(Object.keys(route).filter((key) => /^(GET|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(key)), []);
  });
});
