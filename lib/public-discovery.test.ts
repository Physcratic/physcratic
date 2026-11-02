import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import sitemap from "../app/sitemap";
import { GET as discoveryText } from "../app/llms.txt/route";
import { authoringStagingOrigin } from "./authoring-staging";
import { publicDiscoveryUrl } from "./public-discovery";
import { siteUrl } from "./site";

const keys = ["NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_ENV"] as const;
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});
for (const [name, environment, configured, expected] of [
  ["authoring Preview", "preview", authoringStagingOrigin, "https://physcratic.com"],
  ["Production", "production", authoringStagingOrigin, authoringStagingOrigin],
  ["other Preview", "preview", "https://other-preview.example", "https://other-preview.example"],
  ["development", "development", "http://localhost:3000", "http://localhost:3000"],
] as const) {
  test(`public discovery preserves ${name} behavior`, async () => {
    process.env.VERCEL_ENV = environment;
    process.env.NEXT_PUBLIC_SITE_URL = configured;
    assert.equal(publicDiscoveryUrl(), expected);
    assert.equal(siteUrl(), configured, "Auth and page metadata configuration is untouched");
    const entries = sitemap();
    assert.ok(entries.length >= 20);
    assert.ok(entries.every(entry => entry.url.startsWith(`${expected}/`)));
    const response = discoveryText();
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(text.includes(`${expected}/dashboard`));
    if (name === "authoring Preview") {
      assert.ok(!text.includes(authoringStagingOrigin));
      assert.ok(Buffer.byteLength(text, "utf8") < 5120);
    }
  });
}
