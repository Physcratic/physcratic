import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { articles, learnPath, publishedArticles } from "./learn/articles";
import { jsonLdScript, learnHubGraph } from "./seo/json-ld";
import { siteUrl } from "./site";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/learn/page.tsx");
const TITLE = page.match(/const TITLE = "([^"]+)"/)![1];
const DESCRIPTION = page.match(/const DESCRIPTION =\s*"([^"]+)"/)![1];

const build = (list = publishedArticles) => learnHubGraph({ title: TITLE, description: DESCRIPTION, articles: list }) as any[];
const ofType = (graph: any[], type: string) => graph.filter((node) => node["@type"] === type);

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

describe("learnHubGraph", () => {
  const graph = build();
  const url = `${siteUrl()}/learn`;

  it("has an Organization, a CollectionPage, an ItemList and a BreadcrumbList, each with @context and @type", () => {
    assert.deepEqual(graph.map((node) => node["@type"]), ["Organization", "CollectionPage", "ItemList", "BreadcrumbList"]);
    for (const node of graph) {
      assert.equal(node["@context"], "https://schema.org");
      assert.ok(typeof node["@type"] === "string" && node["@type"].length > 0);
    }
  });

  it("describes the hub with the page's own title and description", () => {
    const [collection] = ofType(graph, "CollectionPage");
    assert.equal(collection.name, TITLE);
    assert.equal(collection.description, DESCRIPTION);
    assert.equal(collection.url, url);
    assert.equal(collection["@id"], `${url}#collection`);
    assert.equal(collection.inLanguage, "en-GB");
    assert.deepEqual(collection.mainEntity, { "@id": `${url}#guides` });
    assert.deepEqual(collection.publisher, { "@id": `${siteUrl()}/#organization` });
  });

  it("lists exactly the published guides, in the hub's order, with their titles and urls", () => {
    const [list] = ofType(graph, "ItemList");
    assert.equal(list.numberOfItems, publishedArticles.length);
    assert.ok(publishedArticles.length >= 4);
    assert.deepEqual(list.itemListElement.map((item: any) => item.position), publishedArticles.map((_, index) => index + 1));
    assert.deepEqual(list.itemListElement.map((item: any) => item.name), publishedArticles.map((article) => article.title));
    assert.deepEqual(list.itemListElement.map((item: any) => item.url), publishedArticles.map((article) => `${siteUrl()}${learnPath(article.slug)}`));
    for (const item of list.itemListElement) assert.equal(item["@type"], "ListItem");
  });

  it("leaves out a guide that is not published", () => {
    const draft = { slug: "draft-guide", title: "A draft that is not published" };
    assert.ok(articles.every((article) => article.published || article.slug !== draft.slug));
    const names = (ofType(build(), "ItemList")[0].itemListElement as any[]).map((item) => item.name);
    assert.ok(!names.includes(draft.title));
    assert.match(page, /articles: publishedArticles/, "the page passes only the published guides");
  });

  it("has no ItemList and no mainEntity when there are no guides", () => {
    const empty = build([]);
    assert.deepEqual(empty.map((node) => node["@type"]), ["Organization", "CollectionPage", "BreadcrumbList"]);
    assert.ok(!("mainEntity" in ofType(empty, "CollectionPage")[0]));
    const defined = new Set(empty.map((node) => node["@id"]).filter(Boolean));
    for (const id of references(empty)) assert.ok(defined.has(id), id);
  });

  it("resolves every @id reference to a node in the graph", () => {
    const defined = new Set(graph.map((node) => node["@id"]).filter(Boolean));
    assert.ok(references(graph).length >= 2);
    for (const id of references(graph)) assert.ok(defined.has(id), `unresolved @id ${id}`);
    assert.equal(defined.size, graph.filter((node) => node["@id"]).length, "@ids are unique");
  });

  it("has the breadcrumbs Physcratic, then Learn", () => {
    const [crumbs] = ofType(graph, "BreadcrumbList");
    assert.deepEqual(crumbs.itemListElement.map((i: any) => [i.position, i.name, i.item]), [[1, "Physcratic", siteUrl()], [2, "Learn", url]]);
  });

  it("parses back from the script text, and keeps </script> inert whatever a title says", () => {
    const text = jsonLdScript(graph);
    assert.deepEqual(JSON.parse(text), graph);
    assert.ok(!text.includes("<") && !text.includes(">") && !text.includes("&"));
    const hostile = learnHubGraph({ title: "</script><script>alert(1)</script>", description: "a & b", articles: [{ slug: "x", title: "</script> & <b>" }] });
    const out = jsonLdScript(hostile);
    assert.ok(!out.includes("</script>") && !out.includes("<"));
    assert.equal((JSON.parse(out) as any[])[2].itemListElement[0].name, "</script> & <b>");
  });

  it("types no guide title or slug into json-ld.ts", () => {
    const source = read("lib/seo/json-ld.ts");
    for (const article of articles) {
      assert.ok(!source.includes(article.title), article.title);
      assert.ok(!source.includes(article.slug), article.slug);
    }
  });

  it("is rendered once in app/learn/page.tsx", () => {
    assert.equal((page.match(/application\/ld\+json/g) ?? []).length, 1);
    assert.match(page, /jsonLdScript\(learnHubGraph\(\{ title: TITLE, description: DESCRIPTION, articles: publishedArticles \}\)\)/);
  });
});
