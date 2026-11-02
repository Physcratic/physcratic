import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { achievementDefinitions, achievementEligible, showcaseSchema } from "./community/achievements";
import { communityAchievementsEnabled, createCommunityAchievementsRoute } from "./community/achievements-route";
import { createCommunityAchievementsApi } from "./community/achievements-api";
import { achievementFixtures, installAchievementFixtures, achievementRequest as req, achievementParsed as parsed } from "../tests/community-achievement-fixtures";

test("achievement registry, strict selection and default-off lazy boundary", async () => {
  assert.deepEqual(achievementDefinitions.map(b => b.threshold), [1,5,15,50,1,10,50]);
  for (const definition of achievementDefinitions) {
    const progress = { author: 0, solver: 0 };
    progress[definition.category] = definition.threshold - 1; assert.equal(achievementEligible(definition.id, progress), false);
    progress[definition.category]++; assert.equal(achievementEligible(definition.id, progress), true);
  }
  assert.equal(achievementEligible("first-breakthrough", { author: 50, solver: null }), false);
  for (const selectedIds of [["fake"], ["first-spark", "first-spark"], ["first-spark", "problem-weaver", "equation-architect"]])
    assert.equal(showcaseSchema.safeParse({ selectedIds }).success, false);
  assert.equal(showcaseSchema.safeParse({ selectedIds: [], userId: "victim" }).success, false);
  for (const env of [{}, { COMMUNITY_ACHIEVEMENTS_ENABLED: "true" }, { COMMUNITY_PROFILES_ENABLED: "true" }, { COMMUNITY_PROFILES_ENABLED: "true", COMMUNITY_ACHIEVEMENTS_ENABLED: "TRUE" }])
    assert.equal(communityAchievementsEnabled(env), false);
  assert.equal(communityAchievementsEnabled({ COMMUNITY_PROFILES_ENABLED: "true", COMMUNITY_ACHIEVEMENTS_ENABLED: "true" }), true);
  const off = createCommunityAchievementsRoute(() => false, async () => { throw new Error("MUST NOT IMPORT DB OR AUTH"); });
  for (const method of ["GET", "PATCH"]) assert.equal((await off(req(undefined, undefined, method))).status, 503);
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("live achievements, SQL constraints, privacy and concurrent owner updates on disposable PostgreSQL", { skip: !url && "Requires disposable PostgreSQL" }, async t => {
  const target = new URL(url!); assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.pathname, "/physcratic_authoring_test");
  const schema = `achievements_${randomUUID().replaceAll("-", "")}`, role = `${schema}_runtime`;
  const admin = new Pool({ connectionString: url }); await admin.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} NOLOGIN`);
  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, max: 10 });
  let runtime: Pool | undefined;
  try {
    await installAchievementFixtures(pool); // 0008 deliberately absent: no media dependency.
    await pool.query(`INSERT INTO "user" VALUES('roundtrip'); INSERT INTO community_profile(user_id,handle) VALUES('roundtrip','roundtrip')`);
    const up = await readFile("migrations/0009_community_achievements.up.sql", "utf8"), down = await readFile("migrations/0009_community_achievements.down.sql", "utf8");
    await pool.query(`BEGIN; ${down} COMMIT;`); await pool.query(`BEGIN; ${up} COMMIT;`);
    assert.equal((await pool.query("SELECT public_visibility FROM community_profile WHERE user_id='roundtrip'")).rows[0].public_visibility, false);
    // Verify exact least-privilege grants; no private answer keys, reveal or session access.
    await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};
      GRANT SELECT ON community_profile,authored_problem,authored_revision,authored_revision_part,authored_attempt TO ${role};
      GRANT SELECT,INSERT,UPDATE ON community_badge_selection,community_achievement_write_limit TO ${role};
      GRANT EXECUTE ON FUNCTION community_achievement_progress(text),community_achievement_problem_solved(text,uuid) TO ${role}`);
    runtime = new Pool({ connectionString: url, options: `-c search_path=${schema},public -c role=${role}`, max: 5 });
    const f = achievementFixtures(pool), api = createCommunityAchievementsApi({ ...f.deps, pool: runtime });
    const author = await f.user(), solver = await f.user(), empty = await f.user(), unverified = await f.user("unverified"), noProfile = await f.user(randomUUID(), false);
    const progress = async (who: string) => (await parsed(await api(req(who)))).progress;
    const patch = (who: string, selectedIds: unknown) => api(req(who, { selectedIds }, "PATCH"));
    const publicHandle = (who: string) => `u_${who.replaceAll("-", "").slice(0,18)}`;
    const publicRead = (who: string) => api(req(undefined, undefined, "GET", `/api?handle=${publicHandle(who)}`));
    await t.test("thresholds, drafts and publication/revision identity", async () => {
      await f.problem(author, ["numeric"], false); assert.deepEqual(await progress(author), { author: 0, solver: 0 });
      for (let i = 1; i <= 50; i++) {
        await f.problem(author);
        if ([1,4,5,14,15,49,50].includes(i)) assert.equal((await progress(author)).author, i);
        for (const badge of achievementDefinitions.filter(b => b.category === "author" && (b.threshold === i || b.threshold === i + 1)))
          assert.equal((await patch(author, [badge.id])).status, i >= badge.threshold ? 200 : 409);
      }
      await parsed(await patch(author, ["master-problem-setter", "first-spark"]));
      assert.deepEqual((await parsed(await publicRead(author))).selectedIds, ["master-problem-setter", "first-spark"]);
    });
    await t.test("multipart completion, ungraded/manual/incorrect, idempotency and concurrent attempts", async () => {
      const p = await f.problem(author, ["numeric", "expression"]), key = randomUUID();
      await parsed(await f.submit(p, solver, 0, { kind: "numeric", value: 3, units: "1" }), 201);
      assert.equal((await progress(solver)).solver, 0);
      const responses = await Promise.all([f.submit(p, solver, 0, undefined, key), f.submit(p, solver, 0, undefined, key)]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200,201]); assert.equal((await progress(solver)).solver, 0);
      await parsed(await f.submit(p, solver, 1, { kind: "expression", expression: "x+1" }), 201);
      assert.equal((await progress(solver)).solver, 1);
      await parsed(await f.submit(p, solver), 201); assert.equal((await progress(solver)).solver, 1);
      await parsed(await f.submit(p, author), 201);
      await parsed(await f.submit(p, author, 1, { kind: "expression", expression: "x+1" }), 201);
      assert.equal((await progress(author)).solver, 0);
      const manual = await f.problem(author, ["numeric", "manual"]);
      await parsed(await f.submit(manual, solver), 201);
      const result = await parsed(await f.submit(manual, solver, 1, { kind: "manual", text: "My answer" }), 201);
      assert.notEqual(result.attempt.status, "correct"); assert.equal((await progress(solver)).solver, 1);
      const unsupported = await f.problem(author);
      const review = await parsed(await f.submit(unsupported, solver, 0, { kind: "numeric", value: 2, units: "nonsense" }), 201);
      assert.equal(review.attempt.status, "needs-review"); assert.equal((await progress(solver)).solver, 1);
      // A revision replacement revokes completion; part answers from the old snapshot cannot mix.
      await parsed(await f.author("publish", req(author, { version: p.version }), p.id)); p.version++;
      p.revision = (await pool.query("SELECT published_revision_id AS id FROM authored_problem WHERE id=$1", [p.id])).rows[0];
      assert.equal((await progress(solver)).solver, 0);
      await parsed(await f.submit(p, solver, 1, { kind: "expression", expression: "x+1" }), 201);
      assert.equal((await progress(solver)).solver, 0);
      await parsed(await f.submit(p, solver), 201); assert.equal((await progress(solver)).solver, 1);
      await parsed(await patch(solver, ["first-breakthrough"]));
      await parsed(await f.author("unpublish", req(author, { version: p.version }), p.id)); p.version++;
      assert.equal((await progress(solver)).solver, 0); assert.deepEqual((await parsed(await publicRead(solver))).selectedIds, []);
      assert.equal((await parsed(await api(req(solver)))).hiddenSelectionCount, 1);
      // Restoring that exact trusted revision restores dormant selection; a new publication needs new solves.
      await pool.query("UPDATE authored_problem SET state='published',published_revision_id=$2 WHERE id=$1", [p.id, p.revision.id]);
      assert.deepEqual((await parsed(await publicRead(solver))).selectedIds, ["first-breakthrough"]);
    });
    await t.test("repeated publication counts one identity, and unpublication removes it", async () => {
      const publisher = await f.user(), p = await f.problem(publisher);
      await parsed(await f.author("publish", req(publisher, { version: p.version }), p.id)); p.version++;
      assert.equal((await progress(publisher)).author, 1);
      await parsed(await f.author("unpublish", req(publisher, { version: p.version }), p.id)); p.version++;
      assert.equal((await progress(publisher)).author, 0);
      await parsed(await f.author("publish", req(publisher, { version: p.version }), p.id));
      assert.equal((await progress(publisher)).author, 1);
    });
    await t.test("explicit reveals make later correct attempts assisted and exclude them", async () => {
      const p = await f.problem(author), part = p.parts[0].id;
      await parsed(await f.solutions("permission-write", req(author, { revisionId: p.revision.id, version: 0, enabled: true, mediaIds: [] }, "PUT"), p.id, part));
      await parsed(await f.solutions("view", req(empty, { revisionId: p.revision.id }), p.id, part));
      const result = await parsed(await f.submit(p, empty), 201); assert.equal(result.attempt.assisted, true);
      assert.equal((await progress(empty)).solver, 0);
    });
    await t.test("solver thresholds 10 and 50 are distinct problems, not attempt counts", async () => {
      const solveOwner = await f.user();
      for (let i = 2; i <= 50; i++) {
        await pool.query("DELETE FROM authored_student_rate WHERE user_id=$1", [solver]);
        const p = await f.problem(solveOwner); await parsed(await f.submit(p, solver), 201);
        if ([9,10,49,50].includes(i)) assert.equal((await progress(solver)).solver, i);
      }
      await parsed(await patch(solver, ["olympiad-pathfinder", "persistent-solver"]));
    });
    await t.test("server ownership, origin, strict forgery rejection, SQL eligibility and array constraints", async () => {
      assert.equal((await api(req())).status, 401); assert.equal((await patch(unverified, [])).status, 403);
      const badOrigin = req(author, { selectedIds: [] }, "PATCH"); badOrigin.headers.set("origin", "https://evil.invalid");
      assert.equal((await api(badOrigin)).status, 403);
      for (const selectedIds of [["fake"], ["first-spark", "first-spark"], ["first-spark", "problem-weaver", "equation-architect"]]) assert.equal((await patch(empty, selectedIds)).status, 400);
      assert.equal((await api(req(empty, { selectedIds: [], userId: author }, "PATCH"))).status, 400);
      assert.equal((await api(req(empty, { selectedIds: [], count: 50 }, "PATCH"))).status, 400);
      assert.equal((await patch(empty, ["first-spark"])).status, 409);
      assert.equal((await patch(noProfile, [])).status, 409);
      assert.equal((await parsed(await api(req(noProfile)))).profileExists, false);
      for (const ids of [["fake"], ["first-spark"], [null], ["first-spark", "first-spark"], ["first-spark", "problem-weaver", "equation-architect"]])
        await assert.rejects(runtime!.query("INSERT INTO community_badge_selection(user_id,badge_ids) VALUES($1,$2)", [empty, ids]));
      assert.equal((await api(new Request("https://physcratic.test/api", { method: "PATCH", headers: { "x-test-user": author, origin: "https://physcratic.test", "content-type": "application/json" }, body: " ".repeat(2050) }))).status, 413);
    });
    await t.test("atomic ordered whole-selection races, privacy and shared rate limit", async () => {
      await pool.query("TRUNCATE community_achievement_write_limit");
      const selections = [["first-spark", "problem-weaver"], ["equation-architect", "master-problem-setter"]];
      await Promise.all(selections.map(async ids => parsed(await patchResponse(ids))));
      async function patchResponse(ids: string[]) { return patch(author, ids); }
      const own = await parsed(await api(req(author))); assert.ok(selections.some(ids => JSON.stringify(ids) === JSON.stringify(own.selectedIds)));
      const publicBody = await parsed(await publicRead(author)); assert.deepEqual(Object.keys(publicBody), ["selectedIds"]);
      await pool.query("UPDATE community_profile SET public_visibility=false WHERE user_id=$1", [author]);
      assert.equal((await publicRead(author)).status, 404); assert.equal((await api(req(undefined, undefined, "GET", "/api?handle=missing"))).status, 404);
      await pool.query("UPDATE community_profile SET public_visibility=true WHERE user_id=$1", [author]);
      await pool.query("TRUNCATE community_achievement_write_limit");
      const second = createCommunityAchievementsApi({ ...f.deps, pool: runtime! });
      const statuses = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? api : second)(req(author, { selectedIds: [] }, "PATCH")).then(r => r.status)));
      assert.equal(statuses.filter(s => s === 200).length, 10); assert.equal(statuses.filter(s => s === 429).length, 2);
      await assert.rejects(pool.query(`BEGIN; ${down} COMMIT;`), /Refusing to remove saved/); await pool.query("ROLLBACK");
    });
    await t.test("bounded sparse history reports unknown solver progress while author badges still work", async () => {
      const bounded = await f.user(), owner = await f.user(); await f.problem(bounded);
      const template = await f.problem(owner, ["numeric", "manual"]);
      // Bulk synthetic fixtures respect the existing publication seals and immutable attempt guards.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("CREATE TEMP TABLE achievement_candidates ON COMMIT DROP AS SELECT gen_random_uuid() AS problem,gen_random_uuid() AS revision FROM generate_series(1,2001)");
        await client.query("INSERT INTO authored_problem(id,slug,owner_id) SELECT problem,'bounded-'||problem::text,$1 FROM achievement_candidates", [owner]);
        await client.query("INSERT INTO authored_revision_part SELECT c.revision,p.part_id,p.answer_mode FROM achievement_candidates c CROSS JOIN authored_revision_part p WHERE p.revision_id=$1", [template.revision.id]);
        await client.query("INSERT INTO authored_revision_private_part(revision_id,part_id,answer_mode,data) SELECT c.revision,p.part_id,p.answer_mode,p.data FROM achievement_candidates c CROSS JOIN authored_revision_private_part p WHERE p.revision_id=$1", [template.revision.id]);
        await client.query("INSERT INTO authored_revision(id,problem_id,number,content) SELECT c.revision,c.problem,1,r.content FROM achievement_candidates c CROSS JOIN authored_revision r WHERE r.id=$1", [template.revision.id]);
        await client.query("UPDATE authored_problem p SET state='published',published_revision_id=c.revision FROM achievement_candidates c WHERE c.problem=p.id");
        await client.query(`INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number)
          SELECT gen_random_uuid(),$1,c.problem,c.revision,$2,gen_random_uuid(),'{"kind":"numeric","value":2,"units":"1"}'::jsonb,'correct','within-tolerance','numeric-v1',1 FROM achievement_candidates c`, [bounded, template.parts[0].id]);
        await client.query("COMMIT");
      } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
      assert.deepEqual(await progress(bounded), { author: 1, solver: null });
      assert.equal((await patch(bounded, ["first-breakthrough"])).status, 409);
      await parsed(await patch(bounded, ["first-spark"]));
      assert.deepEqual((await parsed(await publicRead(bounded))).selectedIds, ["first-spark"]);
    });
  } finally {
    await runtime?.end(); await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`); await admin.end();
  }
});
