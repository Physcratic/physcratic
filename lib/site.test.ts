import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { baseOpenGraph, isProductionDeploy, siteUrl } from "./site";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_ENV",
] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
function reset() {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}
function clear() {
  for (const k of KEYS) delete process.env[k];
}

describe("siteUrl", () => {
  afterEach(reset);
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    clear();
    process.env.NEXT_PUBLIC_SITE_URL = "https://physcratic.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "x.vercel.app";
    assert.equal(siteUrl(), "https://physcratic.com");
  });
  it("strips trailing slashes", () => {
    clear();
    process.env.NEXT_PUBLIC_SITE_URL = "https://physcratic.com//";
    assert.equal(siteUrl(), "https://physcratic.com");
  });
  it("falls back to the Vercel production URL", () => {
    clear();
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "physcratic.vercel.app";
    assert.equal(siteUrl(), "https://physcratic.vercel.app");
  });
  it("falls back to localhost", () => {
    clear();
    assert.equal(siteUrl(), "http://localhost:3000");
  });
  it("treats empty values as unset", () => {
    clear();
    process.env.NEXT_PUBLIC_SITE_URL = "  ";
    assert.equal(siteUrl(), "http://localhost:3000");
  });
});

describe("isProductionDeploy", () => {
  afterEach(reset);
  it("is true only for VERCEL_ENV=production", () => {
    clear();
    assert.equal(isProductionDeploy(), false);
    process.env.VERCEL_ENV = "preview";
    assert.equal(isProductionDeploy(), false);
    process.env.VERCEL_ENV = "production";
    assert.equal(isProductionDeploy(), true);
  });
});

describe("baseOpenGraph", () => {
  it("has site name, locale and type", () => {
    assert.equal(baseOpenGraph.siteName, "Physcratic");
    assert.equal(baseOpenGraph.locale, "en_US");
    assert.equal(baseOpenGraph.type, "website");
  });
});
