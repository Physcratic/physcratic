import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { installProfilePublicationFixture } from "../tests/profile-publication-fixtures";
import { createAuthorCreditApi } from "./author-credit-api";
import { AUTHOR_CREDIT_POLICY_VERSION, authorCreditStatusSchema } from "./author-credit-contracts";
import { authorCreditEnabled, createAuthorCreditRoute } from "./author-credit-route";
import { createCommunityProfileApi } from "./community/profile-api";

const origin = "https://physcratic.test";
const endpoint = `${origin}/api/authored-problems/author-credit`;
const noCredit = { handle: null, credit: "inactive", revision: null };
const claim = (handle: string) => ({ action: "claim", handle });
const acknowledge = (handle: string, revision: string | null) =>
  ({ action: "acknowledge", policyVersion: AUTHOR_CREDIT_POLICY_VERSION, handle, revision });
const withdraw = (revision: string | null) => ({ action: "withdraw", revision });

function request(account: string, body?: unknown, allowedOrigin = origin) {
  return new Request(endpoint, {
    headers: { "x-community-account": account, origin: allowedOrigin, "content-type": "application/json" },
    ...(body === undefined ? {} : { method: "PATCH", body: JSON.stringify(body) }),
  });
}

async function status(response: Response) {
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  return authorCreditStatusSchema.parse(await response.json());
}

test("default-OFF owner routes skip database and authentication imports", async () => {
  assert.equal(authorCreditEnabled({}), false);
  assert.equal(authorCreditEnabled({ COMMUNITY_PROFILES_ENABLED: "true" }), false);
  assert.equal(authorCreditEnabled({ COMMUNITY_AUTHOR_CREDIT_ENABLED: "TRUE" }), false);
  assert.equal(authorCreditEnabled({ COMMUNITY_AUTHOR_CREDIT_ENABLED: "true" }), true);
  let imports = 0;
  const off = createAuthorCreditRoute(() => false, async () => { imports++; throw Error("Forbidden import"); });
  for (const req of [request("owner"), request("owner", claim("pseudonym"))])
    assert.equal((await off(req)).status, 503);
  assert.equal(imports, 0);
});

test("session, expected-account, origin and input checks precede storage and quota", async () => {
  let calls = 0;
  const pool = { query() { calls++; }, connect() { calls++; } } as unknown as Pool;
  const api = (user: { id: string; emailVerified: boolean } | null) =>
    createAuthorCreditApi({ pool, user: async () => user, origin: req => req.headers.get("origin") === origin });
  const owner = api({ id: "owner", emailVerified: true });
  assert.equal((await api(null)(request("owner", claim("pseudonym")))).status, 401);
  for (const body of [undefined, claim("pseudonym")]) {
    assert.equal((await api({ id: "owner", emailVerified: false })(request("owner", body))).status, 403);
    assert.equal((await owner(request("other", body))).status, 409);
  }
  assert.equal((await owner(request("owner", claim("pseudonym"), "https://other.invalid"))).status, 403);
  for (const body of [
    claim("private@email.invalid"),
    { ...claim("pseudonym"), userId: "other" },
    { ...claim("pseudonym"), acknowledge: true },
    { ...acknowledge("pseudonym", null), policyVersion: "old-version" },
    { ...withdraw(null), revision: undefined },
  ]) assert.equal((await owner(request("owner", body))).status, 400);
  assert.equal((await owner(request("owner", { ...claim("pseudonym"), padding: "x".repeat(1024) }))).status, 413);
  assert.equal(calls, 0);
});

const connection = process.env.AUTHORING_TEST_DATABASE_URL;
test("author credit transitions under a disposable, restricted PostgreSQL LOGIN", { skip: !connection }, async t => {
  const target = new URL(connection!);
  assert.equal(target.protocol, "postgresql:");
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  assert.equal(target.search + target.hash, "");
  const schema = "author_credit_" + randomUUID().replaceAll("-", "");
  const role = schema + "_app";
  const password = randomUUID();
  const admin = new Pool({ connectionString: target.href });
  const options = `-c search_path=${schema},pg_catalog`;
  const setup = new Pool({ connectionString: target.href, options });
  const login = new URL(target);
  login.username = role;
  login.password = password;
  const app = new Pool({ connectionString: login.href, options, max: 4 });
  t.after(async () => {
    await app.end();
    await setup.end();
    try { await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE; DROP ROLE IF EXISTS ${role}`); }
    finally { await admin.end(); }
  });

  await admin.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} LOGIN NOINHERIT PASSWORD '${password}'`);
  await setup.query(`CREATE TABLE "user"(id text PRIMARY KEY, name text, email text);
    INSERT INTO "user" VALUES
      ('legacy','Private signup name','private@example.invalid'),('public-author','Private name','owner@example.invalid'),
      ('race','Race author','race@example.invalid'),('other','Other author','other@example.invalid'),
      ('contender','Another author','contender@example.invalid')`);
  await setup.query(await readFile("migrations/0007_community_profile.up.sql", "utf8"));
  await installProfilePublicationFixture(setup);
  await setup.query(`INSERT INTO community_profile
    (user_id,handle,display_name,bio,publication_basis,publication_policy_version,publication_recorded_at)
    VALUES ('public-author','published_alias','Private sentinel','Profile bio','legacy_acknowledgement','b1-v1',now())`);
  const grants = (await readFile("scripts/activation/profiles-grants.review.sql", "utf8"))
    .replace("SCHEMA public", `SCHEMA ${schema}`).replaceAll("public.", schema + ".").replaceAll(':"runtime_role"', role);
  await setup.query(grants);
  await setup.query(`GRANT SELECT ON "user" TO ${role}`);
  const migration = async (direction: "up" | "down") => (await readFile(`migrations/0023_author_credit.${direction}.sql`, "utf8"))
    .replaceAll("public.", schema + ".");
  const user = (id: string) => ({ id, emailVerified: true });
  const actorApi = (id: string) => createAuthorCreditApi({ pool: app, user: async () => user(id), origin: () => true });
  const own = (id: string, body?: unknown) => actorApi(id)(request(id, body));
  const profiles = createCommunityProfileApi({ pool: app, user: async () => user("public-author"), origin: () => true });
  const publicRead = (handle: string) => profiles("public", request("guest"), handle);

  await t.test("old schema works with the gate OFF and unused migration can be rolled back", async () => {
    const off = createAuthorCreditRoute(() => false, async () => ({ authorCreditApi: actorApi("legacy") }));
    assert.equal((await off(request("legacy"))).status, 503);
    assert.equal((await off(request("legacy", claim("legacy_alias")))).status, 503);
    assert.equal((await own("legacy")).status, 503);
    assert.equal((await publicRead("published_alias")).status, 200);
    assert.equal((await setup.query("SELECT count(*)::int AS n FROM community_profile_write_limit")).rows[0].n, 0);
    await setup.query(await migration("up"));
    await setup.query("BEGIN;" + await migration("down") + "COMMIT;");
    await setup.query(await migration("up"));
  });

  await t.test("legacy claim is independent of acknowledgement and leaves the profile private", async () => {
    assert.deepEqual(await status(await own("legacy")), noCredit);
    assert.equal((await own("legacy", acknowledge("legacy_alias", null))).status, 409);
    assert.equal((await own("legacy", claim("Published_Alias"))).status, 409);
    const claimed = await status(await own("legacy", claim(" Legacy_Alias ")));
    assert.deepEqual(claimed, { ...noCredit, handle: "legacy_alias" });
    assert.equal((await own("legacy", claim("new_alias"))).status, 409);
    assert.equal((await own("legacy", acknowledge("unclaimed_alias", null))).status, 409);
    const opted = await status(await own("legacy", acknowledge("legacy_alias", claimed.revision)));
    assert.equal(opted.credit, "active");
    assert.ok(opted.revision);
    assert.equal((await publicRead("legacy_alias")).status, 404);
    assert.deepEqual((await setup.query(`SELECT display_name,public_visibility,publication_basis,author_credit_policy_version
      FROM community_profile WHERE user_id='legacy'`)).rows[0], {
      display_name: "", public_visibility: false, publication_basis: null,
      author_credit_policy_version: AUTHOR_CREDIT_POLICY_VERSION,
    });
  });

  await t.test("profile publication does not imply credit and deactivation preserves opted-in credit", async () => {
    const old = await status(await own("public-author"));
    assert.deepEqual(old, { ...noCredit, handle: "published_alias" });
    const opted = await status(await own("public-author", acknowledge("published_alias", old.revision)));
    assert.equal((await profiles("own", request("public-author", { deactivate: true }))).status, 200);
    assert.equal((await publicRead("published_alias")).status, 404);
    assert.deepEqual(await status(await own("public-author")), opted);
    const deactivated = (await setup.query(`SELECT deactivated_at,publication_recorded_at,publication_basis
      FROM community_profile WHERE user_id='public-author'`)).rows[0];
    const withdrawn = await status(await own("public-author", withdraw(opted.revision)));
    assert.equal(withdrawn.credit, "inactive");
    assert.notEqual(withdrawn.revision, opted.revision);
    assert.equal((await own("public-author", acknowledge("published_alias", opted.revision))).status, 409);
    assert.deepEqual(await status(await own("public-author")), withdrawn);
    assert.deepEqual((await setup.query(`SELECT deactivated_at,publication_recorded_at,publication_basis
      FROM community_profile WHERE user_id='public-author'`)).rows[0], deactivated);

    const client = await setup.connect();
    try {
      await assert.rejects(client.query("BEGIN;" + await migration("down") + "COMMIT;"), /Preserve author credit evidence/);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  await t.test("same-account and cross-account claims cannot settle on two handles or two owners", async () => {
    const settled = await Promise.all([own("race", claim("race_one")), own("race", claim("race_two"))]);
    assert.deepEqual(settled.map(response => response.status).sort(), [200, 409]);
    const actual = await status(await own("race"));
    const competingClaims = await Promise.all([own("contender", claim("shared_alias")), own("other", claim("SHARED_ALIAS"))]);
    assert.deepEqual(competingClaims.map(response => response.status).sort(), [200, 409]);
    const opted = await status(await own("race", acknowledge(actual.handle!, actual.revision)));
    const competing = await Promise.all([own("race", withdraw(opted.revision)), own("race", withdraw(opted.revision))]);
    assert.deepEqual(competing.map(response => response.status).sort(), [200, 409]);
  });

  await t.test("quota is shared and a delayed write cannot reset a newer minute", async () => {
    await setup.query(`CREATE FUNCTION statement_timestamp() RETURNS timestamptz LANGUAGE sql STABLE
      AS $$ SELECT TIMESTAMPTZ '2026-11-23 11:59:59+00' $$;
      UPDATE community_profile_write_limit SET window_start=TIMESTAMPTZ '2026-11-23 12:00:00+00',requests=10
      WHERE user_id='race'`);
    const response = await own("race", withdraw((await status(await own("race"))).revision));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.deepEqual((await setup.query(`SELECT requests, window_start=TIMESTAMPTZ '2026-11-23 12:00:00+00' AS same_window
      FROM community_profile_write_limit WHERE user_id='race'`)).rows[0], { requests: 11, same_window: true });
  });
});
