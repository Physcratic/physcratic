import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import sharp from "sharp";
import { encodeProfileImage, InvalidProfileImage } from "./community/profile-image";
import { createProfileMediaApi } from "./community/profile-media-api";
import { profileMediaEnabled, createProfileMediaRoute } from "./community/profile-media-route";
import { createPrivateProfileStorage, type ProfileMediaStorage } from "./community/profile-media-storage";
import { isAllowedSubmissionOrigin } from "./submission-security";

const fixture = () => sharp({ create: { width: 256, height: 128, channels: 3, background: "#4c7296" } });
test("profile image normalization verifies bytes, dimensions and frames and removes private metadata", async () => {
  for (const format of ["png", "jpeg", "webp"] as const) {
    const input = await fixture().withMetadata({ exif: { IFD0: { Artist: "PRIVATE_EXIF_SENTINEL" } } }).toFormat(format).toBuffer();
    for (const kind of ["avatar", "banner"] as const) {
      const output = await encodeProfileImage(input, kind);
      const metadata = await sharp(output).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, kind === "avatar" ? 512 : 1600);
      assert.equal(metadata.height, kind === "avatar" ? 512 : 400);
      assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined); assert.equal(metadata.xmp, undefined);
      assert.equal(output.includes(Buffer.from("PRIVATE_EXIF_SENTINEL")), false);
    }
  }
  for (const bytes of [Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), Buffer.from("<html>not an image</html>"),
    Buffer.from([137,80,78,71,13,10,26,10]), Buffer.from("GIF89a"),
    await sharp({ create: { width: 9000, height: 32, channels: 3, background: "red" } }).png().toBuffer(),
    await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer(),
    await sharp(Buffer.concat([Buffer.alloc(64*64*3,30),Buffer.alloc(64*64*3,230)]), { raw: { width: 64, height: 128, channels: 3, pageHeight: 64 } }).webp({ loop: 0, delay: [100,100] }).toBuffer(),
  ]) await assert.rejects(encodeProfileImage(bytes, "avatar"), InvalidProfileImage);
  await assert.rejects(encodeProfileImage(new Uint8Array(2*1024*1024+1), "avatar"), RangeError);
});

test("profile image flags default off and never load missing schema or storage bindings", async () => {
  assert.equal(profileMediaEnabled({}), false);
  assert.equal(profileMediaEnabled({ COMMUNITY_PROFILE_MEDIA_ENABLED: "true" }), false);
  assert.equal(profileMediaEnabled({ COMMUNITY_PROFILES_ENABLED: "true" }), false);
  assert.equal(profileMediaEnabled({ COMMUNITY_PROFILES_ENABLED: "true", COMMUNITY_PROFILE_MEDIA_ENABLED: "true" }), true);
  let loaded = 0;
  const route = createProfileMediaRoute(() => false, async () => { loaded++; throw new Error("MISSING_SCHEMA"); });
  for (const action of ["metadata", "image", "upload", "remove", "cleanup"] as const) {
    const response = await route(action, new Request("https://physcratic.test/api"), "avatar");
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: "Profile images are disabled." });
  }
  assert.equal(loaded, 0);
  const previous = process.env.COMMUNITY_PROFILE_MEDIA_ENABLED;
  delete process.env.COMMUNITY_PROFILE_MEDIA_ENABLED;
  try {
    const own = await import("../app/api/community/profile-media/route");
    const kind = await import("../app/api/community/profile-media/[kind]/route");
    const image = await import("../app/api/community/profile-media/image/[id]/route");
    const cleanup = await import("../app/api/community/profile-media/cleanup/route");
    const request = new Request("https://physcratic.test/api");
    assert.equal((await own.GET(request)).status, 503);
    assert.equal((await kind.PUT(request, { params: Promise.resolve({ kind: "avatar" }) })).status, 503);
    assert.equal((await kind.DELETE(request, { params: Promise.resolve({ kind: "avatar" }) })).status, 503);
    assert.equal((await image.GET(request, { params: Promise.resolve({ id: randomUUID() }) })).status, 503);
    assert.equal((await cleanup.POST(request)).status, 503);
  } finally { if (previous === undefined) delete process.env.COMMUNITY_PROFILE_MEDIA_ENABLED; else process.env.COMMUNITY_PROFILE_MEDIA_ENABLED = previous; }
});

test("profile storage uses only its private namespace, explicit store and per-operation OIDC", async () => {
  let calls = 0;
  const seen: unknown[][] = [];
  const sdk = { put: async (...args: unknown[]) => { seen.push(args); return {} as never; },
    get: async (...args: unknown[]) => { seen.push(args); return null; }, del: async (...args: unknown[]) => { seen.push(args); } };
  const storage = createPrivateProfileStorage({ sdk, env: () => ({ COMMUNITY_PROFILE_BLOB_STORE_ID: "store_existing" }), oidc: async () => `opaque-${++calls}` });
  const path = `community-profile-media/${randomUUID()}.webp`;
  await storage.put(path, new Uint8Array([1])); await storage.get(path); await storage.del(path);
  assert.equal(calls, 3);
  assert.equal((seen[0][2] as { access: string }).access, "private");
  assert.equal((seen[0][2] as { allowOverwrite: boolean }).allowOverwrite, false);
  assert.equal((seen[0][2] as { addRandomSuffix: boolean }).addRandomSuffix, false);
  assert.equal((seen[1][1] as { access: string }).access, "private");
  assert.equal((seen[2][1] as { storeId: string }).storeId, "store_existing");
  for (const path of ["https://attacker.invalid/image.webp", "author-media/private.webp", "community-profile-media/../secret.webp"])
    await assert.rejects(storage.get(path));
  await assert.rejects(createPrivateProfileStorage({ sdk, env: () => ({}), oidc: async () => "unused" }).put(path, new Uint8Array([1])));
  assert.equal(seen.length, 3);
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("profile media lifecycle and privacy on disposable PostgreSQL", { skip: !url && "Use disposable PostgreSQL harness" }, async t => {
  const target = new URL(url!); assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.pathname, "/physcratic_authoring_test"); assert.equal(target.search, "");
  const schema = `profile_media_${randomUUID().replaceAll("-", "")}`, role = `${schema}_runtime`;
  const admin = new Pool({ connectionString: url, max: 1 });
  const setup = new Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 5 });
  const pools: Pool[] = [];
  t.after(async () => { await Promise.all(pools.map(pool => pool.end())); await setup.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.query(`DROP ROLE ${role}`); await admin.end(); });
  await admin.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} NOLOGIN`);
  await setup.query(`CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES('owner'),('other'),('empty')`);
  const up7 = await readFile("migrations/0007_community_profile.up.sql", "utf8");
  const up = await readFile("migrations/0008_community_profile_media.up.sql", "utf8"), down = await readFile("migrations/0008_community_profile_media.down.sql", "utf8");
  await setup.query(`BEGIN; ${up7} ${up} COMMIT;`);
  await setup.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT,INSERT,UPDATE ON community_profile,community_profile_media_limit TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON community_profile_media TO ${role}`);
  await setup.query("INSERT INTO community_profile(user_id,handle,display_name) VALUES('owner','owner_handle','Chosen'),('other','other_handle','Other chosen')");
  const objects = new Map<string, Uint8Array>();
  let failPut = false, latePut = false, failDel = false, puts = 0;
  let beforePut: (() => Promise<void>) | undefined;
  const storage: ProfileMediaStorage = {
    async put(path, bytes) { puts++; await beforePut?.(); if (latePut) objects.set(path, bytes); if (failPut) throw new Error("PRIVATE_STORAGE_URL_TOKEN"); objects.set(path, bytes); },
    async get(path) { const bytes = objects.get(path); return bytes ? new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) : null; },
    async del(path) { if (failDel) throw new Error("PRIVATE_DELETE_URL"); objects.delete(path); },
  };
  const apis = Array.from({ length: 2 }, () => {
    const pool = new Pool({ connectionString: url, options: `-c search_path=${schema} -c role=${role}`, max: 5 }); pools.push(pool);
    return createProfileMediaApi({ pool, storage, origin: request => isAllowedSubmissionOrigin(request, ["https://physcratic.test"]),
      user: async request => { const id = request.headers.get("x-test-session"); return id && id !== "guest" ? { id: id === "unverified" ? "owner" : id, emailVerified: id !== "unverified" } : null; } });
  });
  const png = await fixture().png().toBuffer();
  const request = (bytes?: Uint8Array, user = "owner", extra: Record<string,string> = {}, search = "") => new Request(`https://physcratic.test/api/community/profile-media${search}`, {
    method: bytes ? "PUT" : "GET", headers: { origin: "https://physcratic.test", "x-test-session": user, "content-type": "image/png", ...extra }, body: bytes ? new Uint8Array(bytes) : undefined,
  });
  const upload = (kind = "avatar", user = "owner", instance = 0) => apis[instance]("upload", request(png, user), kind);
  const own = (user = "owner") => apis[0]("metadata", request(undefined, user));
  const image = (id: string, user = "guest") => apis[0]("image", request(undefined, user), id);
  const reset = () => setup.query("TRUNCATE community_profile_media_limit");
  t.beforeEach(async () => { await setup.query("TRUNCATE community_profile_media,community_profile_media_limit"); objects.clear(); failPut = latePut = failDel = false; puts = 0; beforePut = undefined;
    await setup.query("UPDATE community_profile SET public_visibility=false"); });

  await t.test("explicit owner upload, guest privacy, image revocation and sanitized metadata", async () => {
    const response = await upload(); assert.equal(response.status, 201);
    const body = await response.json(); assert.ok(body.media.avatar.id); assert.equal(body.media.banner, null);
    assert.equal(JSON.stringify(body).includes("pathname"), false); assert.equal(JSON.stringify(body).includes("blob.vercel"), false);
    const id = body.media.avatar.id;
    assert.equal((await image(id)).status, 404); assert.equal((await image(id, "other")).status, 404);
    const ownerImage = await image(id, "owner"); assert.equal(ownerImage.status, 200); assert.equal(ownerImage.headers.get("content-type"), "image/webp");
    assert.match(ownerImage.headers.get("cache-control")!, /private.*no-store/);
    assert.equal((await sharp(Buffer.from(await ownerImage.arrayBuffer())).metadata()).width, 512);
    assert.equal((await apis[0]("metadata", request(undefined, "guest", {}, "?handle=owner_handle"))).status, 404);
    await setup.query("UPDATE community_profile SET public_visibility=true WHERE user_id='owner'");
    assert.equal((await image(id)).status, 200);
    assert.equal((await apis[0]("metadata", request(undefined, "guest", {}, "?handle=owner_handle"))).status, 200);
    await setup.query("UPDATE community_profile SET public_visibility=false WHERE user_id='owner'");
    assert.equal((await image(id)).status, 404); assert.equal((await image(id, "owner")).status, 200);
    const removed = await apis[0]("remove", request(), "avatar"); assert.equal(removed.status, 200);
    assert.equal((await removed.json()).media.avatar, null); assert.equal((await image(id, "owner")).status, 404); assert.equal(objects.size, 0);
  });
  await t.test("replacement invalidates previous IDs and concurrent uploads retain one active image", async () => {
    const first = (await (await upload()).json()).media.avatar.id;
    assert.equal((await upload("banner")).status, 201);
    const results = await Promise.all([upload("avatar", "owner", 0), upload("avatar", "owner", 1)]);
    assert.deepEqual(results.map(r => r.status), [201,201]);
    const state = await (await own()).json(); assert.ok(state.media.avatar); assert.ok(state.media.banner);
    assert.equal((await setup.query("SELECT count(*)::int n FROM community_profile_media WHERE state='active'")).rows[0].n, 2);
    assert.equal((await image(first, "owner")).status, 404);
    assert.equal(objects.size, 2);
  });
  await t.test("failed/ambiguous PUT preserves old image and leaves delayed cleanup evidence", async () => {
    const oldId = (await (await upload()).json()).media.avatar.id;
    failPut = latePut = true;
    const failed = await upload(); assert.equal(failed.status, 503); assert.equal((await failed.text()).includes("PRIVATE"), false);
    assert.equal((await (await own()).json()).media.avatar.id, oldId);
    assert.equal(objects.size, 2);
    const pending = (await setup.query("SELECT id,delete_after>now() waiting FROM community_profile_media WHERE state='retired'")).rows[0]; assert.equal(pending.waiting, true);
    await apis[0]("cleanup", request()); assert.equal(objects.size, 2, "ambiguous PUT grace retains evidence");
    // Disposable time travel, leaving the production immutability guard unchanged.
    await setup.query("ALTER TABLE community_profile_media DISABLE TRIGGER community_profile_media_guard");
    await setup.query("UPDATE community_profile_media SET delete_after=now()-interval '2 hours' WHERE id=$1", [pending.id]);
    await setup.query("ALTER TABLE community_profile_media ENABLE TRIGGER community_profile_media_guard");
    failPut = latePut = false;
    await apis[0]("cleanup", request()); assert.equal(objects.size, 1);
  });
  await t.test("delete outage revokes reads immediately and retry removes the orphan", async () => {
    const id = (await (await upload()).json()).media.avatar.id; failDel = true;
    const removed = await apis[0]("remove", request(), "avatar"); assert.equal(removed.status, 200);
    assert.equal((await removed.json()).cleanupPending, true); assert.equal((await image(id, "owner")).status, 404); assert.equal(objects.size, 1);
    await setup.query("ALTER TABLE community_profile_media DISABLE TRIGGER community_profile_media_guard");
    await setup.query("UPDATE community_profile_media SET delete_after=now()-interval '2 minutes' WHERE id=$1", [id]);
    await setup.query("ALTER TABLE community_profile_media ENABLE TRIGGER community_profile_media_guard");
    failDel = false; await apis[0]("cleanup", request()); assert.equal(objects.size, 0);
  });
  await t.test("remove cancels a reserved upload so a late storage response cannot resurrect it", async () => {
    let release!: () => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    beforePut = async () => { entered(); await hold; };
    const inFlight = upload(); await started;
    try { assert.equal((await apis[1]("remove", request(), "avatar")).status, 200); }
    finally { release(); }
    assert.equal((await inFlight).status, 409);
    const row = (await setup.query("SELECT id,state,delete_after>now() waiting FROM community_profile_media")).rows[0];
    assert.equal(row.state, "retired"); assert.equal(row.waiting, true);
    assert.equal((await image(row.id, "owner")).status, 404);
    assert.equal((await (await own()).json()).media.avatar, null);
    assert.equal(objects.size, 1, "late physical object remains tracked for delayed cleanup");
  });
  await t.test("verified ownership, IDOR, origin, MIME spoof and size protections", async () => {
    assert.equal((await upload("avatar", "guest")).status, 401); assert.equal((await upload("avatar", "unverified")).status, 403);
    assert.equal((await apis[0]("upload", request(png, "owner", { origin: "https://evil.test" }), "avatar")).status, 403);
    assert.equal((await apis[0]("upload", request(png, "owner", { "sec-fetch-site": "cross-site" }), "avatar")).status, 403);
    assert.equal((await upload(randomUUID())).status, 400);
    assert.equal((await upload("avatar", "empty")).status, 409);
    assert.equal((await setup.query("SELECT 1 FROM community_profile WHERE user_id='empty'")).rowCount, 0);
    assert.equal((await apis[0]("upload", request(Buffer.from("<svg>evil</svg>")), "avatar")).status, 400);
    assert.equal((await apis[0]("upload", request(new Uint8Array(2*1024*1024+1)), "avatar")).status, 413);
    const good = await apis[0]("upload", request(png, "owner", { "content-type": "text/html" }), "avatar"); assert.equal(good.status, 201, "actual image bytes determine safe re-encoded output");
    const id = (await good.json()).media.avatar.id;
    await apis[0]("remove", request(undefined, "other"), "avatar"); assert.equal((await image(id, "owner")).status, 200);
    assert.equal((await apis[0]("metadata", request(undefined, "other", {}, "?userId=owner"))).status, 400);
    assert.equal(puts, 1, "invalid inputs never reach storage");
  });
  await t.test("cross-instance minute limits, daily quota and bounded registry storage", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => apis[i%2]("cleanup", request())));
    assert.equal(results.filter(r => r.status === 200).length, 5); assert.equal(results.filter(r => r.status === 429).length, 5);
    assert.equal(results.find(r => r.status === 429)!.headers.get("retry-after"), "60");
    await reset(); await setup.query("INSERT INTO community_profile_media_limit VALUES('owner',now()-interval '2 minutes',1,date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',20)");
    const limited = await upload(); assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "86400");
    await reset();
    for (let i=0;i<8;i++) { const id = randomUUID(); await setup.query("INSERT INTO community_profile_media(id,user_id,kind,pathname,bytes) VALUES($1,'owner','avatar',$2,1)", [id,`community-profile-media/${id}.webp`]); }
    assert.equal((await upload()).status, 429); assert.equal(puts, 0);
  });
  await t.test("database guards, restricted grants and 0008 up/down/up preserve 0007 profiles", async () => {
    const response = await upload(); const id = (await response.json()).media.avatar.id;
    await assert.rejects(setup.query("UPDATE community_profile_media SET user_id='other' WHERE id=$1",[id]), { code:"23514" });
    await assert.rejects(setup.query("UPDATE community_profile_media SET state='pending' WHERE id=$1",[id]), { code:"23514" });
    await assert.rejects(pools[0].query("DELETE FROM community_profile_media WHERE id=$1",[id]), { code:"23514" });
    await assert.rejects(setup.query(down), { code:"55000" });
    await apis[0]("remove", request(), "avatar");
    const profiles = (await setup.query("SELECT * FROM community_profile ORDER BY user_id")).rows;
    await setup.query(down); await setup.query(`BEGIN; ${up} COMMIT;`);
    assert.deepEqual((await setup.query("SELECT * FROM community_profile ORDER BY user_id")).rows,profiles);
    assert.equal((await setup.query("SELECT count(*)::int n FROM community_profile_media")).rows[0].n,0);
  });
});
