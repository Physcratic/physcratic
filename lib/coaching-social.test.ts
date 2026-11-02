import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { COACHING_OG_IMAGE_PATH, coachingSocial } from "./coaching/social";

describe("coachingSocial", () => {
  const input = { title: "T", description: "D", url: "/coaching/x" };

  it("builds openGraph with the site defaults and a twitter summary_large_image card", () => {
    const { openGraph, twitter } = coachingSocial({ ...input, withImage: false }) as any;
    assert.deepEqual(openGraph, { siteName: "Physcratic", locale: "en_US", type: "website", title: "T", description: "D", url: "/coaching/x" });
    assert.deepEqual(twitter, { card: "summary_large_image", title: "T", description: "D" });
  });

  it("adds the coaching image on pages that set their own openGraph", () => {
    const { openGraph, twitter } = coachingSocial({ ...input, withImage: true }) as any;
    assert.deepEqual(openGraph.images, [{ url: "/coaching/opengraph-image", width: 1200, height: 630 }]);
    assert.deepEqual(twitter.images, ["/coaching/opengraph-image"]);
    assert.equal(COACHING_OG_IMAGE_PATH, "/coaching/opengraph-image");
  });

  it("is used by the layout without an image and by both form pages with one", () => {
    const layout = readFileSync(new URL("../app/coaching/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /coachingSocial\(\{[^}]*url: "\/coaching", withImage: false \}\)/);
    for (const [file, url] of [["consultation", "/coaching/consultation"], ["become-a-tutor", "/coaching/become-a-tutor"]]) {
      const page = readFileSync(new URL(`../app/coaching/${file}/page.tsx`, import.meta.url), "utf8");
      assert.match(page, new RegExp(`coachingSocial\\(\\{[^}]*url: "${url}", withImage: true \\}\\)`), file);
    }
  });

  it("has an opengraph-image route that reads copy from content.ts and fetches nothing", () => {
    const route = readFileSync(new URL("../app/coaching/opengraph-image.tsx", import.meta.url), "utf8");
    assert.match(route, /size = \{ width: 1200, height: 630 \}/);
    assert.match(route, /background: "#0c101a"/);
    assert.match(route, /public\/logo-mark-transparent\.png/);
    assert.match(route, /content\.og\.tagline/);
    assert.match(route, /content\.og\.stats/);
    assert.ok(!/fetch\(|https?:\/\//.test(route.replace(/\/\/.*$/gm, "")), "no network access");
  });
});
