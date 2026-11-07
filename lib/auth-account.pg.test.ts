import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// End to end: change password, change email (old address approves, new address verifies),
// forgot and set password, per-address email caps and per-IP limits, on the real auth config.
// Only a deliberately named disposable loopback DB is permitted. Mail goes to the memory transport.
const url = process.env.AUTHORING_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || parsed.hostname !== "127.0.0.1" ||
      parsed.pathname !== "/physcratic_authoring_test" || parsed.search || parsed.hash) {
    throw new Error("AUTHORING_TEST_DATABASE_URL must point to the disposable loopback physcratic_authoring_test database without URL overrides");
  }
  Object.assign(process.env, { NODE_ENV: "test", AUTH_EMAIL_TRANSPORT: "memory" });
  for (const key of ["VERCEL_ENV", "RESEND_API_KEY", "RESEND_EMAIL_DOMAIN", "BETTER_AUTH_URL", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL", "AUTHORING_STAGING_BLOB_ENABLED"])
    delete process.env[key];
}

const origin = "http://localhost:3000";

test("account settings flows on the throwaway PostgreSQL", { skip: !url }, async (t) => {
  const { betterAuth } = await import("better-auth");
  const { getMigrations } = await import("better-auth/db/migration");
  const { createAuthOptions } = await import("./auth-config");
  const { authEmailOutbox } = await import("./auth-email-transport");
  const { reserveAuthEmail, budgetIdentifier } = await import("./auth-email-budget");
  const { TERMS_VERSION } = await import("./terms");

  const schema = `auth_account_${randomUUID().replaceAll("-", "")}`;
  const role = `${schema}_runtime`;
  const admin = new Pool({ connectionString: url, max: 1 });
  const pools: Pool[] = [];
  t.after(async () => {
    await Promise.all(pools.map((p) => p.end()));
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.query(`DROP ROLE IF EXISTS "${role}"`);
    await admin.end();
  });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`CREATE ROLE "${role}" NOLOGIN`);
  const makePool = (runtime = false) => {
    const p = new Pool({ connectionString: url, max: 8, options: `-c search_path=${schema}${runtime ? ` -c role=${role}` : ""}`, statement_timeout: 5000 });
    pools.push(p); return p;
  };
  const pending: Promise<void>[] = [];
  const flush = async () => { while (pending.length) await pending.shift(); };
  const build = (pool: Pool) => betterAuth(createAuthOptions({
    pool, defer: (task) => { pending.push(task()); },
    overrides: { baseURL: origin, secret: "isolated-auth-test-secret-at-least-32-chars", logger: { disabled: true } },
  }));
  const setup = makePool();
  await setup.query(await readFile(new URL("../migrations/20261031_auth_rate_limit.sql", import.meta.url), "utf8"));
  await (await getMigrations(build(setup).options)).runMigrations();
  // The runtime role gets only the grants production already has. No new table, column or grant.
  await setup.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
  await setup.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "user", "session", "account", "verification", "rateLimit" TO "${role}"`);
  const pool = makePool(true);
  const auth = build(pool);

  let ipCounter = 1;
  const freshIp = () => `198.51.100.${ipCounter++}`;
  type Reply = { status: number; body: any; location: string | null; cookies: string[] };
  async function call(path: string, { method = "POST", body, cookie, ip = freshIp() }: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}): Promise<Reply> {
    const target = path.startsWith("http") ? path : `${origin}/api/auth${path}`;
    const headers: Record<string, string> = { origin, "x-forwarded-for": ip };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (cookie) headers.cookie = cookie;
    const response = await auth.handler(new Request(target, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" }));
    const text = await response.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* redirects have no JSON */ }
    return { status: response.status, body: parsed, location: response.headers.get("location"), cookies: response.headers.getSetCookie() };
  }
  const cookieOf = (reply: Reply) => reply.cookies.map((c) => c.split(";")[0]).filter((c) => c.includes("session_token")).join("; ");
  async function signIn(email: string, password: string) {
    const reply = await call("/sign-in/email", { body: { email, password } });
    return { status: reply.status, cookie: cookieOf(reply) };
  }
  async function createUser(email: string, password: string) {
    // The HTTP sign-up needs a captcha verdict, so test users are made through the server API.
    await auth.api.signUpEmail({ body: { email, password, name: "Account Name", termsAccepted: true, termsVersion: TERMS_VERSION } as never });
    await setup.query(`UPDATE "user" SET "emailVerified"=true WHERE email=$1`, [email]);
  }
  const outbox = authEmailOutbox();
  const mailTo = (to: string) => outbox.filter((m) => m.to === to);
  const linkIn = (text: string, prefix: string) => {
    const found = text.split(/\s+/).find((word) => word.startsWith(`${origin}/api/auth/${prefix}`));
    assert.ok(found, `expected a ${prefix} link`); return found;
  };
  const emailOf = async (id: string) => (await setup.query(`SELECT email, "emailVerified" FROM "user" WHERE id=$1`, [id])).rows[0];
  const sessionUser = async (cookie: string) => (await call("/get-session", { method: "GET", cookie })).body?.user ?? null;

  await createUser("ada@example.invalid", "first-password-1");
  await flush();
  let ada = await signIn("ada@example.invalid", "first-password-1");
  assert.equal(ada.status, 200);
  const adaId = (await sessionUser(ada.cookie)).id as string;

  await t.test("the account name cannot be edited, the display name stays the only name", async () => {
    const reply = await call("/update-user", { body: { name: "Unmoderated" }, cookie: ada.cookie });
    assert.equal(reply.status, 400);
    assert.equal(reply.body.code, "NAME_CHANGE_NOT_ALLOWED");
    assert.equal((await setup.query(`SELECT name FROM "user" WHERE id=$1`, [adaId])).rows[0].name, "Account Name");
  });

  await t.test("change password needs the current one", async () => {
    const wrong = await call("/change-password", { body: { currentPassword: "nope-nope-1", newPassword: "second-password-2", revokeOtherSessions: true }, cookie: ada.cookie });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.code, "INVALID_PASSWORD");
    const other = await signIn("ada@example.invalid", "first-password-1");
    const ok = await call("/change-password", { body: { currentPassword: "first-password-1", newPassword: "second-password-2", revokeOtherSessions: true }, cookie: ada.cookie });
    assert.equal(ok.status, 200);
    ada = { status: 200, cookie: cookieOf(ok) };
    assert.equal(await sessionUser(other.cookie), null, "other devices are signed out");
    assert.ok(await sessionUser(ada.cookie), "this device stays signed in");
    assert.equal((await signIn("ada@example.invalid", "first-password-1")).status, 401);
    assert.equal((await signIn("ada@example.invalid", "second-password-2")).status, 200);
  });

  await t.test("change email: password first, old address approves, new address verifies, then it switches", async () => {
    const body = { newEmail: "ada.new@example.invalid", callbackURL: "/settings" };
    const missing = await call("/change-email", { body, cookie: ada.cookie });
    assert.equal(missing.status, 400); assert.equal(missing.body.code, "CURRENT_PASSWORD_REQUIRED");
    const wrong = await call("/change-email", { body: { ...body, currentPassword: "first-password-1" }, cookie: ada.cookie });
    assert.equal(wrong.status, 400); assert.equal(wrong.body.code, "INVALID_PASSWORD");
    assert.equal((await call("/change-email", { body: { ...body, currentPassword: "second-password-2" } })).status, 401);

    const ok = await call("/change-email", { body: { ...body, currentPassword: "second-password-2" }, cookie: ada.cookie });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    await flush();
    assert.equal((await emailOf(adaId)).email, "ada@example.invalid", "nothing changes before both links");
    assert.equal(mailTo("ada.new@example.invalid").length, 0, "the new address waits for the approval");
    const approval = mailTo("ada@example.invalid").at(-1)!;
    assert.equal(approval.subject, "Approve your new Physcratic email");
    assert.match(approval.text, /ada\.new@example\.invalid/);
    assert.match(approval.text, /Not you\? Reset your password\. http:\/\/localhost:3000\/forgot-password/);

    const approvalLink = linkIn(approval.text, "verify-email");
    assert.equal(new URL(approvalLink).searchParams.get("callbackURL"), "/email-change?step=approved");
    const approved = await call(approvalLink, { method: "GET" });
    assert.equal(approved.status, 302);
    assert.equal(approved.location, "/email-change?step=approved");
    await flush();
    assert.equal((await emailOf(adaId)).email, "ada@example.invalid", "approval alone does not switch");
    const verify = mailTo("ada.new@example.invalid").at(-1)!;
    assert.equal(verify.subject, "Confirm your new Physcratic email");

    const verifyLink = linkIn(verify.text, "verify-email");
    const done = await call(verifyLink, { method: "GET", cookie: ada.cookie });
    assert.equal(done.status, 302);
    assert.equal(done.location, "/email-change?step=done");
    assert.deepEqual(await emailOf(adaId), { email: "ada.new@example.invalid", emailVerified: true });
    assert.equal((await sessionUser(ada.cookie))?.email, "ada.new@example.invalid", "a signed-in browser stays signed in");
    assert.equal((await signIn("ada@example.invalid", "second-password-2")).status, 401);
    ada = await signIn("ada.new@example.invalid", "second-password-2");
    assert.equal(ada.status, 200);

    const replay = await call(verifyLink, { method: "GET" });
    assert.equal(replay.status, 302);
    assert.match(replay.location ?? "", /error=/, "a used link only reports an error");
    const stale = await call(approvalLink, { method: "GET" });
    assert.match(stale.location ?? "", /error=/, "the old approval link is dead once the email moved");
  });

  await t.test("change email to an address that already has an account looks the same and sends nothing to it", async () => {
    await createUser("taken@example.invalid", "taken-password-1");
    await flush();
    const before = mailTo("taken@example.invalid").length;
    const reply = await call("/change-email", { body: { newEmail: "taken@example.invalid", currentPassword: "second-password-2" }, cookie: ada.cookie });
    assert.equal(reply.status, 200);
    await flush();
    assert.equal(mailTo("taken@example.invalid").length, before);
    assert.equal((await emailOf(adaId)).email, "ada.new@example.invalid");
  });

  await t.test("opening the final link while signed out changes the email but signs nobody in", async () => {
    await createUser("carol@example.invalid", "carol-password-1");
    await flush();
    const carol = await signIn("carol@example.invalid", "carol-password-1");
    const carolId = (await sessionUser(carol.cookie)).id as string;
    assert.equal((await call("/change-email", { body: { newEmail: "carol.new@example.invalid", currentPassword: "carol-password-1" }, cookie: carol.cookie })).status, 200);
    await flush();
    await call(linkIn(mailTo("carol@example.invalid").at(-1)!.text, "verify-email"), { method: "GET" });
    await flush();
    const sessionsBefore = (await setup.query(`SELECT token FROM "session" WHERE "userId"=$1`, [carolId])).rows.map((r) => r.token);
    const done = await call(linkIn(mailTo("carol.new@example.invalid").at(-1)!.text, "verify-email"), { method: "GET" });
    assert.equal(done.status, 302);
    assert.equal(done.location, "/email-change?step=signed-out");
    assert.deepEqual(await emailOf(carolId), { email: "carol.new@example.invalid", emailVerified: true });
    const live = done.cookies.filter((c) => /session_token=[^;]+/.test(c) && !/max-age=0/i.test(c));
    assert.deepEqual(live, [], "no usable session cookie is set");
    const sessionsAfter = (await setup.query(`SELECT token FROM "session" WHERE "userId"=$1`, [carolId])).rows.map((r) => r.token);
    assert.deepEqual(sessionsAfter.sort(), sessionsBefore.sort(), "the session Better Auth made was revoked");
    const reused = cookieOf(done);
    if (reused) assert.equal(await sessionUser(reused), null);
    assert.equal((await signIn("carol.new@example.invalid", "carol-password-1")).status, 200);
  });

  await t.test("with no email sender, reset and change email refuse the same way for every address", async () => {
    const saved = process.env.AUTH_EMAIL_TRANSPORT;
    delete process.env.AUTH_EMAIL_TRANSPORT;
    try {
      const sentBefore = outbox.length;
      const resetsBefore = (await setup.query(`SELECT count(*)::int AS n FROM "verification" WHERE identifier LIKE 'reset-password:%'`)).rows[0].n;
      const known = await call("/request-password-reset", { body: { email: "ada.new@example.invalid", redirectTo: "/reset-password" } });
      const unknown = await call("/request-password-reset", { body: { email: "nobody-at-all@example.invalid", redirectTo: "/reset-password" } });
      assert.equal(known.status, 400);
      assert.equal(known.body.code, "EMAIL_NOT_CONFIGURED");
      assert.deepEqual(known.body, unknown.body, "the reply does not depend on whether the account exists");
      const change = await call("/change-email", { body: { newEmail: "nope@example.invalid", currentPassword: "second-password-2" }, cookie: ada.cookie });
      assert.equal(change.status, 400);
      assert.equal(change.body.code, "EMAIL_NOT_CONFIGURED");
      await flush();
      assert.equal(outbox.length, sentBefore);
      assert.equal((await setup.query(`SELECT count(*)::int AS n FROM "verification" WHERE identifier LIKE 'reset-password:%'`)).rows[0].n, resetsBefore, "no reset token is made")
    } finally {
      process.env.AUTH_EMAIL_TRANSPORT = saved;
    }
    const ok = await call("/request-password-reset", { body: { email: "nobody-at-all@example.invalid", redirectTo: "/reset-password" } });
    assert.equal(ok.status, 200, "configured again, the normal reply returns");
  });

  await t.test("forgot password: generic reply, one-use link, every session signed out", async () => {
    const ghost = await call("/request-password-reset", { body: { email: "nobody@example.invalid", redirectTo: "/reset-password" } });
    assert.equal(ghost.status, 200);
    const real = await call("/request-password-reset", { body: { email: "ada.new@example.invalid", redirectTo: "/reset-password" } });
    assert.deepEqual(real.body, ghost.body, "same reply whether or not the account exists");
    await flush();
    assert.equal(mailTo("nobody@example.invalid").length, 0);
    const mail = mailTo("ada.new@example.invalid").at(-1)!;
    assert.equal(mail.subject, "Reset your Physcratic password");
    const opened = await call(linkIn(mail.text, "reset-password/"), { method: "GET" });
    assert.equal(opened.status, 302);
    const landing = new URL(opened.location!, origin);
    assert.equal(landing.pathname, "/reset-password");
    const token = landing.searchParams.get("token")!;
    assert.ok(token);
    assert.equal((await call("/reset-password", { body: { token, newPassword: "short" } })).status, 400);
    assert.equal((await call("/reset-password", { body: { token, newPassword: "third-password-3" } })).status, 200);
    assert.equal(await sessionUser(ada.cookie), null, "reset signs out every device");
    assert.equal((await signIn("ada.new@example.invalid", "second-password-2")).status, 401);
    assert.equal((await signIn("ada.new@example.invalid", "third-password-3")).status, 200);
    const again = await call("/reset-password", { body: { token, newPassword: "fourth-password-4" } });
    assert.equal(again.status, 400);
    assert.equal(again.body.code, "INVALID_TOKEN");
  });

  await t.test("an account without a password gets a set-password link and can then sign in", async () => {
    const user = { id: randomUUID() };
    await setup.query(`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,'OAuth Person','oauth@example.invalid',true,now(),now())`, [user.id]);
    await setup.query(`INSERT INTO "account"(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES($1,'gh-123','github',$2,now(),now())`, [randomUUID(), user.id]);
    await call("/request-password-reset", { body: { email: "oauth@example.invalid", redirectTo: "/reset-password" } });
    await flush();
    const mail = mailTo("oauth@example.invalid").at(-1)!;
    assert.equal(mail.subject, "Set your Physcratic password");
    const token = new URL((await call(linkIn(mail.text, "reset-password/"), { method: "GET" })).location!, origin).searchParams.get("token");
    assert.equal((await call("/reset-password", { body: { token, newPassword: "brand-new-pass-1" } })).status, 200);
    const signedIn = await signIn("oauth@example.invalid", "brand-new-pass-1");
    assert.equal(signedIn.status, 200);
    // A signed-in account with no password cannot change its email until it sets one.
    await setup.query(`UPDATE "account" SET password=NULL WHERE "userId"=$1 AND "providerId"='credential'`, [user.id]);
    const blocked = await call("/change-email", { body: { newEmail: "oauth.new@example.invalid", currentPassword: "brand-new-pass-1" }, cookie: signedIn.cookie });
    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.code, "PASSWORD_NOT_SET");
  });

  await t.test("at most 3 reset or change emails per address per hour, from any number of IPs", async () => {
    await createUser("flood@example.invalid", "flood-password-1");
    await flush();
    const sent = () => mailTo("flood@example.invalid").filter((m) => m.subject.startsWith("Reset")).length;
    const replies = [];
    for (let i = 0; i < 5; i++) replies.push(await call("/request-password-reset", { body: { email: "FLOOD@example.invalid", redirectTo: "/reset-password" } }));
    await flush();
    assert.ok(replies.every((r) => r.status === 200 && r.body.status === true), "a full budget looks like any other reply");
    assert.deepEqual(new Set(replies.map((r) => JSON.stringify(r.body))).size, 1);
    assert.equal(sent(), 3);
    const rows = await setup.query(`SELECT identifier FROM "verification" WHERE identifier LIKE 'auth-email-budget:%'`);
    assert.ok(rows.rows.every((r) => !r.identifier.includes("@")), "addresses are stored hashed");
    // An hour later the address gets its budget back.
    await setup.query(`UPDATE "verification" SET "expiresAt"=$2 WHERE identifier=$1`, [budgetIdentifier("flood@example.invalid"), new Date(Date.now() - 1000)]);
    await call("/request-password-reset", { body: { email: "flood@example.invalid", redirectTo: "/reset-password" } });
    await flush();
    assert.equal(sent(), 4);

    // Change email shares the cap on the current address and says so, since it is the signed-in owner asking.
    const flood = await signIn("flood@example.invalid", "flood-password-1");
    const change = async (n: number) => call("/change-email", { body: { newEmail: `flood.${n}@example.invalid`, currentPassword: "flood-password-1" }, cookie: flood.cookie });
    assert.equal((await change(1)).status, 200);
    assert.equal((await change(2)).status, 200);
    const capped = await change(3);
    assert.equal(capped.status, 429);
    assert.equal(capped.body.code, "EMAIL_BUDGET");
    await flush();

    // Clicking one approval link again and again cannot flood the new address either.
    const approval = mailTo("flood@example.invalid").filter((m) => m.subject.startsWith("Approve")).at(-1)!;
    const approvalLink = linkIn(approval.text, "verify-email");
    for (let i = 0; i < 5; i++) await call(approvalLink, { method: "GET" });
    await flush();
    assert.equal(mailTo("flood.2@example.invalid").length, 3);
  });

  await t.test("parallel reservations on many instances never pass the cap", async () => {
    const others = [makePool(true), makePool(true)];
    const results = await Promise.all(Array.from({ length: 12 }, (_, n) => reserveAuthEmail(others[n % 2], "race@example.invalid", "reset")));
    assert.equal(results.filter(Boolean).length, 3);
  });

  await t.test("per-IP limits still apply to the new endpoints", async () => {
    const ip = freshIp();
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await call("/request-password-reset", { body: { email: `ip${i}@example.invalid`, redirectTo: "/reset-password" }, ip })).status);
    assert.deepEqual(statuses, [200, 200, 200, 429]);
    const pwIp = freshIp();
    const pw = [];
    for (let i = 0; i < 4; i++) pw.push((await call("/change-password", { body: { currentPassword: "x-wrong-pass", newPassword: "whatever-pass-1" }, cookie: ada.cookie, ip: pwIp })).status);
    assert.equal(pw.at(-1), 429);
  });

  await flush();
  assert.ok(outbox.every((m) => m.to.endsWith("@example.invalid")), "nothing left the memory transport");
});
