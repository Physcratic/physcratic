import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { deflateSync, crc32 } from "node:zlib";
import { Pool } from "pg";
import sharp from "sharp";
import { createCardImageApi } from "./authored-card-image-api";
import { firstImageBlock } from "./authored-first-image";
import { createAuthoredLibraryApi } from "./authored-library-api";

const text = (t: string) => ({ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: t }] });
const img = (mediaId: string, alt = "A figure") => ({ id: randomUUID(), kind: "image", mediaId, alt, caption: "" });

test("the first image block is found in reading order, and a later image never stands in for it", () => {
  const [a, b, c] = ["a", "b", "c"].map((mediaId) => img(mediaId, mediaId));
  const mediaOf = (content: unknown) => (firstImageBlock(content)?.mediaId ?? null);
  assert.equal(mediaOf({ context: [text("x"), a, b] }), "a");
  assert.equal(mediaOf({ context: [text("x")], sections: [{ blocks: [a], parts: [{ blocks: [b] }] }] }), "a", "a section's blocks come before its parts' blocks");
  assert.equal(mediaOf({ context: [], sections: [{ blocks: [], parts: [{ blocks: [a] }] }, { blocks: [b] }] }), "a", "a part of section one comes before section two");
  assert.equal(mediaOf({ context: [b], sections: [{ blocks: [a], parts: [] }] }), "b", "the context comes first");
  assert.equal(firstImageBlock({ context: [img("a", ""), b] })?.alt, "", "an image without alt is still the first image");
  for (const none of [null, undefined, 5, "x", [], {}, { context: [text("x")], sections: [{ blocks: [], parts: [{ blocks: [text("y")] }] }] }, { context: "no", sections: "no" }]) assert.equal(firstImageBlock(none), null);
  void c;
});

// Test pictures. A photo with GPS and a copyright in its EXIF, a PNG that is a decompression bomb, and a 1 by 1 GIF.
const noisy = (w: number, h: number) => { const d = Buffer.alloc(w * h * 3); for (let i = 0; i < d.length; i++) d[i] = (i * 7 + ((i / 3) % w) * 0.4 + ((i * 2654435761) >>> 28)) & 255; return d; };
const photo = () => sharp(noisy(1600, 1200), { raw: { width: 1600, height: 1200, channels: 3 } })
  .jpeg({ quality: 85 }).withExif({ IFD0: { Copyright: "Secret owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "0/1 7/1 0/1" } }).toBuffer();
const bomb = () => { // 8000 by 8000 grey, valid, about 64 KB: over the 40 megapixel limit
  const chunk = (type: string, data: Buffer) => { const head = Buffer.alloc(8); head.writeUInt32BE(data.length); head.write(type, 4); const tail = Buffer.alloc(4); tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data]))); return Buffer.concat([head, data, tail]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(8000, 0); ihdr.writeUInt32BE(8000, 4); ihdr[8] = 8;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.alloc(8000 * 8001))), chunk("IEND", Buffer.alloc(0))]);
};
const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

// A pool that answers the three queries of the route in order of their text.
function scripted(o: { revision?: object | null; media?: { pathname: string; media_type: string; bytes: number } | null; allowed?: boolean | "fail" }) {
  const problem = randomUUID(), mediaId = randomUUID();
  const content = o.revision === undefined ? { context: [img(mediaId)] } : o.revision;
  const query = async (q: { text?: string } | string) => {
    const t = typeof q === "string" ? q : q.text ?? "";
    if (t.includes("FROM authored_revision") || t.includes("JOIN authored_revision")) return { rows: content === null ? [] : [{ content }] };
    if (t.includes("author_revision_media")) return { rows: o.media === null ? [] : [o.media ?? { pathname: "author-media/x", media_type: "image/jpeg", bytes: 1000 }] };
    if (o.allowed === "fail") throw new Error("relation community_restriction does not exist");
    return { rows: o.allowed === false ? [] : [{ problemId: problem }] };
  };
  return { pool: { query } as unknown as Pool, problem };
}
const run = async (bytes: Uint8Array | null, o: Parameters<typeof scripted>[0] = {}) => {
  const { pool, problem } = scripted(o);
  const res = await createCardImageApi({ pool, storage: { get: async () => (bytes ? new Blob([bytes as BlobPart]) : null), put: async () => { throw new Error("no writes"); }, del: async () => { throw new Error("no writes"); } } })(problem, randomUUID());
  return res;
};

test("a valid image is a small webp with the right headers, no metadata and no cookie", async () => {
  const original = await photo();
  assert.ok((await sharp(original).metadata()).exif, "the test photo has EXIF");
  assert.ok(original.includes(Buffer.from("Secret owner")));
  const res = await run(original);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/webp");
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(res.headers.get("Set-Cookie"), null);
  const out = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "webp");
  assert.ok(meta.width === 480 && meta.height === 360, `${meta.width}x${meta.height}`);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
  assert.ok(!out.includes(Buffer.from("Secret owner")) && !out.includes(Buffer.from("GPS")) && !out.includes(Buffer.from("Exif")));
  assert.ok(out.length < 100 * 1024, `${out.length} bytes`);
});

test("an image smaller than 480 pixels is not enlarged, and a gif gives its first frame", async () => {
  const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#4477aa" } }).png().toBuffer();
  assert.equal((await sharp(Buffer.from(await (await run(small, { media: { pathname: "p", media_type: "image/png", bytes: small.length } })).arrayBuffer())).metadata()).width, 300);
  const res = await run(gif, { media: { pathname: "p", media_type: "image/gif", bytes: gif.length } });
  assert.equal(res.status, 200);
  assert.equal((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).format, "webp");
});

test("anything that is not a ready raster statement image of an allowed, published revision is an empty 404", async () => {
  const jpeg = await photo();
  const bombBytes = bomb();
  assert.equal((await sharp(bombBytes, { limitInputPixels: false }).metadata()).width, 8000, "the bomb is a valid picture");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
  const cases: [string, Promise<Response>][] = [
    ["pixel bomb", run(bombBytes, { media: { pathname: "p", media_type: "image/png", bytes: bombBytes.length } })],
    ["svg bytes declared as png", run(svg, { media: { pathname: "p", media_type: "image/png", bytes: svg.length } })],
    ["svg media type", run(svg, { media: { pathname: "p", media_type: "image/svg+xml", bytes: svg.length } })],
    ["pdf media type", run(jpeg, { media: { pathname: "p", media_type: "application/pdf", bytes: 10 } })],
    ["text bytes", run(Buffer.from("not an image"), { media: { pathname: "p", media_type: "image/jpeg", bytes: 12 } })],
    ["stored over 3 MiB", run(jpeg, { media: { pathname: "p", media_type: "image/jpeg", bytes: 3 * 1024 * 1024 + 1 } })],
    ["file over 3 MiB in storage", run(Buffer.alloc(3 * 1024 * 1024 + 1), { media: { pathname: "p", media_type: "image/jpeg", bytes: 1000 } })],
    ["missing from storage", run(null)],
    ["not bound or not ready", run(jpeg, { media: null })],
    ["no such published revision", run(jpeg, { revision: null })],
    ["no image in the document", run(jpeg, { revision: { context: [text("x")] } })],
    ["first image has no alt", run(jpeg, { revision: { context: [img(randomUUID(), "  "), img(randomUUID())] } })],
    ["media id is not a uuid", run(jpeg, { revision: { context: [img("../etc/passwd")] } })],
    ["restricted", run(jpeg, { allowed: false })],
    ["restriction cannot be read", run(jpeg, { allowed: "fail" })],
  ];
  for (const [name, pending] of cases) {
    const res = await pending;
    assert.equal(res.status, 404, name);
    assert.equal(await res.text(), "", `${name}: no detail`);
    assert.equal(res.headers.get("Cache-Control"), "no-store", name);
  }
  const { pool } = scripted({});
  for (const [p, r] of [["nope", randomUUID()], [randomUUID(), "nope"]]) assert.equal((await createCardImageApi({ pool, storage: { get: async () => null, put: async () => undefined, del: async () => undefined } })(p, r)).status, 404);
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("on PostgreSQL the route and the library query pick the same image, and drafts, archives, other revisions and restricted authors give 404", { skip: !url }, async () => {
  assert.equal(new URL(url!).hostname, "127.0.0.1");
  const schema = "card_route_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: url, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, max: 4 });
  try {
    await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');
    for (const name of ["0001_problem_authoring", "0002_authored_write_limit", "0003_author_media"]) await pool.query(`BEGIN;${await readFile(`migrations/${name}.up.sql`, "utf8")}COMMIT;`);
    await pool.query("CREATE TABLE community_restriction(kind text NOT NULL, target_id text NOT NULL, problem_id uuid, user_id text, restricted boolean NOT NULL, version integer NOT NULL)");
    const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#aa5544" } }).png().toBuffer();
    const fetched: string[] = [];
    const route = createCardImageApi({ pool, storage: { get: async (path) => { fetched.push(path); return new Blob([png as BlobPart]); }, put: async () => undefined, del: async () => undefined } });
    const lib = async () => new Map(((await (await createAuthoredLibraryApi(pool)(new Request("https://test/?"))).json()) as { problems: { problemId: string; image?: { alt: string } }[] }).problems.map((p) => [p.problemId, p]));
    let n = 0;
    type Spec = { context: unknown[]; sections?: { blocks: unknown[]; parts: { blocks: unknown[] }[] }[] };
    // Two images, A (alt "A") and B (alt "B"), both ready and bound. `make` decides where each one sits.
    async function seed(make: (a: ReturnType<typeof img>, b: ReturnType<typeof img>) => Spec, state: "published" | "archived" | "draft" = "published") {
      const owner = `u${++n}`, problem = randomUUID(), revision = randomUUID(), ma = randomUUID(), mb = randomUUID();
      await pool.query('INSERT INTO "user" VALUES($1)', [owner]);
      await pool.query("INSERT INTO authored_problem(id,slug,owner_id,state) VALUES($1,$2,$3,'draft')", [problem, `p${n}`, owner]);
      for (const m of [ma, mb]) await pool.query("INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state) VALUES($1,$2,'statement-image',$3,'a.png','image/png',10,$4,'ready')", [m, problem, `author-media/${m}`, "a".repeat(64)]);
      const spec = make(img(ma, "A"), img(mb, "B"));
      const sections = (spec.sections ?? [{ blocks: [], parts: [{ blocks: [] }] }]).map((s) => ({ id: randomUUID(), title: "S", blocks: s.blocks, parts: s.parts.map((q) => ({ id: randomUUID(), label: "a", answerMode: "numeric", blocks: q.blocks })) }));
      const content = { title: `P${n}`, topicTags: [], methodTags: [], estimatedDifficulty: "1200", context: spec.context, sections, attachments: [], provenance: { kind: "original", source: "", rightsDeclaration: "ok" } };
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        for (const m of [ma, mb].filter((id) => JSON.stringify(content).includes(id))) await c.query("INSERT INTO author_revision_media VALUES($1,$2,$3,'statement-image')", [revision, problem, m]);
        for (const part of sections.flatMap((s) => s.parts)) {
          await c.query("INSERT INTO authored_revision_part VALUES($1,$2,'numeric')", [revision, part.id]);
          await c.query("INSERT INTO authored_revision_private_part VALUES($1,$2,'numeric',$3)", [revision, part.id, JSON.stringify({ partId: part.id, key: { kind: "numeric", value: 2, units: "1", absTol: 0.00001, relTol: 0.000002 }, hints: [], solution: [text("p")] })]);
        }
        await c.query("INSERT INTO authored_revision(id,problem_id,number,content) VALUES($1,$2,1,$3)", [revision, problem, JSON.stringify(content)]);
        await c.query("COMMIT");
      } finally { c.release(); }
      if (state !== "draft") await pool.query("UPDATE authored_problem SET state='published',published_revision_id=$2 WHERE id=$1", [problem, revision]);
      if (state === "archived") await pool.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE id=$1", [problem]);
      return { problem, revision, owner, media: new Map<string, string>([[ma, "A"], [mb, "B"]]) };
    }
    const fixtures: [string, Parameters<typeof seed>[0], "A" | "B" | null][] = [
      ["context order", (a, b) => ({ context: [text("x"), a, b] }), "A"],
      ["context before sections", (a, b) => ({ context: [b], sections: [{ blocks: [a], parts: [{ blocks: [] }] }] }), "B"],
      ["section blocks before part blocks", (a, b) => ({ context: [], sections: [{ blocks: [a], parts: [{ blocks: [b] }] }] }), "A"],
      ["part of section one before section two", (a, b) => ({ context: [], sections: [{ blocks: [], parts: [{ blocks: [a] }] }, { blocks: [b], parts: [{ blocks: [] }] }] }), "A"],
      ["image only in a part", (a) => ({ context: [text("x")], sections: [{ blocks: [], parts: [{ blocks: [text("y"), a] }] }] }), "A"],
      ["first image has no alt, so none and no skipping", (a, b) => ({ context: [{ ...a, alt: "  " }, b] }), null],
      ["no image at all", () => ({ context: [text("x")] }), null],
    ];
    for (const [name, make, expected] of fixtures) {
      const f = await seed(make);
      fetched.length = 0;
      const res = await route(f.problem, f.revision);
      const fromLibrary = (await lib()).get(f.problem)?.image?.alt ?? null;
      const fromRoute = res.status === 200 ? f.media.get(fetched[0].replace("author-media/", "")) ?? "?" : null;
      assert.equal(fromRoute, expected, `route: ${name}`);
      assert.equal(fromLibrary, expected, `library: ${name}`);
      assert.equal(res.status, expected ? 200 : 404, name);
    }
    const ok = await seed((a) => ({ context: [a] }));
    const other = await seed((a) => ({ context: [a] }));
    const asked = async (p: string, r: string) => { fetched.length = 0; const res = await route(p, r); return [res.status, fetched.length] as const; };
    assert.deepEqual(await asked(ok.problem, ok.revision), [200, 1]);
    assert.deepEqual(await asked(ok.problem, other.revision), [404, 0], "another problem's revision");
    assert.deepEqual(await asked(ok.problem, randomUUID()), [404, 0], "a revision that does not exist");
    assert.deepEqual(await asked((await seed((a) => ({ context: [a] }), "draft")).problem, randomUUID()), [404, 0], "a draft");
    const archived = await seed((a) => ({ context: [a] }), "archived");
    assert.deepEqual(await asked(archived.problem, archived.revision), [404, 0], "an archived problem");
    const banned = await seed((a) => ({ context: [a] })), removed = await seed((a) => ({ context: [a] }));
    await pool.query("INSERT INTO community_restriction VALUES('user',$1,NULL,$1,true,1)", [banned.owner]);
    await pool.query("INSERT INTO community_restriction VALUES('problem',$1::text,$1::uuid,NULL,true,1)", [removed.problem]);
    assert.deepEqual(await asked(banned.problem, banned.revision), [404, 0], "a restricted author");
    assert.deepEqual(await asked(removed.problem, removed.revision), [404, 0], "a restricted problem");
    // The draft's stale revision id on a published problem is not the current revision either.
    await pool.query("DROP TABLE community_restriction");
    assert.deepEqual(await asked(ok.problem, ok.revision), [404, 0], "no restriction table, fail closed");
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
