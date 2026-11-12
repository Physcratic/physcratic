import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";
import { generateMetadata, generateStaticParams } from "../app/dashboard/problems/[id]/page";
import sitemap from "../app/sitemap";
import { problems } from "./physics";
import { ARENA_LIBRARY_HREF, isRetiredPracticeProblem, retiredPracticeIds } from "./legacy-practice";
import { allProblemPages, relatedProblems, topicsWithProblems, problemsInTopic } from "./seo/problem-pages";
import { indexableRoutes, publicRoutes, topicHasProblems } from "./seo/public-routes";
import { llmsFull, llmsIndex } from "./seo/llms";
import { articles } from "./learn/articles";
import { practiceProblemIds } from "./learn/practice-links";
import { corpusProblems } from "./corpus-pilot";
import arena from "./arena/index.json";
import { catalogProblems } from "./corpus-catalog";
import { getArchiveDefinition } from "./archive-grading/catalog";
import { parseProblemCollection } from "./problem-collection-route";

const expected = ["incline", "circuit", "string", "projectile", "spring", "resistors", "power", "wave", "echo", "heat", "gas", "first-law"];

test("the closed legacy set comes from the original model, with historical grading identities intact", () => {
  assert.deepEqual(retiredPracticeIds, expected);
  assert.deepEqual(retiredPracticeIds, problems.map(p => p.id));
  for (const id of expected) {
    assert.ok(isRetiredPracticeProblem(id));
    assert.equal(getArchiveDefinition(id)?.problemId, id);
  }
  for (const id of [...arena.problems, ...catalogProblems, ...corpusProblems].map(p => p.id)) assert.ok(!isRetiredPracticeProblem(id), id);
});

test("retained dashboard topic and concept aliases still resolve after retirement", () => {
  for (const topic of ["Mechanics", "Modern", "Modern physics", "Interference", "Newton’s rings"]) assert.ok(topicHasProblems(topic), topic);
  assert.equal(topicHasProblems("not-a-physics-tag"), false);
});

test("Next config redirects exactly the legacy reader paths to the default Arena collection", async () => {
  const redirects = await nextConfig.redirects!();
  assert.deepEqual(redirects, expected.map(id => ({ source: `/dashboard/problems/${id}`, destination: ARENA_LIBRARY_HREF, permanent: true })));
  assert.equal(parseProblemCollection(null), "arena");
  assert.equal(parseProblemCollection("arena"), "arena");
  assert.equal(parseProblemCollection("pilot"), "pilot", "distinct Guided exercises remain available");
});

test("static params, discovery, topics, recommendations and sitemap contain every retained identity and no legacy reader", async () => {
  const pages = allProblemPages();
  assert.deepEqual(new Set(pages.map(p => p.id)), new Set([...arena.problems, ...catalogProblems].map(p => p.id)));
  assert.deepEqual(generateStaticParams(), pages.map(p => ({ id: p.id })));
  const discovery = JSON.stringify([publicRoutes, indexableRoutes, sitemap(), llmsFull("https://physcratic.com"), llmsIndex("https://physcratic.com"), articles, practiceProblemIds]);
  for (const id of expected) {
    assert.ok(!discovery.includes(`/dashboard/problems/${id}`), id);
    assert.deepEqual(await generateMetadata({ params: Promise.resolve({ id }) }), { title: "Problem not found", robots: { index: false, follow: true } });
  }
  for (const page of pages) for (const related of relatedProblems(page)) assert.ok(!isRetiredPracticeProblem(related.id));
  for (const topic of topicsWithProblems()) for (const page of problemsInTopic(topic.slug)) assert.ok(!isRetiredPracticeProblem(page.id));
  for (const article of articles) for (const block of article.body) {
    if (block.type === "problemLink") assert.ok(!isRetiredPracticeProblem(block.problemId), article.slug);
  }
  assert.equal(sitemap().length, indexableRoutes.length);
});
