import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { content as coaching } from "./coaching/content";
import { articles } from "./learn/articles";
import { problems } from "./physics";
import {
  INSTAGRAM_URL,
  articleGraph,
  coachingGraph,
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

  it("organization links the Instagram profile and keeps its @id", () => {
    const org = organization();
    assert.deepEqual(org.sameAs, ["https://www.instagram.com/physcratic"]);
    assert.equal(INSTAGRAM_URL, "https://www.instagram.com/physcratic");
    assert.equal(org["@id"], `${siteUrl()}/#organization`);
  });
});

describe("coachingGraph", () => {
  const graph = coachingGraph() as any[];
  const url = `${siteUrl()}/coaching`;
  const ofType = (type: string) => graph.filter((node) => node["@type"] === type);

  /** Every object that is only an {"@id": ...} reference, anywhere in the value. */
  const references = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(references);
    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 1 && entries[0][0] === "@id") return [String(entries[0][1])];
      return entries.flatMap(([, v]) => references(v));
    }
    return [];
  };
  const types = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(types);
    if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => (k === "@type" ? [String(v)] : types(v)));
    return [];
  };

  it("has an Organization, a Service, one Course per program and a BreadcrumbList", () => {
    assert.deepEqual(graph.map((node) => node["@type"]), ["Organization", "Service", "Course", "Course", "Course", "Course", "BreadcrumbList"]);
    assert.equal(ofType("Course").length, coaching.programs.items.length);
    assert.equal(ofType("Course").length, 4);
  });

  it("gives every top-level node a @context and a @type", () => {
    for (const node of graph) {
      assert.equal(node["@context"], "https://schema.org");
      assert.ok(typeof node["@type"] === "string" && node["@type"].length > 0);
    }
  });

  it("resolves every @id reference to a node in the graph, with the agreed @ids", () => {
    const defined = new Set(graph.map((node) => node["@id"]).filter(Boolean));
    assert.ok(defined.has(`${siteUrl()}/#organization`));
    assert.ok(defined.has(`${url}#service`));
    for (const id of references(graph)) assert.ok(defined.has(id), `unresolved @id ${id}`);
    assert.ok(references(graph).length >= 6);
    assert.equal(new Set(graph.map((node) => node["@id"]).filter(Boolean)).size, graph.filter((node) => node["@id"]).length, "@ids are unique");
  });

  it("describes the Service from content.ts", () => {
    const [service] = ofType("Service");
    assert.equal(service.name, coaching.ui.brand);
    assert.equal(service.description, coaching.meta.description);
    assert.equal(service.areaServed, "Worldwide");
    assert.deepEqual(service.audience, { "@type": "EducationalAudience", educationalRole: "student" });
    assert.deepEqual(service.provider, { "@id": `${siteUrl()}/#organization` });
    assert.deepEqual(service.hasOfferCatalog.itemListElement, ofType("Course").map((course) => ({ "@id": course["@id"] })));
  });

  it("takes the course names from content.ts, online, weekly, two hours, with no prices", () => {
    assert.deepEqual(ofType("Course").map((c) => c.name), coaching.programs.items.map((item) => item.title));
    for (const course of ofType("Course")) {
      assert.deepEqual(course.inLanguage, ["en"]);
      assert.deepEqual(course.provider, { "@id": `${siteUrl()}/#organization` });
      assert.ok(course.educationalLevel && course.description.length > 20);
      assert.equal(course.hasCourseInstance["@type"], "CourseInstance");
      assert.equal(course.hasCourseInstance.courseMode, "Online");
      assert.deepEqual(course.hasCourseInstance.courseSchedule, { "@type": "Schedule", repeatFrequency: "P1W", duration: "PT2H" });
    }
    assert.ok(!/offers|price/i.test(JSON.stringify(graph)));
  });

  it("has the breadcrumbs Physcratic, then Coaching", () => {
    const [crumbs] = ofType("BreadcrumbList");
    assert.deepEqual(crumbs.itemListElement.map((i: any) => [i.position, i.name, i.item]), [[1, "Physcratic", siteUrl()], [2, "Coaching", url]]);
  });

  it("publishes no FAQPage, Review, AggregateRating or Person markup", () => {
    const found = new Set(types(graph));
    for (const banned of ["FAQPage", "Question", "Answer", "Review", "AggregateRating", "Person"]) assert.ok(!found.has(banned), banned);
    assert.ok(!/"(review|aggregateRating|author|employee|member)"/.test(JSON.stringify(graph)));
  });

  it("parses back from the script text, and keeps </script> inert whatever the content says", () => {
    const text = jsonLdScript(graph);
    assert.deepEqual(JSON.parse(text), graph);
    assert.ok(!text.includes("<") && !text.includes(">") && !text.includes("&"));
    const hostile = structuredClone(coaching) as typeof coaching;
    hostile.programs.items[0].title = "</script><script>alert(1)</script> & <b>";
    const out = jsonLdScript(coachingGraph(hostile));
    assert.ok(!out.includes("</script>") && !out.includes("<"));
    assert.equal((JSON.parse(out) as any[])[2].name, "</script><script>alert(1)</script> & <b>");
  });

  it("is rendered once in app/coaching/page.tsx", async () => {
    const { readFileSync } = await import("node:fs");
    const page = readFileSync(new URL("../app/coaching/page.tsx", import.meta.url), "utf8");
    assert.equal((page.match(/application\/ld\+json/g) ?? []).length, 1);
    assert.match(page, /jsonLdScript\(coachingGraph\(\)\)/);
  });
});
