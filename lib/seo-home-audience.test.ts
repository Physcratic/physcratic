import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import nextConfig from "../next.config";
import { hasSessionCookie, resolveHomeAudience } from "./seo/home-audience";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("home page audience", () => {
  it("looks nobody up when there is no session cookie, so a crawler never reaches the database", async () => {
    let calls = 0;
    const lookup = async () => { calls += 1; return { user: { id: "u" } }; };
    for (const cookie of [null, undefined, "", "theme=dark", "better-auth.session_data=abc", "x_better-auth.session_token=abc"]) {
      assert.equal(await resolveHomeAudience(cookie, lookup), "visitor", String(cookie));
    }
    assert.equal(calls, 0);
  });
  it("gives the Lobby only to a verified session", async () => {
    assert.equal(await resolveHomeAudience("better-auth.session_token=abc.def", async () => ({ user: { id: "u" } })), "member");
    assert.equal(await resolveHomeAudience("theme=dark; __Secure-better-auth.session_token=abc.def", async () => ({ user: { id: "u" } })), "member");
    assert.equal(await resolveHomeAudience("better-auth.session_token=expired", async () => null), "visitor");
    assert.equal(await resolveHomeAudience("better-auth.session_token=expired", async () => ({})), "visitor");
  });
  it("shows the landing page when the session lookup fails", async () => {
    assert.equal(await resolveHomeAudience("better-auth.session_token=abc", async () => { throw new Error("database down"); }), "visitor");
  });
  it("reads the cookie name Better Auth sets", () => {
    assert.equal(hasSessionCookie("better-auth.session_token=x"), true);
    assert.equal(hasSessionCookie("better-auth.session_token="), false);
  });
  it("renders the home page on every request and nothing in next.config makes it cacheable", async () => {
    const source = read("app/page.tsx");
    assert.match(source, /export const dynamic = "force-dynamic"/);
    assert.doesNotMatch(source, /export const (revalidate|fetchCache)|unstable_cache|generateStaticParams/);
    const rules = await nextConfig.headers!();
    for (const rule of rules.filter((r) => r.source === "/" || r.source === "/:path*")) {
      const cache = rule.headers.find((h) => h.key.toLowerCase() === "cache-control");
      assert.equal(cache, undefined, `no Cache-Control override for ${rule.source}`);
    }
  });

  it("redirects site entry URLs without redirecting the public library", async () => {
    const redirects = await nextConfig.redirects!();
    for (const source of ["/", "/problem"]) {
      assert.ok(redirects.some((rule) => rule.source === source && rule.destination === "/dashboard" && rule.permanent), source);
    }
    assert.ok(!redirects.some((rule) => rule.source === "/problems"));
  });
});
