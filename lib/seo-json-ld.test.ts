import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { articles } from "./learn/articles";
import { problems } from "./physics";
import {
  articleGraph,
  jsonLdScript,
  organization,
  problemGraph,
  problemSummary,
  website,
} from "./seo/json-ld";
import { siteUrl } from "./site";

describe("json-ld", () => {
  it("organization and website share @id wiring", () => {
    const org = organization();
    const site = website();
    assert.equal(org["@id"], `${siteUrl()}/#organization`);
    assert.ok(org.logo.endsWith("/icon-512.png"));
    assert.equal(site.publisher["@id"], org["@id"]);
    assert.ok(!("potentialAction" in site));
  });
  it("problemGraph has breadcrumbs and a LearningResource", () => {
    const p = problems[0];
    const [crumbs, res] = problemGraph(p) as any[];
    assert.equal(crumbs["@type"], "BreadcrumbList");
    assert.deepEqual(
      crumbs.itemListElement.map((i: any) => i.name),
      ["Dashboard", "Problems", p.topic, p.title],
    );
    for (const i of crumbs.itemListElement) assert.match(i.item, /^https?:\/\//);
    assert.equal(res["@type"], "LearningResource");
    assert.equal(res.learningResourceType, "Problem");
    assert.equal(res.isAccessibleForFree, true);
    assert.ok(res.description.length <= 300);
    assert.equal(res.about.name, p.topic);
  });
  it("summary is capped at 300 chars for every problem", () => {
    for (const p of problems) assert.ok(problemSummary(p).length <= 300, p.id);
    assert.equal(problemSummary({ prompt: "x".repeat(900) }).length, 300);
  });
  it("jsonLdScript keeps </script> inert and round-trips", () => {
    const data = { title: "</script><script>alert(1)</script> & <b>" };
    const out = jsonLdScript(data);
    assert.ok(!out.includes("<"));
    assert.ok(!out.includes(">"));
    assert.ok(!out.includes("&"));
    assert.deepEqual(JSON.parse(out), data);
  });
  it("articleGraph has breadcrumbs, a reviewed WebPage and the Article it points to", () => {
    const a = articles[0];
    const [crumbs, page, article] = articleGraph(a) as any[];
    const url = `${siteUrl()}/learn/${a.slug}`;
    assert.equal(crumbs["@type"], "BreadcrumbList");
    assert.deepEqual(
      crumbs.itemListElement.map((i: any) => i.name),
      ["Learn", a.title],
    );
    for (const i of crumbs.itemListElement) assert.match(i.item, /^https?:\/\//);
    assert.equal(page["@type"], "WebPage");
    assert.equal(page["@id"], `${url}#webpage`);
    assert.equal(page.url, url);
    assert.equal(page.name, a.title);
    assert.deepEqual(page.reviewedBy, { "@type": "Person", name: "Arrow Dunatos" });
    assert.deepEqual(page.mainEntity, { "@id": article["@id"] });
    assert.equal(article["@type"], "Article");
    assert.equal(article["@id"], `${url}#article`);
    assert.equal(article.headline, a.title);
    assert.equal(article.dateModified, a.updated);
    assert.equal(article.citation.length, a.sources.length);
    assert.ok(!("reviewedBy" in article));
    assert.doesNotThrow(() => JSON.parse(jsonLdScript(articleGraph(a))));
  });
});
