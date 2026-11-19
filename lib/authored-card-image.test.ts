import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { authoredCardImage, authoredCardImageSchema, authoredCardImageSrc, clampCardAlt } from "./authored-card-image";
import { createAuthoredLibraryApi } from "./authored-library-api";
import { authoredLibraryPageSchema } from "./authored-library-contracts";
import { collectionEntrySchema } from "./unified-arena";

const ids = () => [randomUUID(), randomUUID()] as const;

test("the alt text is trimmed and cut to 140 whole characters, and an empty alt gives no image", () => {
  assert.equal(clampCardAlt("  A beam on two supports  "), "A beam on two supports");
  assert.equal(clampCardAlt("x".repeat(300)).length, 140);
  assert.equal([...clampCardAlt("😀".repeat(200))].length, 140, "an emoji is never cut in half");
  assert.equal(clampCardAlt(`${"y".repeat(139)} tail`), "y".repeat(139));
  for (const empty of ["", "   ", "\n\t", null, undefined, 7]) assert.equal(clampCardAlt(empty), "");
  const [problem, revision] = ids();
  for (const empty of ["", "   ", undefined]) assert.equal(authoredCardImage(problem, revision, empty), undefined);
  assert.deepEqual(authoredCardImage(problem, revision, " Pulley "), { src: `/card-images/${problem}/${revision}`, alt: "Pulley", width: 640, height: 480 });
});

test("the image is strict: only the future thumbnail address, a short alt, a ratio, and nothing else", () => {
  const [problem, revision] = ids();
  const ok = authoredCardImage(problem, revision, "A figure")!;
  assert.ok(authoredCardImageSchema.safeParse(ok).success);
  for (const bad of [
    { ...ok, extra: 1 }, { ...ok, alt: "" }, { ...ok, alt: "x".repeat(141) }, { ...ok, width: 0 },
    { ...ok, src: `/api/authored-problems/${problem}/media/${revision}` }, { ...ok, src: `/api/authored-problems/${problem}/card-image/${revision}` },
    { ...ok, src: "https://example.com/a.png" }, { ...ok, src: `${authoredCardImageSrc(problem, revision)}?x=1` },
  ]) assert.equal(authoredCardImageSchema.safeParse(bad).success, false, JSON.stringify(bad).slice(0, 80));
});

test("both collection schemas stay strict and accept the optional image", () => {
  const [problem, revision] = ids();
  const image = authoredCardImage(problem, revision, "A figure")!;
  const entry = { problemId: problem, revisionId: revision, title: "T", topicTags: [], methodTags: [], estimatedDifficulty: null, provenance: { kind: "original", source: "", rightsDeclaration: "ok" } };
  const page = (problem: object) => ({ problems: [problem], nextCursor: null });
  assert.ok(authoredLibraryPageSchema.safeParse(page(entry)).success);
  assert.ok(authoredLibraryPageSchema.safeParse(page({ ...entry, image })).success);
  // The library page is strict at the top and its problem rows drop unknown keys, so an owner id can never pass through.
  assert.equal(authoredLibraryPageSchema.safeParse({ ...page(entry), extra: 1 }).success, false);
  assert.equal("ownerId" in authoredLibraryPageSchema.parse(page({ ...entry, image, ownerId: "u" })).problems[0], false);
  assert.equal(authoredLibraryPageSchema.safeParse(page({ ...entry, image: { ...image, mediaId: randomUUID() } })).success, false);
  const card = { key: `authored:${problem}`, kind: "authored", id: problem, title: "T", tags: [], summary: "S", estimatedDifficulty: null, author: null };
  assert.ok(collectionEntrySchema.safeParse(card).success);
  assert.ok(collectionEntrySchema.safeParse({ ...card, image }).success);
  assert.equal(collectionEntrySchema.safeParse({ ...card, image, owner: "u" }).success, false);
  assert.equal(collectionEntrySchema.safeParse({ ...card, image: { ...image, src: "/x" } }).success, false);
});

test("the image adds about 200 bytes to a card, 300 at the longest alt text", () => {
  const [problem, revision] = ids();
  const size = (alt: string) => Buffer.byteLength(JSON.stringify({ image: authoredCardImage(problem, revision, alt) }));
  assert.ok(size("A beam on two supports with a hanging mass") < 210, String(size("A beam on two supports with a hanging mass")));
  assert.ok(size("y".repeat(140)) <= 305, String(size("y".repeat(140))));
});

// A pool that answers the library query with one published problem that has a linked first image.
function fakePool(second: "allow" | "none" | "fail", problems: string[]) {
  const meta = { title: "T", topicTags: [], methodTags: [], estimatedDifficulty: null, provenance: { kind: "original", source: "", rightsDeclaration: "ok" } };
  let calls = 0;
  const pool = { query: async () => {
    calls++;
    if (calls === 1) return { rows: problems.map((p) => ({ problemId: p, revisionId: randomUUID(), metadata: meta, imageAlt: "  A figure  ", imageLinked: true })) };
    if (second === "fail") throw new Error("relation community_restriction does not exist");
    return { rows: second === "allow" ? problems.map((problemId) => ({ problemId })) : [] };
  } };
  return pool as unknown as Pool;
}
const list = async (pool: Pool) => (await createAuthoredLibraryApi(pool)(new Request("https://test/?"))).json() as Promise<{ problems: { problemId: string; image?: { alt: string; src: string } }[] }>;

test("an image is returned only for problems the restriction check allows, and a failed check shows none but keeps the list", async () => {
  const [a, b] = ids();
  const allowed = await list(fakePool("allow", [a, b]));
  assert.equal(allowed.problems.length, 2);
  assert.ok(allowed.problems.every((p) => p.image?.alt === "A figure" && p.image.src.startsWith(`/card-images/${p.problemId}/`)));
  const restricted = await list(fakePool("none", [a, b]));
  assert.equal(restricted.problems.length, 2);
  assert.ok(restricted.problems.every((p) => p.image === undefined));
  const unreadable = await list(fakePool("fail", [a, b]));
  assert.equal(unreadable.problems.length, 2, "the list does not fail");
  assert.ok(unreadable.problems.every((p) => p.image === undefined && !JSON.stringify(p).includes("ownerId")));
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
type Block = Record<string, unknown>;
test("on PostgreSQL only a ready, linked, statement first image of a published, unrestricted revision is returned", { skip: !url }, async () => {
  const target = new URL(url!);
  assert.equal(target.hostname, "127.0.0.1");
  const schema = "card_image_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: url, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, max: 4 });
  try {
    await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');
    for (const name of ["0001_problem_authoring", "0002_authored_write_limit", "0003_author_media"]) await pool.query(`BEGIN;${await readFile(`migrations/${name}.up.sql`, "utf8")}COMMIT;`);
    // Only the columns the library reads. The real table is migration 0019.
    await pool.query("CREATE TABLE community_restriction(kind text NOT NULL, target_id text NOT NULL, problem_id uuid, user_id text, restricted boolean NOT NULL, version integer NOT NULL)");
    const text = (t: string): Block => ({ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: t }] });
    const image = (mediaId: string, alt: string): Block => ({ id: randomUUID(), kind: "image", mediaId, alt, caption: "" });
    let n = 0;
    async function seed(o: { state?: "published" | "archived" | "draft"; media?: "ready" | "none" | "solution"; alt?: string; context?: (mediaId: string) => Block[]; sections?: (mediaId: string) => Block[] }) {
      const owner = `u${++n}`, problem = randomUUID(), revision = randomUUID(), mediaId = randomUUID();
      await pool.query('INSERT INTO "user" VALUES($1)', [owner]);
      await pool.query("INSERT INTO authored_problem(id,slug,owner_id,state) VALUES($1,$2,$3,'draft')", [problem, `p${n}`, owner]);
      const kind = o.media ?? "ready", purpose = kind === "solution" ? "solution-image" : "statement-image";
      if (kind !== "none") await pool.query("INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state) VALUES($1,$2,$3,$4,'a.png','image/png',10,$5,$6)", [mediaId, problem, purpose, `author-media/${mediaId}`, "a".repeat(64), "ready"]);
      const context = o.context ? o.context(mediaId) : [text("Statement"), image(mediaId, o.alt ?? "A beam on two supports")];
      const part = { id: randomUUID(), label: "a", answerMode: "numeric", blocks: [text("Question")] };
      const sections = [{ id: randomUUID(), title: "S", blocks: o.sections ? o.sections(mediaId) : [], parts: [part] }];
      const content = { title: `Problem ${n}`, topicTags: [], methodTags: [], estimatedDifficulty: "1200", context, sections, attachments: [], provenance: { kind: "original", source: "", rightsDeclaration: "ok" } };
      // The database keeps referenced media ready for good, so a not ready file cannot be bound to a revision.
      const bound = context.concat(sections.flatMap((s) => s.blocks)).some((b) => b.kind === "image") && kind !== "none" && kind !== "solution";
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        if (bound) await c.query("INSERT INTO author_revision_media VALUES($1,$2,$3,'statement-image')", [revision, problem, mediaId]);
        await c.query("INSERT INTO authored_revision_part VALUES($1,$2,'numeric')", [revision, part.id]);
        await c.query("INSERT INTO authored_revision_private_part VALUES($1,$2,'numeric',$3)", [revision, part.id, JSON.stringify({ partId: part.id, key: { kind: "numeric", value: 2, units: "1", absTol: 0.00001, relTol: 0.000002 }, hints: [], solution: [text("A private explanation")] })]);
        await c.query("INSERT INTO authored_revision(id,problem_id,number,content) VALUES($1,$2,1,$3)", [revision, problem, JSON.stringify(content)]);
        await c.query("COMMIT");
      } finally { c.release(); }
      const state = o.state ?? "published";
      if (state !== "draft") await pool.query("UPDATE authored_problem SET state='published',published_revision_id=$2 WHERE id=$1", [problem, revision]);
      if (state === "archived") await pool.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE id=$1", [problem]);
      return { problem, revision, owner, mediaId };
    }
    const bySeed = async () => new Map((await list(pool)).problems.map((p) => [p.problemId, p]));

    const good = await seed({});
    const later = await seed({ context: (m) => [text("a"), text("b"), image(m, "Found later")] });
    const inSection = await seed({ context: () => [text("only text")], sections: (m) => [text("x"), image(m, "In a section")] });
    const long = await seed({ alt: `  ${"z".repeat(200)}  ` });
    const empty = await seed({ alt: "   " });
    const noImage = await seed({ context: () => [text("only text")], media: "none" });
    const solutionOnly = await seed({ context: () => [text("only text")], media: "solution" });
    const draft = await seed({ state: "draft" });
    const archived = await seed({ state: "archived" });
    const bannedAuthor = await seed({});
    const removedProblem = await seed({});
    await pool.query("INSERT INTO community_restriction VALUES('user',$1,NULL,$1,true,1)", [bannedAuthor.owner]);
    await pool.query("INSERT INTO community_restriction VALUES('problem',$1::text,$1::uuid,NULL,true,1)", [removedProblem.problem]);
    // A lifted restriction does not hide anything.
    const lifted = await seed({});
    await pool.query("INSERT INTO community_restriction VALUES('user',$1,NULL,$1,false,2)", [lifted.owner]);

    const found = await bySeed();
    assert.equal(found.get(good.problem)?.image?.alt, "A beam on two supports");
    assert.equal(found.get(good.problem)?.image?.src, `/card-images/${good.problem}/${good.revision}`);
    assert.equal(found.get(later.problem)?.image?.alt, "Found later", "the first image block, even when it is not the first block");
    assert.equal(found.get(inSection.problem)?.image?.alt, "In a section");
    assert.equal(found.get(long.problem)?.image?.alt, "z".repeat(140));
    assert.equal(found.get(lifted.problem)?.image !== undefined, true);
    for (const none of [empty, noImage, solutionOnly, bannedAuthor, removedProblem]) {
      assert.ok(found.has(none.problem), "still listed");
      assert.equal(found.get(none.problem)?.image, undefined);
    }
    assert.equal(found.has(draft.problem), false, "a draft is never listed");
    assert.equal(found.has(archived.problem), false, "an archived problem is never listed");
    for (const p of found.values()) assert.deepEqual(Object.keys(p.image ?? { src: 1, alt: 1, width: 1, height: 1 }).sort(), ["alt", "height", "src", "width"]);
    assert.ok(!JSON.stringify([...found.values()]).match(/mediaId|ownerId|pathname|sha256|author-media/));

    // An older deployment without the restriction table still lists problems, with no images.
    await pool.query("DROP TABLE community_restriction");
    const without = await bySeed();
    assert.ok(without.has(good.problem));
    assert.ok([...without.values()].every((p) => p.image === undefined));
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
