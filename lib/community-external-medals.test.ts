import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { achievementFixtures, achievementParsed, achievementRequest, installAchievementFixtures } from "../tests/community-achievement-fixtures";
import { createCommunityAchievementsApi } from "./community/achievements-api";
import { externalMedalShowcaseEnabled } from "./community/achievements-route";
import { medalVerificationForm } from "./community/external-medals";
import { verificationUiEnabled } from "./community/medal-route";
import { createUnifiedArenaApi } from "./unified-arena-api";

test("external medals are default off and independent of legacy verification", () => {
  const env = {
    COMMUNITY_PROFILES_ENABLED: "true", COMMUNITY_EXTERNAL_MEDALS_ENABLED: "true",
    COMMUNITY_VERIFICATION_UI_ENABLED: "true", COMMUNITY_MEDALS_ENABLED: "true", COMMUNITY_STAFF_ENABLED: "true",
  };
  assert.equal(externalMedalShowcaseEnabled({ COMMUNITY_PROFILES_ENABLED: "true" }), false);
  assert.equal(externalMedalShowcaseEnabled(env), true);
  assert.equal(verificationUiEnabled(env), false);
  assert.equal(medalVerificationForm(env), undefined);
  const form = (url: string) => medalVerificationForm({ ...env, COMMUNITY_MEDAL_TALLY_URL: url });
  assert.equal(form("https://tally.so/r/Synthetic42"), "https://tally.so/r/Synthetic42");
  for (const url of ["http://tally.so/r/A", "https://tally.so.evil.test/r/A", "https://tally.so@evil.test/r/A",
    "https://tally.so/r/A?email=test", "https://tally.so/r/A#fragment", "https://tally.so/r/A\n"]) {
    assert.equal(form(url), undefined, url);
  }
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("0024 operator and restricted login enforce award, audit, badge and public visibility boundaries", { skip: !url }, async () => {
  const target = new URL(url!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  const schema = "external_" + randomUUID().replaceAll("-", "");
  const role = schema + "_runtime";
  const password = randomUUID();
  const admin = new Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
  const owner = new Pool({ connectionString: url, options: `-c search_path=${schema},public` });
  const runtimeUrl = new URL(target);
  runtimeUrl.username = role;
  runtimeUrl.password = password;
  const runtime = new Pool({ connectionString: runtimeUrl.toString(), options: `-c search_path=${schema},public` });
  const migration = async (name: string) => owner.query(
    "BEGIN;" + await readFile(`migrations/${name}.sql`, "utf8") + "COMMIT;",
  );
  try {
    await installAchievementFixtures(owner);
    await owner.query('ALTER TABLE "user" ADD COLUMN email text');
    const fixtures = achievementFixtures(owner);
    const student = await fixtures.user("medal-owner");
    const other = await fixtures.user("other");
    await owner.query('UPDATE "user" SET email=id||\'@example.invalid\'');
    const problem = await fixtures.problem(student);
    const legacy = createCommunityAchievementsApi(fixtures.deps);
    const selected = (ids: string[]) => achievementRequest(student, { selectedIds: ids }, "PATCH");
    await achievementParsed(await legacy(selected(["first-spark"])));
    await migration("0010_community_medals.up");
    await migration("0011_community_medal_showcase.up");
    await migration("0015_community_security_s1.up");
    await migration("0024_external_medal_verification.up");
    await migration("0024_external_medal_verification.down");
    assert.deepEqual((await achievementParsed(await legacy(achievementRequest(student)))).selectedIds, ["first-spark"]);
    await migration("0024_external_medal_verification.up");
    await owner.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};
      GRANT SELECT(id,"emailVerified","profileSignupHandle","profileSignupPolicyVersion") ON "user" TO ${role};
      GRANT SELECT ON community_profile,community_external_approved_medal,
        authored_problem,authored_revision,authored_revision_part,author_media,author_revision_media TO ${role};
      GRANT SELECT,INSERT,UPDATE ON community_badge_selection,community_achievement_write_limit TO ${role};
      GRANT EXECUTE ON FUNCTION community_showcase_ids_valid(text[]) TO ${role}`);
    assert.equal((await runtime.query("SELECT session_user")).rows[0].session_user, role);

    const resolve = (email: string, handle: string) => owner.query("SELECT * FROM community_external_medal_recipient($1,$2)", [email, handle]);
    assert.equal((await resolve(" MEDAL-OWNER@example.invalid ", "U_MEDALOWNER")).rows[0].account_id, student);
    assert.equal((await resolve("", "u_medalowner")).rows[0].account_id, student);
    assert.equal((await resolve("medal-owner@example.invalid", "")).rows[0].account_id, student);
    await assert.rejects(resolve("other@example.invalid", "u_medalowner"), /different accounts/);
    await assert.rejects(resolve("nobody@example.invalid", "u_medalowner"), /exactly one account/);

    async function award(user = student, reference = "Private_ref-42") {
      return (await owner.query("SELECT * FROM community_external_medal_award($1,'APhO','gold',2025,'ID','',$2)", [user, reference])).rows[0];
    }
    const results = await Promise.all([award(), award()]);
    const { medal_id: medal } = results[0];
    assert.equal(results[1].medal_id, medal);
    assert.deepEqual(results.map(row => row.result).sort(), ["already awarded", "awarded"]);
    await assert.rejects(award(other), /another award/);
    await assert.rejects(award(student, "Other_ref"), { code: "23505" });
    const foreign = await award(other, "Other_ref");
    const legacyClaimId = randomUUID();
    const insertLegacy = (competition: string) => owner.query(`INSERT INTO community_medal_claim(
      id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256)
      VALUES($1::uuid,$2,$3,'silver',2025,'ID','','Synthetic','community-medal-proof/'||$1::uuid::text||'.pdf',10,$4)`,
    [legacyClaimId, student, competition, "a".repeat(64)]);
    await assert.rejects(insertLegacy("APhO"), /active external medal/);
    await insertLegacy("EuPhO");
    await assert.rejects(owner.query("SELECT * FROM community_external_medal_award($1,'EuPhO','gold',2025,'ID','','Another_ref')", [student]), /active internal claim/);

    for (const sql of [
      "SELECT * FROM community_external_medal_recipient('medal-owner@example.invalid','')",
      "SELECT * FROM community_external_medal_award('medal-owner','EuPhO','gold',2025,'ID','','forbidden')",
      `SELECT community_external_medal_revoke('${medal}','medal-owner')`,
      "SELECT tally_reference FROM community_external_medal",
      "SELECT * FROM community_external_medal_audit",
      "DELETE FROM community_external_approved_medal",
      "SELECT community_achievement_progress('medal-owner')",
    ]) await assert.rejects(runtime.query(sql), { code: "42501" });

    const api = createCommunityAchievementsApi({ ...fixtures.deps, pool: runtime, earnedEnabled: () => false, externalMedalsEnabled: () => true });
    const read = () => api(achievementRequest(undefined, undefined, "GET", "/api?handle=u_medalowner"));
    const own = () => api(achievementRequest(student));
    const badge = "medal:" + medal;
    assert.deepEqual((await achievementParsed(await own())).selectedIds, []);
    await achievementParsed(await api(selected(["medal:" + foreign.medal_id])), 409);
    await achievementParsed(await api(selected(["medal:" + randomUUID()])), 409);
    await achievementParsed(await api(selected(["first-spark"])), 400);
    await achievementParsed(await api(selected([badge])));
    assert.deepEqual((await achievementParsed(await own())).selectedIds, [badge]);
    const publicResult = await achievementParsed(await read());
    assert.deepEqual(publicResult.selectedIds, [badge]);
    assert.deepEqual(publicResult.medals, [{ id: badge, competition: "APhO", award: "gold", year: 2025, country: "ID", competitionName: "" }]);
    assert.ok(!(JSON.stringify(await achievementParsed(await own()))).includes("Private_ref-42"));
    const arena = createUnifiedArenaApi(runtime, () => ({ authors: true, badges: false, medals: false, externalMedals: true }));
    const arenaRead = async () => {
      const payload = await achievementParsed(await arena(achievementRequest(undefined, undefined, "GET", "/api?source=authored")));
      return payload.problems.find((entry: { id: string }) => entry.id === problem.id);
    };
    assert.deepEqual((await arenaRead()).author.selectedIds, [badge]);
    const completions = (await readFile("migrations/0025_personal_completions.up.sql", "utf8")).replaceAll("public.", schema + ".");
    await owner.query(`BEGIN; ${completions} COMMIT;`);
    await owner.query(`GRANT SELECT ON personal_problem_completion TO ${role}`);
    await owner.query("INSERT INTO personal_problem_completion(user_id,problem_key) VALUES($1,$2)", [other, `authored:${problem.id}`]);
    const personalized = createUnifiedArenaApi(runtime, () => ({ authors:true, badges:false, medals:false, externalMedals:true }), {
      enabled:()=>true, secret:()=>"synthetic-integration-cursor-secret", user:async()=>({id:other}),
    });
    const personalRequest = new Request("https://physcratic.test/api?source=authored", {headers:{"X-Community-Account":other}});
    const personal = await achievementParsed(await personalized(personalRequest));
    assert.equal(personal.personalization,"active");
    assert.equal(personal.problems[0].completed,true);
    assert.deepEqual(personal.problems[0].author.selectedIds,[badge]);
    assert.doesNotMatch(JSON.stringify(personal),/Private_ref-42|medal-owner@example/);
    await owner.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1', [student]);
    await achievementParsed(await read(), 404);
    assert.equal((await arenaRead()).author, null);
    await owner.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', [student]);

    // A previously approved internal badge remains valid alongside an external badge.
    await owner.query("INSERT INTO community_staff(user_id,role,reason) VALUES($1,'admin','Synthetic review')", [other]);
    await owner.query("UPDATE community_medal_claim SET state='pending',version=2 WHERE id=$1", [legacyClaimId]);
    await owner.query("UPDATE community_medal_claim SET state='approved',version=3,reviewer_id=$2,reason='Synthetic review' WHERE id=$1", [legacyClaimId, other]);
    const both = createCommunityAchievementsApi({ ...fixtures.deps, medalsEnabled: () => true, externalMedalsEnabled: () => true });
    const mixed = ["medal:" + legacyClaimId, badge];
    await achievementParsed(await both(selected(mixed)));
    assert.deepEqual((await achievementParsed(await both(achievementRequest(undefined, undefined, "GET", "/api?handle=u_medalowner")))).selectedIds, mixed);
    await achievementParsed(await api(selected([badge])));

    const client = await runtime.connect();
    try {
      await client.query("BEGIN; CREATE TEMP TABLE community_external_medal(id uuid,user_id text,revoked_at timestamptz)");
      await client.query("INSERT INTO pg_temp.community_external_medal VALUES($1,$2,NULL)", [foreign.medal_id, student]);
      await assert.rejects(client.query(`UPDATE ${schema}.community_badge_selection SET badge_ids=$2 WHERE user_id=$1`,
        [student, ["medal:" + foreign.medal_id]]), /not currently eligible/);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    const revoke = (user = student) => owner.query("SELECT community_external_medal_revoke($1,$2) AS result", [medal, user]);
    await assert.rejects(revoke(other), /confirmed account/);
    assert.equal((await revoke()).rows[0].result, "revoked");
    assert.equal((await revoke()).rows[0].result, "already revoked");
    assert.equal((await award()).result, "already revoked");
    await achievementParsed(await api(selected([badge])), 409);
    assert.deepEqual((await achievementParsed(await read())).selectedIds, []);
    assert.deepEqual((await arenaRead()).author.selectedIds, []);
    assert.equal((await achievementParsed(await own())).hiddenSelectionCount, 1);
    const audit = (await owner.query("SELECT action,operator,recorded_at FROM community_external_medal_audit WHERE medal_id=$1 ORDER BY action", [medal])).rows;
    assert.deepEqual(audit.map(row => row.action), ["award", "revoke"]);
    assert.ok(audit.every(row => row.operator === target.username && row.recorded_at instanceof Date));
    const replacement = await award(student, "Replacement_ref");
    await achievementParsed(await api(selected(["medal:" + replacement.medal_id])));
    await owner.query("UPDATE community_profile SET deactivated_at=clock_timestamp() WHERE user_id=$1", [student]);
    await achievementParsed(await read(), 404);
    assert.equal((await arenaRead()).author, null);
    await assert.rejects(migration("0024_external_medal_verification.down"), /external medal/i);
    await owner.query("ROLLBACK");
  } finally {
    await runtime.end();
    await owner.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`);
    await admin.end();
  }
});
