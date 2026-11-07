import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { content as coaching } from "./coaching/content";
import { publishedArticles } from "./learn/articles";
import {
  articleGraph,
  breadcrumbList,
  coachingGraph,
  homeGraph,
  jsonLdScript,
  learnHubGraph,
  problemCrumbs,
  problemListGraph,
  problemPageGraph,
} from "./seo/json-ld";
import { allProblemPages, topicName, topicsWithProblems } from "./seo/problem-pages";

type Node = Record<string, unknown> & { "@type": string };

const isIsoDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isUrl = (value: unknown) => typeof value === "string" && /^https?:\/\/[^\s]+$/.test(value);
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;

/** The properties Google and schema.org need for each type we publish. Returns a list of problems, empty when valid. */
function validate(node: Node): string[] {
  const bad: string[] = [];
  const need = (ok: boolean, message: string) => { if (!ok) bad.push(`${node["@type"]}: ${message}`); };
  need(node["@context"] === "https://schema.org", "@context is https://schema.org");
  switch (node["@type"]) {
    case "Organization":
      need(text(node.name) && isUrl(node.url) && isUrl(node.logo), "name, url and logo");
      need(Array.isArray(node.sameAs) && (node.sameAs as unknown[]).every(isUrl), "sameAs urls");
      break;
    case "WebSite":
      need(text(node.name) && isUrl(node.url), "name and url");
      break;
    case "BreadcrumbList": {
      const items = node.itemListElement as { "@type": string; position: number; name: unknown; item: unknown }[];
      need(Array.isArray(items) && items.length >= 2, "at least two items");
      items.forEach((item, index) => {
        need(item["@type"] === "ListItem" && item.position === index + 1, `item ${index + 1} is a ListItem in position order`);
        need(text(item.name) && isUrl(item.item), `item ${index + 1} has a name and an absolute url`);
      });
      break;
    }
    case "LearningResource":
      need(text(node.name) && text(node.description) && isUrl(node.url), "name, description, url");
      need(node.inLanguage === "en" && node.isAccessibleForFree === true, "inLanguage and isAccessibleForFree");
      need(text(node.learningResourceType) && text(node.educationalLevel), "learningResourceType and educationalLevel");
      need(text((node.about as { name?: unknown })?.name), "about.name");
      need(text((node.publisher as { name?: unknown })?.name), "a publisher that names itself");
      need(node.dateModified === undefined || isIsoDate(node.dateModified), "dateModified is a date");
      break;
    case "Article":
      need(text(node.headline) && (node.headline as string).length <= 110, "headline of 110 characters or fewer");
      need(text(node.description) && isUrl(node.url), "description and url");
      need(isIsoDate(node.datePublished) && isIsoDate(node.dateModified), "datePublished and dateModified");
      need(text((node.author as { name?: unknown })?.name), "an author that names itself");
      need(text((node.publisher as { name?: unknown })?.name), "a publisher that names itself");
      break;
    case "WebPage":
      need(isUrl(node.url) && text(node.name), "url and name");
      need(node.reviewedBy === undefined || text((node.reviewedBy as { name?: unknown }).name), "reviewedBy names a person");
      break;
    case "CollectionPage":
      need(text(node.name) && text(node.description) && isUrl(node.url), "name, description, url");
      break;
    case "ItemList":
      need(Array.isArray(node.itemListElement) && node.numberOfItems === (node.itemListElement as unknown[]).length, "numberOfItems matches");
      break;
    case "Service":
    case "Course":
      need(text(node.name) && text(node.description), "name and description");
      break;
    default:
      need(false, "is a type this site publishes");
  }
  return bad;
}

function nodesOf(graph: unknown): Node[] {
  const list = (Array.isArray(graph) ? graph : [graph]) as Node[];
  return list.flatMap((node) => {
    const mainEntity = node.mainEntity as Node | undefined;
    return mainEntity && typeof mainEntity === "object" && "@type" in mainEntity ? [node, { "@context": "https://schema.org", ...mainEntity }] : [node];
  });
}

function check(label: string, graph: unknown) {
  const raw = jsonLdScript(graph);
  assert.doesNotMatch(raw, /[<>&]/, `${label}: script-safe`);
  const parsed = JSON.parse(raw);
  const problems = nodesOf(parsed).flatMap(validate);
  assert.deepEqual(problems, [], label);
}

describe("structured data validity", () => {
  it("WebSite and Organization on the home page", () => {
    const graph = homeGraph() as Node[];
    assert.deepEqual(graph.map((n) => n["@type"]), ["Organization", "WebSite"]);
    check("home", graph);
  });
  it("BreadcrumbList and LearningResource on every problem page, 130 pages", () => {
    for (const page of allProblemPages()) {
      const graph = problemPageGraph(page) as Node[];
      assert.deepEqual(graph.map((n) => n["@type"]), ["BreadcrumbList", "LearningResource"], page.id);
      check(page.id, graph);
    }
  });
  it("matches what the page shows: the h1 is the name, the trail is the breadcrumb, the source line is the origin", () => {
    for (const page of allProblemPages()) {
      const [crumbs, resource] = problemPageGraph(page) as unknown as [{ itemListElement: { name: string; item: string }[] }, Record<string, any>];
      assert.deepEqual(crumbs.itemListElement.map((i) => i.name), problemCrumbs(page).map((c) => c.name), page.id);
      assert.equal(crumbs.itemListElement.at(-1)!.name, resource.name, page.id);
      assert.equal(resource.name, page.title, page.id);
      assert.equal(resource.description, page.description, page.id);
      assert.equal(resource.about.name, page.topic, page.id);
      if (page.source) {
        assert.equal(resource.isBasedOn.name, `${page.source.line} ${page.source.officialLabel}`, page.id);
        assert.equal(resource.isBasedOn.url, page.source.officialUrl, page.id);
        assert.equal(resource.isPartOf.name, `${page.competition} ${page.year} theory problems`, page.id);
      } else {
        assert.equal(resource.isBasedOn, undefined, page.id);
      }
      assert.equal(resource.dateModified, page.lastmod, page.id);
    }
  });
  it("Article with an author, a reviewer where there is one, and dates, on every published Learn page", () => {
    for (const article of publishedArticles) {
      const graph = articleGraph(article) as Node[];
      assert.deepEqual(graph.map((n) => n["@type"]), ["BreadcrumbList", "WebPage", "Article"], article.slug);
      check(article.slug, graph);
      const [, page, body] = graph as unknown as [unknown, Record<string, any>, Record<string, any>];
      assert.equal(body.datePublished, article.updated);
      assert.equal(body.dateModified, article.updated);
      assert.equal(body.author.name, "Physcratic");
      if (article.reviewedBy) assert.equal(page.reviewedBy.name, article.reviewedBy.name, article.slug);
      else assert.equal(page.reviewedBy, undefined, article.slug);
    }
  });
  it("breadcrumbs and item lists on the library, archive and topic pages", () => {
    const pages = allProblemPages();
    const library = problemListGraph({ crumbs: [{ name: "Physcratic", path: "/" }, { name: "Problems", path: "/problems" }], name: "Library", description: "A list of problems", path: "/problems", items: pages });
    check("library", library);
    for (const topic of topicsWithProblems()) {
      const items = pages.filter((p) => p.topicSlug === topic.slug);
      check(topic.slug, problemListGraph({ crumbs: [{ name: "Physcratic", path: "/" }, { name: "Problems", path: "/problems" }, { name: topicName(topic.slug)!, path: `/problems/topics/${topic.slug}` }], name: topic.name, description: "Topic", path: `/problems/topics/${topic.slug}`, items }));
    }
    assert.throws(() => assert.ok(validate(breadcrumbList([{ name: "Only", path: "/" }]) as unknown as Node).length === 0));
  });
  it("keeps the existing Learn hub and coaching graphs valid", () => {
    check("learn hub", learnHubGraph({ title: "Guides", description: "All guides", articles: publishedArticles }));
    check("coaching", coachingGraph(coaching));
  });
  it("rejects markup that is missing what Google needs", () => {
    assert.ok(validate({ "@context": "https://schema.org", "@type": "Article", headline: "x" }).length > 0);
    assert.ok(validate({ "@context": "https://schema.org", "@type": "LearningResource", name: "x" }).length > 0);
    assert.ok(validate({ "@context": "https://schema.org", "@type": "Mystery" }).length > 0);
  });
});
