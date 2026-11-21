import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { createAuthOptions } from "./auth-config";
import { authEmailOutbox } from "./auth-email-transport";
import { createCommunityProfileApi } from "./community/profile-api";
import { TERMS_VERSION } from "./terms";

const connection = process.env.AUTHORING_TEST_DATABASE_URL;
const origin = "http://localhost:3000";
const password = "synthetic-signup-password-123";
const usernameDisclosure = "b1-v1";
const newSignup = (username: string) => ({ username, profileDisclosureVersion: usernameDisclosure });

test("atomic profile signup under the restricted PostgreSQL LOGIN", { skip: !connection }, async (t) => {
  assert.ok(connection);
  const local = new URL(connection);
  assert.equal(local.protocol, "postgresql:");
  assert.equal(local.hostname, "127.0.0.1");
  assert.equal(local.pathname, "/physcratic_authoring_test");
  assert.equal(local.search + local.hash, "");
  assert.notEqual(process.env.VERCEL_ENV, "production");
  assert.notEqual(process.env.NODE_ENV, "production");
  const originalTransport = process.env.AUTH_EMAIL_TRANSPORT;
  process.env.AUTH_EMAIL_TRANSPORT = "memory";
  t.after(() => {
    if (originalTransport === undefined) delete process.env.AUTH_EMAIL_TRANSPORT;
    else process.env.AUTH_EMAIL_TRANSPORT = originalTransport;
  });

  const name = "profile_signup_" + randomUUID().replaceAll("-", "");
  const owner = name + "_owner";
  const runtime = name + "_app";
  const admin = new Pool({ connectionString: local.href, max: 1 });
  let setup: Pool | undefined;
  let app: Pool | undefined;
  t.after(async () => {
    try {
      await app?.end();
      await setup?.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name}`);
      await admin.query(`DROP ROLE IF EXISTS ${runtime}, ${owner}`);
    } finally { await admin.end(); }
  });
  assert.ok(["180006", "180007"].includes((await admin.query("SHOW server_version_num")).rows[0].server_version_num));
  await admin.query(`CREATE ROLE ${owner} NOLOGIN;
    CREATE ROLE ${runtime} LOGIN PASSWORD 'synthetic-profile-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
  await admin.query(`CREATE DATABASE ${name} OWNER ${owner}`);
  local.pathname = "/" + name;
  const schema = setup = new Pool({ connectionString: local.href, options: `-c role=${owner}`, max: 1 });
  const { fixtureDDL } = await import("../scripts/authoring-release-production/package/test-fixture.mjs");
  for (const ddl of fixtureDDL()) await schema.query(ddl);
  await schema.query(await readFile("migrations/20261031_auth_rate_limit.sql", "utf8"));
  await schema.query(await readFile("migrations/0007_community_profile.up.sql", "utf8"));
  const runtimeGrants = await readFile("scripts/runtime-role/provision.review.sql", "utf8");
  await schema.query(runtimeGrants.slice(runtimeGrants.indexOf("-- Existing Better Auth adapter"),
    runtimeGrants.indexOf("-- Current authoring")).replaceAll(':"runtime_role"', runtime));
  local.username = runtime;
  local.password = "synthetic-profile-only";
  const pool = app = new Pool({ connectionString: local.href, max: 4 });
  assert.deepEqual((await pool.query("SELECT current_user, session_user")).rows[0],
    { current_user: runtime, session_user: runtime });
  assert.deepEqual((await pool.query(`SELECT has_table_privilege('public."user"', 'DELETE') AS user_delete,
    has_table_privilege('public.community_profile', 'DELETE') AS profile_delete`)).rows[0],
    { user_delete: false, profile_delete: false });

  const profiles = createCommunityProfileApi({ pool, user: async () => null, origin: () => false });
  const publicProfile = (handle: string) => profiles("public", new Request(origin + "/api/community/profile/" + handle), handle);

  const pendingEmail: Promise<void>[] = [];
  const build = (profileSignupEnabled = false) => betterAuth(createAuthOptions({
    pool, profileSignupEnabled, defer: (task) => { pendingEmail.push(task()); },
    overrides: { baseURL: origin, secret: "synthetic-profile-signup-secret-at-least-32-characters", logger: { disabled: true } },
  }));
  const legacy = build();
  const corrected = build(true);
  const emailOf = (label: string) => `${label}@example.invalid`;
  const signup = (auth: typeof legacy, label: string, fields: Record<string, unknown> = {}) => {
    const body = { email: emailOf(label), password, name: "Private signup name", termsAccepted: true, termsVersion: TERMS_VERSION, ...fields };
    return auth.api.signUpEmail({ body, asResponse: true });
  };
  const find = async (label: string) => (await schema.query(`SELECT u.id, u."emailVerified" AS verified, a.id AS credential,
    cp.handle, cp.display_name, cp.public_visibility
    FROM "user" u LEFT JOIN community_profile cp ON cp.user_id=u.id
    LEFT JOIN account a ON a."userId"=u.id AND a."providerId"='credential' WHERE u.email=$1`, [emailOf(label)])).rows[0];
  const privateFieldsAbsent = async (response: Response) => {
    const body = await response.text();
    assert.doesNotMatch(body, /profileSignup(?:Handle|PolicyVersion)|profileDisclosureVersion|b1-v1/);
    return body;
  };

  await t.test("ordinary signup works before the migration", async () => {
    assert.equal((await signup(legacy, "before-migration", newSignup("ignored_handle"))).status, 200);
    assert.equal((await find("before-migration")).handle, null);
    await schema.query("INSERT INTO community_profile(user_id,handle,display_name,public_visibility) VALUES ($1,'legacy_handle','Saved display',true)",
      [(await find("before-migration")).id]);
  });
  await t.test("corrected signup requires current disclosure and a valid username", async () => {
    for (const [label, fields] of Object.entries({
      "missing-metadata": {}, "username-only": { username: "unsigned" },
      "stale-disclosure": { username: "stale_user", profileDisclosureVersion: "b1-v0" },
      "reserved-name": newSignup(" Admin "),
    })) {
      await assert.rejects(signup(corrected, label, fields), { statusCode: 400 }, label);
      assert.equal(await find(label), undefined);
    }
  });

  const up = await readFile("migrations/0022_b1_profile_signup.up.sql", "utf8");
  const down = await readFile("migrations/0022_b1_profile_signup.down.sql", "utf8");
  await schema.query(`BEGIN; ${up} COMMIT;`);
  await schema.query(`BEGIN; ${down} COMMIT;`);
  await schema.query(`BEGIN; ${up} COMMIT;`);
  const publication = async (handle: string) => (await schema.query(`SELECT publication_basis, publication_policy_version,
    publication_recorded_at IS NOT NULL AS recorded, deactivated_at FROM community_profile WHERE handle=$1`, [handle])).rows[0];

  await t.test("migration preserves existing profiles and OFF signups bypass the claim", async () => {
    assert.equal((await find("before-migration")).display_name, "Saved display");
    assert.equal((await find("before-migration")).public_visibility, true);
    assert.deepEqual(await publication("legacy_handle"), {
      publication_basis: null, publication_policy_version: null, recorded: false, deactivated_at: null,
    });
    assert.equal((await pool.query("SELECT has_table_privilege('community_profile', 'INSERT') AS allowed")).rows[0].allowed, false);
    assert.equal((await signup(legacy, "after-migration")).status, 200);
    const ordinary = await find("after-migration");
    assert.ok(ordinary.credential);
    assert.equal(ordinary.handle, null);
    assert.equal((await signup(corrected, "without-grant", newSignup("without_grant"))).status, 422);
    assert.equal(await find("without-grant"), undefined);
  });
  await schema.query((await readFile("scripts/activation/profiles-grants.review.sql", "utf8"))
    .replaceAll(':"runtime_role"', runtime));
  await t.test("server-only disclosure fields cannot be supplied by the signup client", async () => {
    for (const [label, fields] of Object.entries({
      "forged-handle": { profileSignupHandle: "forged" }, "forged-version": { profileSignupPolicyVersion: "b1-v9" },
    })) {
      const response = await signup(corrected, label, { ...newSignup("legitimate"), ...fields });
      assert.equal(response.status, 400);
      assert.equal(await find(label), undefined);
    }
    await assert.rejects(pool.query(`INSERT INTO "user"(id, name, email, "createdAt", "updatedAt", "profileSignupHandle")
      VALUES ('incomplete-claim','Private','incomplete@example.invalid',now(),now(),'incomplete')`), { code: "23514" });
  });
  await t.test("signup reserves a normalized username and keeps the unverified profile private", async () => {
    const response = await signup(corrected, "registered", newSignup("  Foucault_1 "));
    assert.equal(response.status, 200);
    assert.doesNotMatch(await privateFieldsAbsent(response), /foucault_1/i);
    const registered = await find("registered");
    assert.ok(registered.credential);
    assert.equal(registered.handle, "foucault_1");
    assert.equal(registered.verified, false);
    assert.equal((await publicProfile(registered.handle)).status, 404);
    assert.equal(registered.display_name, "");
    assert.equal(registered.public_visibility, false);
    assert.deepEqual(await publication(registered.handle), {
      publication_basis: "signup", publication_policy_version: "b1-v1", recorded: true, deactivated_at: null,
    });
    assert.equal((await pool.query(`SELECT has_function_privilege(
      'public.community_profile_claim_signup()', 'EXECUTE') AS allowed`)).rows[0].allowed, false);
  });
  await t.test("case-insensitive collisions preserve legacy claims and concurrent signups have one winner", async () => {
    assert.equal((await signup(corrected, "legacy-collision", newSignup("LEGACY_HANDLE"))).status, 422);
    assert.equal(await find("legacy-collision"), undefined);
    const responses = await Promise.all([
      signup(corrected, "race-a", newSignup("Race_User")),
      signup(corrected, "race-b", newSignup("race_user")),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 422]);
    const accounts = (await Promise.all([find("race-a"), find("race-b")])).filter(Boolean);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].handle, "race_user");
    assert.ok(accounts[0].credential);
  });
  await t.test("credential-link rollback releases the username to a retry", async () => {
    await schema.query(`CREATE FUNCTION reject_credential() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic credential failure'; END $$;
      CREATE TRIGGER reject_credential BEFORE INSERT ON account FOR EACH ROW EXECUTE FUNCTION reject_credential()`);
    try {
      await assert.rejects(signup(corrected, "retry-link", newSignup("retry_handle")), /synthetic credential failure/);
      assert.equal(await find("retry-link"), undefined);
      assert.equal(await publication("retry_handle"), undefined);
    } finally { await schema.query("DROP TRIGGER reject_credential ON account; DROP FUNCTION reject_credential()"); }
    assert.equal((await signup(corrected, "retry-link", newSignup("retry_handle"))).status, 200);
    const before = await find("retry-link");
    const duplicate = await signup(corrected, "retry-link", newSignup("different_handle"));
    assert.equal(duplicate.status, 200);
    assert.doesNotMatch(await privateFieldsAbsent(duplicate), /retry_handle|different_handle/);
    assert.deepEqual(await find("retry-link"), before);
    assert.equal(await publication("different_handle"), undefined);
  });
  const verificationLink = async (label: string) => {
    await Promise.all(pendingEmail);
    const mail = authEmailOutbox().find((message) => message.to === emailOf(label));
    const url = mail?.text.match(/http:\/\/localhost:3000\/api\/auth\/verify-email\?\S+/)?.[0];
    assert.ok(url);
    return url;
  };
  await t.test("verification and session responses keep the private signup metadata out", async () => {
    const url = await verificationLink("registered");
    for (let attempt = 0; attempt < 2; attempt++) {
      const verified = await corrected.handler(new Request(url, { redirect: "manual" }));
      assert.equal(verified.status, 302);
      await privateFieldsAbsent(verified);
    }
    assert.equal((await find("registered")).verified, true);
    assert.deepEqual((await (await publicProfile("foucault_1")).json()).profile, {
      handle: "foucault_1", displayName: "foucault_1", bio: "",
      educationLevel: "prefer-not-to-say", favoriteTopicIds: [],
    });
    await schema.query(`UPDATE "user" SET "profileSignupPolicyVersion"='b1-v0' WHERE email=$1`, [emailOf("registered")]);
    assert.equal((await publicProfile("foucault_1")).status, 404);
    await schema.query(`UPDATE "user" SET "profileSignupPolicyVersion"='b1-v1' WHERE email=$1`, [emailOf("registered")]);
    const signedIn = await corrected.handler(new Request(origin + "/api/auth/sign-in/email", {
      method: "POST", headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email: emailOf("registered"), password }),
    }));
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    assert.ok(cookie);
    assert.doesNotMatch(await privateFieldsAbsent(signedIn), /foucault_1/);
    for (const auth of [corrected, legacy]) {
      const session = await auth.handler(new Request(origin + "/api/auth/get-session", { headers: { origin, cookie } }));
      assert.equal(session.status, 200);
      const body = await privateFieldsAbsent(session);
      assert.doesNotMatch(body, /foucault_1/);
      assert.equal(JSON.parse(body).user.email, emailOf("registered"));
    }
    const update = await corrected.handler(new Request(origin + "/api/auth/update-user", {
      method: "POST", headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({ profileSignupPolicyVersion: "b1-v9" }),
    }));
    assert.equal(update.status, 400);
    assert.equal((await publication("foucault_1")).publication_policy_version, "b1-v1");
  });
  await t.test("once deactivated, publication evidence and deactivation cannot be overwritten", async () => {
    await pool.query("UPDATE community_profile SET deactivated_at=now() WHERE handle='foucault_1'");
    await assert.rejects(pool.query("UPDATE community_profile SET deactivated_at=NULL WHERE handle='foucault_1'"), { code: "23514" });
    await assert.rejects(pool.query(`UPDATE community_profile SET publication_basis='legacy_acknowledgement'
      WHERE handle='foucault_1'`), { code: "23514" });
    await pool.query("UPDATE community_profile SET bio='A private edit' WHERE handle='foucault_1'");
    assert.ok((await publication("foucault_1")).deactivated_at);
    await schema.query(`UPDATE "user" SET "emailVerified"=false WHERE email=$1`, [emailOf("registered")]);
    const verifiedAgain = await corrected.handler(new Request(await verificationLink("registered"), { redirect: "manual" }));
    assert.equal(verifiedAgain.status, 302);
    assert.equal((await find("registered")).verified, true);
    assert.equal((await publicProfile("foucault_1")).status, 404);
  });
  await t.test("an existing profile can record only its first legacy acknowledgement", async () => {
    await assert.rejects(pool.query(`UPDATE community_profile SET publication_basis='signup',
      publication_policy_version='b1-v1', publication_recorded_at=now() WHERE handle='legacy_handle'`), { code: "23514" });
    await pool.query(`UPDATE community_profile SET publication_basis='legacy_acknowledgement',
      publication_policy_version='b1-v1', publication_recorded_at=now() WHERE handle='legacy_handle'`);
    await assert.rejects(pool.query(`UPDATE community_profile SET publication_policy_version='b1-v2'
      WHERE handle='legacy_handle'`), { code: "23514" });
    assert.deepEqual(await publication("legacy_handle"), {
      publication_basis: "legacy_acknowledgement", publication_policy_version: "b1-v1", recorded: true, deactivated_at: null,
    });
  });
  await t.test("schema rollback refuses to discard recorded claims", async () => {
    try {
      await assert.rejects(schema.query(`BEGIN; ${down} COMMIT;`), /Preserve B1 publication records/);
    } finally { await schema.query("ROLLBACK"); }
    assert.equal((await find("registered")).handle, "foucault_1");
  });
});
