import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CSP_REPORT_PATH, buildCsp, cspDirectives } from "./security/csp";

const directive = (policy: string, name: string) => policy.split("; ").find((part) => part.startsWith(`${name} `) || part === name);

describe("buildCsp", () => {
  const production = buildCsp();

  it("has the directives that matter", () => {
    for (const name of ["default-src", "script-src", "frame-src", "connect-src", "img-src", "form-action", "base-uri", "object-src", "frame-ancestors"]) {
      assert.ok(directive(production, name), name);
    }
  });

  it("restricts the base, forms and plugins", () => {
    assert.equal(directive(production, "base-uri"), "base-uri 'self'");
    assert.equal(directive(production, "form-action"), "form-action 'self'");
    assert.equal(directive(production, "object-src"), "object-src 'none'");
    assert.equal(directive(production, "default-src"), "default-src 'self'");
  });

  it("points reports at the endpoint", () => {
    assert.equal(CSP_REPORT_PATH, "/api/csp-report");
    assert.equal(directive(production, "report-uri"), "report-uri /api/csp-report");
  });

  it("allows inline scripts and styles for now, and images from data and blob", () => {
    assert.ok(directive(production, "script-src")!.includes("'unsafe-inline'"));
    assert.equal(directive(production, "style-src"), "style-src 'self' 'unsafe-inline'");
    assert.ok(/^img-src 'self' data: blob:/.test(directive(production, "img-src")!));
  });

  it("allows reCAPTCHA for the sign-up captcha but no other third party", () => {
    const origins = new Set(Object.values(cspDirectives()).flat().filter((value) => value.startsWith("https://")));
    assert.deepEqual([...origins].sort(), ["https://recaptcha.google.com/recaptcha/", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"]);
  });

  it("never allows unsafe-eval in production, only in development", () => {
    assert.ok(!production.includes("unsafe-eval"));
    assert.ok(!buildCsp({ vercelPreview: true }).includes("unsafe-eval"));
    assert.ok(directive(buildCsp({ development: true }), "script-src")!.includes("'unsafe-eval'"));
    assert.ok(directive(buildCsp({ development: true }), "connect-src")!.includes("ws:"));
    assert.ok(!directive(production, "connect-src")!.includes("ws:"));
  });

  it("adds the Vercel toolbar origin only on previews", () => {
    assert.ok(!production.includes("vercel.live"));
    assert.ok(buildCsp({ vercelPreview: true }).includes("https://vercel.live"));
  });

  it("has no wildcard source and no semicolon inside a value", () => {
    for (const [name, values] of Object.entries(cspDirectives({ development: true, vercelPreview: true }))) {
      for (const value of values) {
        assert.ok(!/(^|\s)\*($|\s)/.test(value) && value !== "*", `${name} ${value}`);
        assert.ok(!value.includes(";") && !/\s/.test(value), `${name} ${value}`);
      }
    }
  });

  it("is deterministic and uses a custom report path", () => {
    assert.equal(buildCsp(), buildCsp());
    assert.ok(buildCsp({ reportPath: "/r" }).endsWith("report-uri /r"));
  });
});
