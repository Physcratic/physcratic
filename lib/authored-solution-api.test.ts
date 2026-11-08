import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createAuthoredSolutionApi } from "./authored-solution-api";
import { createAuthoredAttemptApi } from "./authored-attempt-api";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { createAuthorMediaApi } from "./author-media-api";
import { memoryAuthorStorage, png, pdf } from "../tests/author-media-fixtures";
import { isAllowedSubmissionOrigin } from "./submission-security";
import { solutionMediaPath } from "./authored-solution-contracts";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
const url = process.env.AUTHORING_TEST_DATABASE_URL;
test(
  "explicit authored solution authorization + immutable reveal/assistance against disposable PostgreSQL",
  {
    skip:
      !url && "Use disposable PostgreSQL script with react-server condition",
  },
  async (t) => {
    const target = new URL(url!);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/physcratic_authoring_test");
    const schema = `solution_test_${randomUUID().replaceAll("-", "")}`,
      admin = new Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url,
      options: `-c search_path=${schema},public`,
      max: 10,
      statement_timeout: 5000,
      connectionTimeoutMillis: 3000,
    });
    const sessions = new Map<string, { id: string; emailVerified: boolean }>(),
      store = memoryAuthorStorage();
    const deps = {
      pool,
      user: async (r: Request) =>
        sessions.get(r.headers.get("x-test-user") ?? ""),
      origin: (r: Request) =>
        isAllowedSubmissionOrigin(r, ["https://physcratic.test"]),
    };
    const author = createProblemAuthoringApi(deps),
      attempts = createAuthoredAttemptApi(deps),
      solutions = createAuthoredSolutionApi({
        ...deps,
        storage: store.storage,
      }),
      media = createAuthorMediaApi({ ...deps, storage: store.storage });
    function req(
      who?: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
      path = "/api",
      headers: Record<string, string> = {},
    ) {
      return new Request(`https://physcratic.test${path}`, {
        method,
        headers: {
          origin: "https://physcratic.test",
          "content-type": "application/json",
          ...(who ? { "x-test-user": who } : {}),
          ...headers,
        },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      });
    }
    async function parsed(r: Response, status = 200) {
      assert.equal(r.status, status, await r.clone().text());
      assert.match(r.headers.get("cache-control")!, /private, no-store/);
      return r.json();
    }
    async function user(verified = true) {
      const id = randomUUID();
      sessions.set(id, { id, emailVerified: verified });
      await pool.query('INSERT INTO "user" VALUES($1)', [id]);
      return id;
    }
    const text = (s: string) => ({
      id: randomUUID(),
      kind: "text" as const,
      spans: [{ kind: "text" as const, text: s }],
    });
    async function setup(withMedia = false) {
      const owner = await user(),
        student = await user(),
        other = await user();
      const parts = (["numeric", "expression", "manual"] as const).map(
        (answerMode, i) => ({
          id: randomUUID(),
          label: String(i + 1),
          answerMode,
          blocks: [text(`Question ${i + 1}`)],
        }),
      );
      const content: AuthoredDocument = {
        title: "Reveal test",
        topicTags: [],
        methodTags: [],
        estimatedDifficulty: null,
        context: [text("Public statement only")],
        sections: [{ id: randomUUID(), title: "Multipart", blocks: [], parts }],
        attachments: [],
        provenance: {
          kind: "original",
          source: "",
          rightsDeclaration: "I own this work.",
        },
      };
      const privateParts: PrivatePart[] = parts.map((p, i) => ({
        partId: p.id,
        key:
          p.answerMode === "numeric"
            ? {
                kind: "numeric",
                value: 2,
                units: "1",
                absTol: 0.00001,
                relTol: 0.000002,
              }
            : p.answerMode === "manual"
              ? { kind: "manual" }
              : {
                  kind: "expression",
                  expected: "x^2+137",
                  variables: [{ name: "x", domain: "real", assumptions: [] }],
                  angleUnit: "radians",
                  exclusions: [],
                },
        hints: [text(`UNAPPROVED_HINT_${i}`)],
        solution: [text(`APPROVED_SOLUTION_${i}`)],
      }));
      const d = await parsed(
        await author("create", req(owner, { content, privateParts })),
        201,
      );
      let version = d.version;
      const files: Record<string, string> = {};
      if (withMedia) {
        for (const [key, purpose] of [
          ["a", "solution-image"],
          ["b", "solution-image"],
          ["hint", "solution-image"],
          ["pdf", "solution-pdf"],
          ["statement", "statement-image"],
        ]) {
          const form = new FormData();
          form.set("purpose", purpose);
          form.set(
            "file",
            new File([purpose === "solution-pdf" ? pdf : png], key, {
              type:
                purpose === "solution-pdf" ? "application/pdf" : "image/png",
            }),
          );
          const r = await parsed(
            await media(
              "upload",
              new Request("https://physcratic.test/upload", {
                method: "POST",
                headers: {
                  origin: "https://physcratic.test",
                  "x-test-user": owner,
                },
                body: form,
              }),
              d.problemId,
            ),
            201,
          );
          files[key] = r.id;
        }
        const image = (id: string) => ({
          id: randomUUID(),
          kind: "image" as const,
          mediaId: id,
          alt: "Approved explanation diagram",
          caption: "",
        });
        privateParts[0].solution.push(image(files.a), image(files.a));
        privateParts[1].solution.push(image(files.b));
        privateParts[0].hints.push(image(files.hint));
        privateParts[2].solution = []; // A revision PDF can be the sole worked solution after explicit per-part approval.
        content.context.push(image(files.statement));
        content.attachments = [
          { id: files.pdf, purpose: "solution-pdf" },
          { id: files.statement, purpose: "statement-image" },
        ];
        await parsed(
          await author(
            "update",
            req(owner, { content, privateParts, version }, "PUT"),
            d.problemId,
          ),
        );
        version++;
      }
      const revision = (
        await parsed(
          await author("publish", req(owner, { version }), d.problemId),
        )
      ).revision;
      version++;
      return {
        owner,
        student,
        other,
        problem: d.problemId,
        parts,
        revision,
        content,
        privateParts,
        files,
        version,
      };
    }
    type Fixture = Awaited<ReturnType<typeof setup>>;
    async function permission(
      f: Fixture,
      index = 0,
      extra: Record<string, unknown> = {},
    ) {
      const p = f.parts[index].id;
      const old = await parsed(
        await solutions(
          "permission-read",
          req(f.owner, undefined, "GET", `/api?revision=${f.revision.id}`),
          f.problem,
          p,
        ),
      );
      return solutions(
        "permission-write",
        req(
          f.owner,
          {
            revisionId: f.revision.id,
            version: old.version,
            enabled: true,
            mediaIds: index === 0 && f.files.a ? [f.files.a] : [],
            ...extra,
          },
          "PUT",
        ),
        f.problem,
        p,
      );
    }
    function view(f: Fixture, index = 0, who = f.student, api = solutions) {
      return api(
        "view",
        req(who, { revisionId: f.revision.id }),
        f.problem,
        f.parts[index].id,
      );
    }
    function submit(
      f: Fixture,
      index = 0,
      answer: unknown = { kind: "numeric", value: 2, units: "" },
      key = randomUUID(),
      who = f.student,
      api = attempts,
    ) {
      return api(
        "submit",
        req(who, {
          revisionId: f.revision.id,
          partId: f.parts[index].id,
          answer,
          idempotencyKey: key,
        }),
        f.problem,
      );
    }
    function mediaReq(
      f: Fixture,
      id: string,
      index = 0,
      who = f.student,
      api = solutions,
    ) {
      return api(
        "media",
        req(
          who,
          undefined,
          "GET",
          solutionMediaPath(f.problem, f.revision.id, f.parts[index].id, id),
        ),
        f.problem,
        f.parts[index].id,
        id,
      );
    }
    function cleanOutput(value: unknown) {
      const raw = JSON.stringify(value);
      for (const secret of [
        '"key"',
        '"expected"',
        '"absTol"',
        '"relTol"',
        "UNAPPROVED_HINT",
        "x^2+137",
        "blob.vercel-storage.com",
        "pathname",
        "BLOB_READ_WRITE_TOKEN",
      ])
        assert.equal(raw.includes(secret), false, secret);
    }
    try {
      await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');
      for (const m of [
        "0001_problem_authoring",
        "0002_authored_write_limit",
        "0003_author_media",
        "0004_authored_attempts",
      ])
        await pool.query(
          "BEGIN;\n" +
            (await readFile(`migrations/${m}.up.sql`, "utf8")) +
            "\nCOMMIT;",
        );
      const before = await setup();
      const oldInputKey = randomUUID(),
        oldAttempt = await parsed(
          await submit(before, 0, undefined, oldInputKey),
          201,
        );
      const up = await readFile(
          "migrations/0005_authored_solution_access.up.sql",
          "utf8",
        ),
        down = await readFile(
          "migrations/0005_authored_solution_access.down.sql",
          "utf8",
        );
      await pool.query("BEGIN;\n" + up + "\nCOMMIT;");
      await pool.query(down);
      await pool.query("BEGIN;\n" + up + "\nCOMMIT;");
      await t.test(
        "additive up/down/up preserves old attempts; solutions default denied with no grandfather grants",
        async () => {
          assert.deepEqual(
            (
              await parsed(
                await attempts(
                  "read",
                  req(before.student),
                  oldAttempt.attempt.id,
                ),
              )
            ).attempt,
            oldAttempt.attempt,
          );
          assert.equal((await view(before)).status, 404);
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM authored_solution_permission",
              )
            ).rows[0].count,
            "0",
          );
          const metadata = await parsed(
            await solutions(
              "permission-read",
              req(
                before.owner,
                undefined,
                "GET",
                `/api?revision=${before.revision.id}`,
              ),
              before.problem,
              before.parts[0].id,
            ),
          );
          assert.equal(metadata.enabled, false);
          assert.equal(metadata.version, 0);
          await parsed(await permission(before));
          await parsed(await view(before));
          const replay = await parsed(
            await submit(before, 0, undefined, oldInputKey),
          );
          assert.deepEqual(replay.attempt, oldAttempt.attempt);
          assert.equal(replay.replayed, true);
        },
      );
      await t.test(
        "verified owner-only opt-in, strict origin/body/selection and stale permission concurrency",
        async () => {
          const f = await setup(),
            unverified = await user(false);
          const base = {
            revisionId: f.revision.id,
            version: 0,
            enabled: true,
            mediaIds: [],
          };
          for (const [who, status] of [
            [undefined, 401],
            [unverified, 403],
            [f.other, 404],
          ] as const)
            assert.equal(
              (
                await solutions(
                  "permission-write",
                  req(who, base, "PUT"),
                  f.problem,
                  f.parts[0].id,
                )
              ).status,
              status,
            );
          assert.equal(
            (
              await solutions(
                "permission-write",
                req(f.owner, base, "PUT", "/api", {
                  origin: "https://evil.test",
                }),
                f.problem,
                f.parts[0].id,
              )
            ).status,
            403,
          );
          for (const change of [
            { userId: f.student },
            { assisted: false },
            { version: -1 },
            { expiresAt: "not a date" },
            { mediaIds: [randomUUID()] },
            { revisionId: randomUUID() },
          ])
            assert.ok(
              [400, 404].includes(
                (
                  await solutions(
                    "permission-write",
                    req(f.owner, { ...base, ...change }, "PUT"),
                    f.problem,
                    f.parts[0].id,
                  )
                ).status,
              ),
            );
          const result = await Promise.all([
            solutions(
              "permission-write",
              req(f.owner, base, "PUT"),
              f.problem,
              f.parts[0].id,
            ),
            solutions(
              "permission-write",
              req(f.owner, base, "PUT"),
              f.problem,
              f.parts[0].id,
            ),
          ]);
          assert.deepEqual(result.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            (
              await permission(f, 0, {
                expiresAt: new Date(Date.now() - 1000).toISOString(),
              })
            ).status,
            400,
          );
          const oversized = req(
            f.owner,
            { ...base, junk: "x".repeat(20001) },
            "PUT",
          );
          assert.equal(
            (
              await solutions(
                "permission-write",
                oversized,
                f.problem,
                f.parts[0].id,
              )
            ).status,
            413,
          );
          const slow = new Request("https://physcratic.test/api", {
            method: "PUT",
            headers: {
              origin: "https://physcratic.test",
              "content-type": "application/json",
              "x-test-user": f.owner,
            },
            body: new ReadableStream({
              start(c) {
                c.enqueue(new TextEncoder().encode("{"));
              },
            }),
            duplex: "half",
          } as RequestInit);
          assert.equal(
            (
              await solutions(
                "permission-write",
                slow,
                f.problem,
                f.parts[0].id,
              )
            ).status,
            408,
          );
        },
      );
      await t.test(
        "explicit verified student POST needs no prior attempt; only exact approved solution is returned after ledger commit",
        async () => {
          const f = await setup();
          await parsed(await permission(f));
          const unverified = await user(false);
          for (const [who, status] of [
            [undefined, 401],
            [unverified, 403],
          ] as const)
            assert.equal(
              (
                await solutions(
                  "view",
                  req(who, { revisionId: f.revision.id }),
                  f.problem,
                  f.parts[0].id,
                )
              ).status,
              status,
            );
          assert.equal(
            (
              await solutions(
                "view",
                req(f.student, { revisionId: f.revision.id }, "POST", "/api", {
                  origin: "https://evil.test",
                }),
                f.problem,
                f.parts[0].id,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await solutions(
                "view",
                req(f.student, undefined, "GET"),
                f.problem,
                f.parts[0].id,
              )
            ).status,
            405,
          );
          for (const body of [
            { revisionId: f.revision.id, userId: f.other },
            { revisionId: f.revision.id, assisted: true },
            { revisionId: randomUUID() },
          ])
            assert.ok(
              [400, 409].includes(
                (
                  await solutions(
                    "view",
                    req(f.student, body),
                    f.problem,
                    f.parts[0].id,
                  )
                ).status,
              ),
            );
          assert.equal(
            (
              await solutions(
                "view",
                req(f.student, { revisionId: f.revision.id }),
                randomUUID(),
                f.parts[0].id,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await solutions(
                "view",
                req(f.student, { revisionId: f.revision.id }),
                f.problem,
                randomUUID(),
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM authored_attempt WHERE user_id=$1",
                [f.student],
              )
            ).rows[0].count,
            "0",
          );
          const data = await parsed(await view(f));
          cleanOutput(data);
          assert.equal(data.solution[0].spans[0].text, "APPROVED_SOLUTION_0");
          assert.equal(
            JSON.stringify(data).includes("APPROVED_SOLUTION_1"),
            false,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM authored_solution_reveal WHERE id=$1 AND user_id=$2",
                [data.reveal.id, f.student],
              )
            ).rows[0].count,
            "1",
          );
          const repeated = await parsed(await view(f));
          assert.equal(repeated.reveal.id, data.reveal.id);
          assert.equal(repeated.reveal.createdAt, data.reveal.createdAt);
          assert.equal(repeated.reveal.replayed, true);
          const simultaneous = await Promise.all([
            view(f, 0, f.other),
            view(f, 0, f.other),
          ]);
          const events = await Promise.all(simultaneous.map((r) => parsed(r)));
          assert.equal(events[0].reveal.id, events[1].reveal.id);
          assert.equal((await view(f, 1)).status, 404);
          const publicResponse = await parsed(
            await author("public", req(), f.problem),
          );
          cleanOutput(publicResponse);
          assert.equal(
            JSON.stringify(publicResponse).includes("APPROVED_SOLUTION"),
            false,
          );
        },
      );
      await t.test(
        "explicit per-part image/PDF approval rejects hints, foreign parts/problem/statement and guessed media",
        async () => {
          const f = await setup(true),
            foreign = await setup(true);
          const meta = await parsed(
            await solutions(
              "permission-read",
              req(f.owner, undefined, "GET", `/api?revision=${f.revision.id}`),
              f.problem,
              f.parts[0].id,
            ),
          );
          assert.deepEqual(meta.solutionImageIds, [f.files.a]);
          for (const ids of [
            [],
            [f.files.a, f.files.a.toUpperCase()],
            [f.files.a, f.files.hint],
            [f.files.a, f.files.b],
            [f.files.a, f.files.statement],
            [f.files.a, foreign.files.pdf],
          ])
            assert.equal(
              (await permission(f, 0, { mediaIds: ids })).status,
              400,
            );
          await parsed(
            await permission(f, 0, { mediaIds: [f.files.a, f.files.pdf] }),
          );
          assert.equal(
            (await mediaReq(f, f.files.a)).status,
            404,
            "approval alone must not reveal media",
          );
          const data = await parsed(await view(f));
          cleanOutput(data);
          assert.deepEqual(
            new Set(data.media.map((m: { id: string }) => m.id)),
            new Set([f.files.a, f.files.pdf]),
          );
          for (const id of [
            f.files.hint,
            f.files.b,
            f.files.statement,
            randomUUID(),
            foreign.files.a,
          ])
            assert.equal((await mediaReq(f, id)).status, 404);
          assert.equal((await mediaReq(f, f.files.a, 0, f.other)).status, 404);
          assert.equal((await mediaReq(f, f.files.a, 1)).status, 404);
          for (const [id, expected] of [
            [f.files.a, png],
            [f.files.pdf, pdf],
          ] as const) {
            const response = await mediaReq(f, id);
            assert.equal(response.status, 200);
            assert.deepEqual(
              Buffer.from(await response.arrayBuffer()),
              expected,
            );
            assert.match(
              response.headers.get("cache-control")!,
              /private, no-store/,
            );
            assert.equal(response.headers.get("vary"), "Cookie");
            assert.equal(
              response.headers.get("cross-origin-resource-policy"),
              "same-origin",
            );
            assert.match(
              response.headers.get("content-security-policy")!,
              /sandbox/,
            );
            assert.equal(response.headers.has("location"), false);
          }
          assert.equal(
            (await media("read", req(f.student), f.problem, f.files.a)).status,
            404,
            "legacy private proxy stays owner-only",
          );
          const approval = await parsed(
            await solutions(
              "permission-read",
              req(f.owner, undefined, "GET", `/api?revision=${f.revision.id}`),
              f.problem,
              f.parts[0].id,
            ),
          );
          await assert.rejects(
            pool.query(
              "INSERT INTO authored_solution_permission_media(revision_id,part_id,authorization_id,media_id) VALUES($1,$2,$3,$4)",
              [
                f.revision.id,
                f.parts[0].id,
                approval.authorizationId,
                f.files.b,
              ],
            ),
            /worked solution/,
          );
          assert.equal(
            (await permission(f, 2, { mediaIds: [] })).status,
            400,
            "empty native solution needs an explicitly approved PDF",
          );
          await parsed(await permission(f, 2, { mediaIds: [f.files.pdf] }));
          const pdfOnly = await parsed(await view(f, 2));
          assert.deepEqual(pdfOnly.solution, []);
          assert.equal(pdfOnly.media[0].id, f.files.pdf);
          assert.equal((await mediaReq(f, f.files.pdf, 2)).status, 200);
          assert.equal(
            (
              await solutions(
                "media",
                req(
                  f.student,
                  undefined,
                  "GET",
                  `/api?revision=${randomUUID()}`,
                ),
                f.problem,
                f.parts[0].id,
                f.files.a,
              )
            ).status,
            409,
          );
        },
      );
      await t.test(
        "revocation and new authorization generations deny old views/media; expiry checked even after blob read",
        async () => {
          const f = await setup(true);
          await parsed(
            await permission(f, 0, { mediaIds: [f.files.a, f.files.pdf] }),
          );
          const first = await parsed(await view(f));
          await parsed(
            await permission(f, 0, { enabled: false, mediaIds: [] }),
          );
          assert.equal((await view(f)).status, 404);
          assert.equal((await mediaReq(f, f.files.a)).status, 404);
          await parsed(
            await permission(f, 0, { mediaIds: [f.files.a, f.files.pdf] }),
          );
          assert.equal(
            (await mediaReq(f, f.files.a)).status,
            404,
            "regrant needs a new explicit reveal, not old event",
          );
          const next = await parsed(await view(f));
          assert.notEqual(next.reveal.id, first.reveal.id);
          await parsed(
            await permission(f, 0, {
              mediaIds: [f.files.a],
              expiresAt: new Date(Date.now() + 700).toISOString(),
            }),
          );
          await parsed(await view(f));
          const slow = createAuthoredSolutionApi({
            ...deps,
            storage: {
              get: async (p) => {
                await new Promise((r) => setTimeout(r, 850));
                return store.storage.get(p);
              },
            },
          });
          assert.equal(
            (await mediaReq(f, f.files.a, 0, f.student, slow)).status,
            404,
          );
          assert.equal((await view(f)).status, 404);
          assert.equal(
            (await submit(f)).status,
            201,
            "revocation/expiry must not prevent practice",
          );
        },
      );
      await t.test(
        "any-part reveal assists all subsequent outcomes; previous attempts/replays remain immutable and other users/revisions independent",
        async () => {
          const f = await setup(),
            key = randomUUID(),
            old = await parsed(await submit(f, 0, undefined, key), 201);
          await parsed(await permission(f));
          await parsed(await view(f));
          const inputs: [
            [number, unknown, string],
            [number, unknown, string],
            [number, unknown, string],
            [number, unknown, string],
          ] = [
            [0, { kind: "numeric", value: 2, units: "1" }, "correct"],
            [0, { kind: "numeric", value: 4, units: "" }, "incorrect"],
            [
              1,
              // Phase 1: an undeclared symbol still needs review. sin^2 + cos^2 is now simply incorrect against x^2 + 137.
              { kind: "expression", expression: "y^2+137" },
              "needs-review",
            ],
            [2, { kind: "manual", text: "My own reasoning" }, "ungraded"],
          ];
          for (const [index, answer, status] of inputs) {
            const data = await parsed(await submit(f, index, answer), 201);
            assert.equal(data.attempt.status, status);
            assert.equal(data.attempt.assisted, true);
            cleanOutput(data);
          }
          assert.deepEqual(
            (await parsed(await submit(f, 0, undefined, key))).attempt,
            old.attempt,
          );
          assert.equal(old.attempt.assisted, false);
          assert.equal(
            (
              await parsed(
                await submit(f, 0, undefined, randomUUID(), f.other),
                201,
              )
            ).attempt.assisted,
            false,
          );
          await parsed(await permission(f, 0, { enabled: false }));
          assert.equal(
            (await parsed(await submit(f), 201)).attempt.assisted,
            true,
            "revocation never erases past assistance",
          );
          const history = await parsed(
            await attempts(
              "list",
              req(f.student, undefined, "GET", `/api?problemId=${f.problem}`),
            ),
          );
          assert.equal(
            history.attempts.filter((a: { assisted: boolean }) => a.assisted).length,
            5,
          );
          assert.equal(
            history.attempts.find((a: { id: string }) => a.id === old.attempt.id).assisted,
            false,
          );
          assert.equal(
            (await attempts("read", req(f.other), old.attempt.id)).status,
            404,
          );
          await parsed(
            await author(
              "publish",
              req(f.owner, { version: f.version }),
              f.problem,
            ),
          );
          const latest = (
            await parsed(await author("public", req(), f.problem))
          ).id;
          assert.equal((await view(f)).status, 409);
          assert.equal(
            (
              await solutions(
                "view",
                req(f.student, { revisionId: latest }),
                f.problem,
                f.parts[0].id,
              )
            ).status,
            404,
            "new revisions never inherit approval",
          );
          const response = await attempts(
            "submit",
            req(f.student, {
              revisionId: latest,
              partId: f.parts[0].id,
              answer: { kind: "numeric", value: 2, units: "" },
              idempotencyKey: randomUUID(),
            }),
            f.problem,
          );
          assert.equal((await parsed(response, 201)).attempt.assisted, false);
        },
      );
      await t.test(
        "reveal/submission shared user lock produces a coherent before/after order and original-key concurrency",
        async () => {
          const f = await setup();
          await parsed(await permission(f));
          let entered!: () => void, release!: () => void;
          const waiting = new Promise<void>((r) => (entered = r)),
            gate = new Promise<void>((r) => (release = r));
          const gated = createAuthoredAttemptApi({
            ...deps,
            grade: async (_c, _user, input) => {
              entered();
              await gate;
              return {
                selection: {
                  problemId: input.problemId,
                  revisionId: input.revisionId,
                  partId: input.partId,
                },
                status: "correct",
                reason: "within-tolerance",
                engineVersion: "numeric-v1",
              };
            },
          });
          const key = randomUUID(),
            pending = submit(f, 0, undefined, key, f.student, gated);
          await waiting;
          const reveal = view(f);
          await new Promise((r) => setTimeout(r, 60));
          release();
          const old = await parsed(await pending, 201);
          const event = await parsed(await reveal);
          assert.equal(old.attempt.assisted, false);
          assert.ok(event.reveal.id);
          const [replay, newAttempt] = await Promise.all([
            submit(f, 0, undefined, key),
            submit(f),
          ]);
          assert.equal((await parsed(replay)).attempt.assisted, false);
          assert.equal((await parsed(newAttempt, 201)).attempt.assisted, true);
          // Gate a reveal after its user/publication/permission locks, before commit.
          const f2 = await setup();
          await parsed(await permission(f2));
          await pool.query(
            `CREATE FUNCTION gate_solution_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='${f2.student}' THEN PERFORM pg_advisory_xact_lock(hashtextextended('solution-test-gate',17)); END IF; RETURN NEW; END $$; CREATE TRIGGER zz_gate_solution_insert BEFORE INSERT ON authored_solution_reveal FOR EACH ROW EXECUTE FUNCTION gate_solution_insert()`,
          );
          const c = await pool.connect();
          await c.query("BEGIN");
          await c.query(
            "SELECT pg_advisory_xact_lock(hashtextextended('solution-test-gate',17))",
          );
          try {
            const revealing = view(f2);
            let blocked = false;
            for (let i = 0; i < 100; i++) {
              const { rows } = await pool.query(
                "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event='advisory' AND query LIKE 'INSERT INTO authored_solution_reveal%') AS blocked",
              );
              if (rows[0].blocked) {
                blocked = true;
                break;
              }
              await new Promise((r) => setTimeout(r, 10));
            }
            assert.equal(
              blocked,
              true,
              "reveal holds its user lock at the insert gate",
            );
            let submitted = false;
            const grading = submit(f2).then((r) => {
              submitted = true;
              return r;
            });
            await new Promise((r) => setTimeout(r, 60));
            assert.equal(submitted, false);
            await c.query("COMMIT");
            await parsed(await revealing);
            assert.equal(
              (await parsed(await grading, 201)).attempt.assisted,
              true,
              "reveal-first must assist the waiting submission",
            );
          } finally {
            await c.query("ROLLBACK");
            c.release();
            await pool.query(
              "DROP TRIGGER zz_gate_solution_insert ON authored_solution_reveal;DROP FUNCTION gate_solution_insert()",
            );
          }
        },
      );
      await t.test(
        "reveal commit failure returns no solution and rolls ledger back",
        async () => {
          const f = await setup();
          await parsed(await permission(f));
          await pool.query(
            `CREATE FUNCTION fail_solution_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='${f.student}' THEN RAISE EXCEPTION 'SECRET_DB_DIAGNOSTIC'; END IF;RETURN NEW;END $$; CREATE CONSTRAINT TRIGGER fail_solution_commit AFTER INSERT ON authored_solution_reveal DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fail_solution_commit()`,
          );
          const failure = await view(f);
          assert.equal(failure.status, 503);
          const body = await failure.text();
          assert.equal(body.includes("APPROVED_SOLUTION"), false);
          assert.equal(body.includes("SECRET_DB_DIAGNOSTIC"), false);
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM authored_solution_reveal WHERE user_id=$1",
                [f.student],
              )
            ).rows[0].count,
            "0",
          );
          await pool.query(
            "DROP TRIGGER fail_solution_commit ON authored_solution_reveal;DROP FUNCTION fail_solution_commit()",
          );
          await parsed(await view(f));
        },
      );
      await t.test(
        "media/revoke and reveal/unpublish serialize; historical solution access never survives unpublish",
        async () => {
          const f = await setup(true);
          await parsed(await permission(f));
          await parsed(await view(f));
          const assistedKey = randomUUID(),
            assistedAttempt = await parsed(
              await submit(f, 0, undefined, assistedKey),
              201,
            );
          assert.equal(assistedAttempt.attempt.assisted, true);
          let entered!: () => void, release!: () => void;
          const waiting = new Promise<void>((r) => (entered = r)),
            gate = new Promise<void>((r) => (release = r));
          const gated = createAuthoredSolutionApi({
            ...deps,
            storage: {
              get: async (p) => {
                entered();
                await gate;
                return store.storage.get(p);
              },
            },
          });
          const reading = mediaReq(f, f.files.a, 0, f.student, gated);
          await waiting;
          let revoked = false;
          const revoking = permission(f, 0, {
            enabled: false,
            mediaIds: [],
          }).then((r) => {
            revoked = true;
            return r;
          });
          await new Promise((r) => setTimeout(r, 60));
          assert.equal(revoked, false);
          release();
          assert.equal((await reading).status, 200);
          await parsed(await revoking);
          assert.equal((await mediaReq(f, f.files.a)).status, 404);
          await parsed(await permission(f));
          const c = await pool.connect();
          await c.query("BEGIN");
          await c.query(
            "SELECT 1 FROM authored_problem WHERE id=$1 FOR UPDATE",
            [f.problem],
          );
          const pending = view(f);
          await c.query(
            "UPDATE authored_problem SET state='draft',published_revision_id=NULL WHERE id=$1",
            [f.problem],
          );
          await c.query("COMMIT");
          c.release();
          assert.equal((await pending).status, 404);
          assert.equal((await mediaReq(f, f.files.a)).status, 404);
          assert.equal((await submit(f)).status, 404);
          await parsed(
            await permission(f, 0, { enabled: false, mediaIds: [] }),
          );
          assert.equal(
            (await permission(f)).status,
            409,
            "cannot opt in while unpublished",
          );
          const replay = await parsed(
            await submit(f, 0, undefined, assistedKey),
          );
          assert.equal(replay.replayed, true);
          assert.deepEqual(replay.attempt, assistedAttempt.attempt);
          // Existing assistance/selection survive unpublication without exposing content.
          const read = await attempts(
            "list",
            req(f.student, undefined, "GET", `/api?problemId=${f.problem}`),
          );
          assert.equal(read.status, 200);
          cleanOutput(await read.json());
        },
      );
      await t.test(
        "SQL preserves ledger/attempt immutability, FK scope and server-derived assisted flag; populated rollback refused",
        async () => {
          const f = await setup();
          await parsed(await permission(f));
          await assert.rejects(
            pool.query(
              "INSERT INTO authored_solution_permission(problem_id,revision_id,part_id,approved_by,authorization_id,version,enabled) VALUES($1,$2,$3,$4,$5,1,false)",
              [f.problem, f.revision.id, randomUUID(), f.owner, randomUUID()],
            ),
            /foreign key/,
          );
          await assert.rejects(
            pool.query(
              "INSERT INTO authored_solution_reveal(id,user_id,problem_id,revision_id,part_id,authorization_id) VALUES($1,$2,$3,$4,$5,$6)",
              [
                randomUUID(),
                f.student,
                f.problem,
                f.revision.id,
                f.parts[0].id,
                randomUUID(),
              ],
            ),
            /explicit authorization/,
          );
          async function rawAttempt(who: string, assisted: boolean) {
            return pool.query(
              "INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number,assisted) VALUES($1,$2,$3,$4,$5,$6,$7,'correct','within-tolerance','numeric-v1',1,$8) RETURNING assisted",
              [
                randomUUID(),
                who,
                f.problem,
                f.revision.id,
                f.parts[0].id,
                randomUUID(),
                JSON.stringify({ kind: "numeric", value: 2, units: "" }),
                assisted,
              ],
            );
          }
          assert.equal(
            (await rawAttempt(f.other, true)).rows[0].assisted,
            false,
          );
          const data = await parsed(await view(f));
          assert.equal(
            (await rawAttempt(f.student, false)).rows[0].assisted,
            true,
          );
          for (const sql of [
            "UPDATE authored_solution_reveal SET created_at=clock_timestamp() WHERE id=$1",
            "DELETE FROM authored_solution_reveal WHERE id=$1",
          ])
            await assert.rejects(
              pool.query(sql, [data.reveal.id]),
              /immutable/,
            );
          await assert.rejects(
            pool.query(
              "UPDATE authored_attempt SET assisted=false WHERE user_id=$1",
              [f.student],
            ),
            /immutable/,
          );
          await assert.rejects(
            pool.query(
              "DELETE FROM authored_solution_permission WHERE revision_id=$1",
              [f.revision.id],
            ),
            /Revoke/,
          );
          await assert.rejects(
            pool.query("BEGIN;\n" + down + "\nCOMMIT;"),
            /populated rollback/,
          );
          await pool.query("ROLLBACK");
        },
      );
      await t.test(
        "persistent request limits, same-client poolmax1 and bounded storage failure paths",
        async () => {
          const f = await setup(true);
          await parsed(await permission(f));
          await parsed(await view(f));
          await pool.query(
            "INSERT INTO authored_student_rate(user_id,window_start,requests,submissions) VALUES($1,date_trunc('minute',clock_timestamp()),60,0) ON CONFLICT(user_id) DO UPDATE SET window_start=EXCLUDED.window_start,requests=60,submissions=0",
            [f.student],
          );
          const r = await view(f);
          assert.equal(r.status, 429);
          assert.equal(r.headers.get("retry-after"), "60");
          await pool.query(
            "DELETE FROM authored_student_rate WHERE user_id=$1",
            [f.student],
          );
          const one = new Pool({
            connectionString: url,
            options: `-c search_path=${schema},public`,
            max: 1,
            connectionTimeoutMillis: 1000,
          });
          try {
            const api = createAuthoredSolutionApi({
              ...deps,
              pool: one,
              storage: store.storage,
            });
            await parsed(await view(f, 0, f.student, api));
            assert.equal(
              (await mediaReq(f, f.files.a, 0, f.student, api)).status,
              200,
            );
          } finally {
            await one.end();
          }
          for (const storage of [
            {
              get: async () => {
                throw new TypeError("PRIVATE_STORAGE_CREDENTIAL");
              },
            },
            { get: async () => new Uint8Array(png.length - 1) },
            {
              get: async () => {
                throw Error("PRIVATE_STORAGE_CREDENTIAL");
              },
            },
            { get: async () => new Uint8Array(png.length + 1) },
            {
              get: async () =>
                new ReadableStream<Uint8Array>({
                  start(c) {
                    c.enqueue(new Uint8Array(3145729));
                  },
                }),
            },
          ]) {
            const api = createAuthoredSolutionApi({ ...deps, storage });
            const failure = await mediaReq(f, f.files.a, 0, f.student, api);
            assert.equal(failure.status, 503);
            assert.equal(
              (await failure.text()).includes("PRIVATE_STORAGE_CREDENTIAL"),
              false,
            );
          }
          let cancelled = false;
          const stalled = createAuthoredSolutionApi({
            ...deps,
            storage: {
              get: async () =>
                new ReadableStream<Uint8Array>({
                  cancel() {
                    cancelled = true;
                  },
                }),
            },
          });
          assert.equal(
            (await mediaReq(f, f.files.a, 0, f.student, stalled)).status,
            503,
          );
          assert.equal(cancelled, true);
        },
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
