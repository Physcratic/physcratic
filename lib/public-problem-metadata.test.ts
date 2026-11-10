import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generateMetadata } from "../app/dashboard/problems/[id]/page";
import { findProblemPage } from "./seo/problem-pages";
import { problems } from "./physics";
import { catalogProblems } from "./corpus-catalog";
import arena from "./arena/index.json";

test("the actual public page uses X1 descriptions, identity and canonicals for all 133 static problems", async () => {
  const all = [...problems, ...catalogProblems, ...arena.problems];
  assert.equal(all.length, 133)
  const titles = [];
  for (const problem of all) {
    const metadata = await generateMetadata({ params: Promise.resolve({ id: problem.id }) });
    assert.equal(metadata.description, findProblemPage(problem.id)!.description);
    assert.equal(metadata.title, findProblemPage(problem.id)!.metaTitle);
    assert.deepEqual(metadata.alternates, { canonical: `/dashboard/problems/${problem.id}` });
    assert.equal(metadata.openGraph?.description, metadata.description);
    assert.equal(metadata.openGraph?.url, `/dashboard/problems/${problem.id}`);
    assert.equal(metadata.openGraph?.title, metadata.title);
    titles.push(metadata.title);
    assert.doesNotMatch(JSON.stringify(metadata), /attachments|answerMode|privateParts|solution-pdf|ownerId/);
  }
  assert.equal(new Set(titles).size, 133)
});

test("unknown and authored-looking IDs cannot pull private metadata into the static public route", async () => {
  for (const id of ["not-a-problem", "00000000-0000-4000-8000-000000000001"]) {
    assert.deepEqual(await generateMetadata({ params: Promise.resolve({ id }) }), { title: "Problem not found" });
  }
  const authored = readFileSync("app/dashboard/authored/[id]/page.tsx", "utf8");
  assert.match(authored, /index: false, follow: false/);
  assert.match(authored, /force-dynamic/);
  for (const file of ["page.tsx", "opengraph-image.tsx"]) {
    const source = readFileSync(`app/dashboard/problems/[id]/${file}`, "utf8");
    assert.doesNotMatch(source, /from ["']@\/lib\/(?:authored-|problem-authoring|author-media|db)/);
  }
  const image = readFileSync("app/dashboard/problems/[id]/opengraph-image.tsx", "utf8");
  assert.match(image, /findProblemPage\(id\)/);
  assert.match(image, /if \(!problem\) notFound\(\)/);
});
