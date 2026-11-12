import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { content as coaching } from "./coaching/content";
import { findCopyProblems } from "./copy-rules";
import { articles, learnPath } from "./learn/articles";
import { findProblemPage, problemsInTopic, topicName, topicPageCopy } from "./seo/problem-pages";
import { publicRoutes, type PublicRoute } from "./seo/public-routes";
import { SITE } from "./site";

/**
 * Guards the title, description and canonical of every route in the public registry. It resolves
 * them from the code that produces them (the dashboard metadata function, the learn articles, the
 * coaching content and, for canonicals the pages declare themselves, the page source). The built
 * site is checked by scripts/check-seo.mjs, which also loads the JSON-LD and the og:image.
 */

const TEMPLATE = " | Physcratic"; // title template in app/layout.tsx
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

interface Resolved {
  title: string;
  description?: string;
  /** The canonical the page declares, or undefined when it declares none. */
  canonical?: string;
}

/** The canonical a page file declares: a string literal, `path`, or learnPath(). */
function declaredCanonical(file: string, path: string): string | undefined {
  const match = read(file).match(/canonical:\s*(?:"([^"]+)"|(path)\b|(learnPath\(\)))/);
  if (!match) return undefined;
  return match[1] ?? path;
}

function resolve(route: PublicRoute): Resolved {
  if (route.kind === "home") {
    return { title: SITE.defaultTitle, description: SITE.description, canonical: declaredCanonical("app/page.tsx", route.path) };
  }
  if (route.kind === "library") {
    const file = route.path === "/problems" ? "app/problems/page.tsx" : "app/problems/archive/page.tsx";
    const source = read(file);
    return { title: source.match(/const TITLE = "([^"]+)"/)![1] + TEMPLATE, description: source.match(/const DESCRIPTION =\s*"([^"]+)"/)![1], canonical: declaredCanonical(file, route.path) };
  }
  if (route.kind === "topic") {
    const slug = route.path.split("/").pop()!;
    const copy = topicPageCopy(topicName(slug)!, problemsInTopic(slug).length);
    return { title: copy.title + TEMPLATE, description: copy.description, canonical: declaredCanonical("app/problems/topics/[slug]/page.tsx", route.path) };
  }
  if (route.kind === "problem") {
    const page = findProblemPage(route.path.split("/").pop()!)!;
    return { title: page.metaTitle + TEMPLATE, description: page.description, canonical: page.path };
  }
  if (route.kind === "learn") {
    if (route.path === "/learn") {
      const source = read("app/learn/page.tsx");
      return { title: source.match(/const TITLE = "([^"]+)"/)![1] + TEMPLATE, description: source.match(/const DESCRIPTION =\s*"([^"]+)"/)![1], canonical: declaredCanonical("app/learn/page.tsx", route.path) };
    }
    const article = articles.find((a) => learnPath(a.slug) === route.path)!;
    return { title: article.title + TEMPLATE, description: article.description, canonical: declaredCanonical("app/learn/[slug]/page.tsx", route.path) };
  }
  if (route.kind === "coaching") {
    if (route.path === "/coaching") return { title: coaching.meta.title + TEMPLATE, description: coaching.meta.description, canonical: declaredCanonical("app/coaching/layout.tsx", route.path) };
    const page = route.path === "/coaching/consultation" ? coaching.consultationPage : coaching.tutorPage;
    return { title: page.meta.title + TEMPLATE, description: page.meta.description, canonical: declaredCanonical(`app${route.path}/page.tsx`, route.path) };
  }
  // Legal pages are noindex, so only the title is checked.
  return { title: route.title + TEMPLATE };
}

const resolved = publicRoutes.map((route) => ({ route, ...resolve(route) }));
const indexable = resolved.filter((r) => r.route.indexable);

describe("public route metadata", () => {
  it("covers every route in the registry", () => {
    assert.equal(resolved.length, publicRoutes.length);
    assert.ok(resolved.length > 140);
    assert.ok(resolved.some((r) => r.route.kind === "coaching") && resolved.some((r) => r.route.kind === "learn") && resolved.some((r) => r.route.kind === "problem"));
    assert.ok(resolved.some((r) => r.route.kind === "home") && resolved.some((r) => r.route.kind === "library") && resolved.some((r) => r.route.kind === "topic"));
  });

  it("keeps every title at 60 characters or fewer, with the site template", () => {
    const bad = resolved.filter((r) => r.title.length > 60).map((r) => `${r.route.path}: ${r.title.length} "${r.title}"`);
    assert.deepEqual(bad, []);
    assert.ok(SITE.defaultTitle.length <= 60);
  });

  it("keeps every description between 70 and 160 characters", () => {
    const bad = indexable
      .filter((r) => !r.description || r.description.length < 70 || r.description.length > 160)
      .map((r) => `${r.route.path}: ${r.description?.length ?? "none"}`);
    assert.deepEqual(bad, []);
  });

  it("has no duplicated titles or descriptions", () => {
    for (const key of ["title", "description"] as const) {
      const seen = new Map<string, string[]>();
      for (const r of indexable) {
        const value = r[key];
        if (value) seen.set(value, [...(seen.get(value) ?? []), r.route.path]);
      }
      const dupes = [...seen].filter(([, paths]) => paths.length > 1).map(([value, paths]) => `${key} "${value.slice(0, 50)}": ${paths.join(", ")}`);
      assert.deepEqual(dupes, [], key);
    }
  });

  it("gives every indexable route a canonical that is its own path", () => {
    const bad = indexable.filter((r) => r.canonical !== r.route.path).map((r) => `${r.route.path}: ${r.canonical ?? "missing"}`);
    assert.deepEqual(bad, []);
  });

  it("obeys the copy rules in every title and description", () => {
    const failures = resolved.flatMap((r) => [r.title, r.description ?? ""].flatMap((text) => findCopyProblems(text).map((p) => `${r.route.path}: ${p.rule} in "${text.slice(0, 50)}"`)));
    assert.deepEqual(failures, []);
  });

  it("uses the written problem descriptions on the page itself", () => {
    assert.match(read("app/dashboard/problems/[id]/page.tsx"), /canonical: page\.path/);
    for (const id of ["arena-mind-the-gap", "ipho-2025-t2"]) {
      assert.ok(findProblemPage(id)!.description.length >= 70, id);
    }
  });
});
