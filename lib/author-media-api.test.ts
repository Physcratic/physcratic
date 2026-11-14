import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createAuthorMediaApi } from "./author-media-api";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { isAllowedSubmissionOrigin } from "./submission-security";
import { authorMediaMaxBytes, type AuthorMediaPurpose } from "./author-media";
import { memoryAuthorStorage, png, pdf } from "../tests/author-media-fixtures";
import { newProblem } from "./problem-authoring-editor";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
const testUrl = process.env.AUTHORING_TEST_DATABASE_URL;
test(
  "author media security + lifecycle against isolated PostgreSQL and memory storage",
  { skip: !testUrl && "Run scripts/test-problem-authoring.sh" },
  async (t) => {
    const url = new URL(testUrl!);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.pathname, "/physcratic_authoring_test");
    const schema = `media_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString: testUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: testUrl,
      options: `-c search_path=${schema},public`,
      max: 10,
    });
    const mock = memoryAuthorStorage();
    const sessions = new Map<string, { id: string; emailVerified: boolean }>();
    const deps = {
      pool,
      storage: mock.storage,
      user: async (r: Request) =>
        sessions.get(r.headers.get("x-test-user") ?? ""),
      origin: (r: Request) =>
        isAllowedSubmissionOrigin(r, ["https://physcratic.test"]),
    };
    const api = createProblemAuthoringApi(deps),
      media = createAuthorMediaApi(deps);
    async function user(verified = true) {
      const id = randomUUID();
      sessions.set(id, { id, emailVerified: verified });
      await pool.query('INSERT INTO "user" VALUES($1)', [id]);
      return id;
    }
    function req(
      owner?: string,
      body?: unknown,
      method = "POST",
      extra: Record<string, string> = {},
    ) {
      return new Request("https://physcratic.test/api", {
        method,
        headers: {
          origin: "https://physcratic.test",
          "content-type": "application/json",
          ...(owner ? { "x-test-user": owner } : {}),
          ...extra,
        },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      });
    }
    function document() {
      const p = newProblem(),
        partId = randomUUID();
      const content: AuthoredDocument = {
        ...p.content,
        estimatedDifficulty: "1200",
        title: "Original physics",
        context: [
          {
            id: randomUUID(),
            kind: "text",
            spans: [{ kind: "text", text: "Find the motion." }],
          },
        ],
        sections: [
          {
            id: randomUUID(),
            title: "Motion",
            blocks: [],
            parts: [
              { id: partId, label: "a", blocks: [], answerMode: "manual" },
            ],
          },
        ],
        provenance: {
          kind: "original",
          source: "",
          rightsDeclaration: "I own this material.",
        },
      };
      const privateParts: PrivatePart[] = [
        { partId, key: { kind: "manual" }, hints: [], solution: [] },
      ];
      return { content, privateParts };
    }
    async function create(owner: string) {
      const body = document(),
        response = await api("create", req(owner, body));
      assert.equal(response.status, 201, await response.clone().text());
      return { ...(await response.json()), ...body };
    }
    function form(
      owner: string | undefined,
      purpose: AuthorMediaPurpose,
      bytes: Uint8Array = png,
      type = purpose.endsWith("pdf") ? "application/pdf" : "image/png",
      extra: Record<string, string> = {},
    ) {
      const data = new FormData();
      data.set("purpose", purpose);
      data.set(
        "file",
        new File([new Uint8Array(bytes)], "../weird\u202e.html", { type }),
      );
      return new Request("https://physcratic.test/api", {
        method: "POST",
        headers: {
          origin: "https://physcratic.test",
          ...(owner ? { "x-test-user": owner } : {}),
          ...extra,
        },
        body: data,
      });
    }
    async function upload(
      owner: string,
      id: string,
      purpose: AuthorMediaPurpose = "statement-image",
    ) {
      const response = await media(
        "upload",
        form(owner, purpose, purpose.endsWith("pdf") ? pdf : png),
        id,
      );
      assert.equal(response.status, 201, await response.clone().text());
      const info = await response.json();
      assert.equal(
        "pathname" in info || "url" in info || "sha256" in info,
        false,
      );
      return info;
    }
    function image(id: string) {
      return {
        id: randomUUID(),
        kind: "image" as const,
        mediaId: id,
        alt: "Diagram of the setup",
        caption: "A physical diagram",
      };
    }
    async function read(
      id: string,
      fileId: string,
      owner?: string,
      revision?: string,
    ) {
      const r = req(owner, undefined, "GET");
      const request = new Request(
        `https://physcratic.test/api${revision ? `?revision=${revision}` : ""}`,
        r,
      );
      return media("read", request, id, fileId);
    }
    async function cleanup(owner: string) {
      return media("cleanup", req(owner));
    }
    try {
      await pool.query('CREATE TABLE "user" (id text PRIMARY KEY)');
      for (const name of [
        "0001_problem_authoring",
        "0002_authored_write_limit",
        "0003_author_media",
      ])
        await pool.query(
          "BEGIN;\n" +
            (await readFile(`migrations/${name}.up.sql`, "utf8")) +
            "\nCOMMIT;",
        );
      // Empty-registry down/up is safe; populated-registry rollback must refuse later.
      await pool.query(
        "BEGIN;\n" +
          (await readFile("migrations/0003_author_media.down.sql", "utf8")) +
          "\nCOMMIT;",
      );
      await pool.query(
        "BEGIN;\n" +
          (await readFile("migrations/0003_author_media.up.sql", "utf8")) +
          "\nCOMMIT;",
      );
      await t.test(
        "verified owner gate, origin guard, registry metadata allowlist and guessed file denial",
        async () => {
          const a = await user(),
            b = await user(),
            unverified = await user(false),
            d = await create(a);
          for (const [action, status, who] of [
            ["upload", 401, undefined],
            ["upload", 403, unverified],
            ["list", 401, undefined],
            ["cleanup", 403, unverified],
          ] as const)
            assert.equal(
              (
                await media(
                  action,
                  action === "upload" ? form(who, "statement-image") : req(who),
                  d.problemId,
                )
              ).status,
              status,
            );
          assert.equal(
            (
              await media(
                "upload",
                form(a, "statement-image", png, "image/png", {
                  origin: "https://evil.test",
                }),
                d.problemId,
              )
            ).status,
            403,
          );
          assert.equal(
            (await media("upload", form(b, "statement-image"), d.problemId))
              .status,
            404,
          );
          const file = await upload(a, d.problemId);
          assert.ok(file.filename.endsWith(".png"));
          assert.equal(file.filename.includes("/"), false);
          const before = mock.reads;
          assert.equal((await read(d.problemId, file.id)).status, 404);
          assert.equal((await read(d.problemId, file.id, b)).status, 404);
          assert.equal((await read(d.problemId, randomUUID(), a)).status, 404);
          assert.equal(mock.reads, before);
          const response = await read(d.problemId, file.id, a);
          assert.equal(response.status, 200);
          assert.deepEqual(
            new Uint8Array(await response.arrayBuffer()),
            new Uint8Array(png),
          );
          assert.equal(
            response.headers.get("x-content-type-options"),
            "nosniff",
          );
          assert.equal(
            response.headers.get("cache-control"),
            "private, no-store",
          );
          const listing = await media(
            "list",
            req(a, undefined, "GET"),
            d.problemId,
          );
          assert.equal(listing.status, 200);
          assert.equal((await listing.text()).includes("pathname"), false);
          assert.equal(
            (await media("list", req(b, undefined, "GET"), d.problemId)).status,
            404,
          );
        },
      );
      await t.test(
        "spoofed/truncated types, oversize actual bytes, duplicate fields and client metadata fail closed",
        async () => {
          const owner = await user(),
            d = await create(owner);
          const before = mock.objects.size;
          for (const [bytes, type, purpose] of [
            [png, "image/jpeg", "statement-image"],
            [
              Buffer.from("<svg onload='alert(1)'/>"),
              "image/svg+xml",
              "statement-image",
            ],
            [png.subarray(0, 12), "image/png", "statement-image"],
            [pdf, "application/pdf", "statement-image"],
            [png, "image/png", "solution-pdf"],
          ] as const)
            assert.equal(
              (
                await media(
                  "upload",
                  form(owner, purpose, bytes, type),
                  d.problemId,
                )
              ).status,
              400,
            );
          assert.equal(
            (
              await media(
                "upload",
                form(
                  owner,
                  "statement-image",
                  new Uint8Array(authorMediaMaxBytes + 1),
                ),
                d.problemId,
              )
            ).status,
            413,
          );
          assert.equal(
            (
              await media(
                "upload",
                form(
                  owner,
                  "statement-image",
                  new Uint8Array(authorMediaMaxBytes + 100000),
                  "image/png",
                  { "content-length": "1" },
                ),
                d.problemId,
              )
            ).status,
            413,
          );
          const invalid = new FormData();
          invalid.set("purpose", "statement-image");
          invalid.append(
            "file",
            new File([png], "a.png", { type: "image/png" }),
          );
          invalid.append(
            "file",
            new File([png], "b.png", { type: "image/png" }),
          );
          invalid.set("ownerId", "victim");
          assert.equal(
            (
              await media(
                "upload",
                new Request("https://physcratic.test/api", {
                  method: "POST",
                  headers: {
                    origin: "https://physcratic.test",
                    "x-test-user": owner,
                  },
                  body: invalid,
                }),
                d.problemId,
              )
            ).status,
            400,
          );
          assert.equal(mock.objects.size, before);
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::integer AS n FROM author_media WHERE problem_id=$1",
                [d.problemId],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "reference authorization covers cross-account/problem/purpose and pending files",
        async () => {
          const a = await user(),
            b = await user(),
            d = await create(a),
            other = await create(a),
            foreign = await create(b);
          const own = await upload(a, d.problemId),
            privateImage = await upload(a, d.problemId, "solution-image"),
            otherFile = await upload(a, other.problemId),
            foreignFile = await upload(b, foreign.problemId);
          for (const id of [
            otherFile.id,
            foreignFile.id,
            randomUUID(),
            privateImage.id,
          ]) {
            const content = structuredClone(d.content);
            content.context.push(image(id));
            content.attachments = [{ id, purpose: "statement-image" }];
            assert.equal(
              (
                await api(
                  "update",
                  req(a, { version: 1, content, privateParts: d.privateParts }),
                  d.problemId,
                )
              ).status,
              400,
            );
          }
          const privateParts = structuredClone(d.privateParts);
          privateParts[0].hints = [image(own.id)];
          assert.equal(
            (
              await api(
                "update",
                req(a, { version: 1, content: d.content, privateParts }),
                d.problemId,
              )
            ).status,
            400,
          );
          // A ready object cannot have its private/public purpose or path rewritten.
          await assert.rejects(
            pool.query(
              "UPDATE author_media SET purpose='statement-image' WHERE id=$1",
              [privateImage.id],
            ),
            /immutable/,
          );
          const pending = randomUUID();
          await pool.query(
            "INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256) VALUES($1,$2,'statement-image',$3,'pending.png','image/png',1,$4)",
            [pending, d.problemId, `isolated/${pending}`, "0".repeat(64)],
          );
          const content = structuredClone(d.content);
          content.context.push(image(pending));
          content.attachments = [{ id: pending, purpose: "statement-image" }];
          assert.equal(
            (
              await api(
                "update",
                req(a, { version: 1, content, privateParts: d.privateParts }),
                d.problemId,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT version FROM authored_draft WHERE problem_id=$1",
                [d.problemId],
              )
            ).rows[0].version,
            1,
          );
        },
      );
      await t.test(
        "publish pins statements only for public access, private solutions never leak, history survives replacement/unpublish",
        async () => {
          const owner = await user(),
            d = await create(owner);
          const stmt = await upload(owner, d.problemId),
            secret = await upload(owner, d.problemId, "solution-image"),
            statementPdf = await upload(owner, d.problemId, "statement-pdf"),
            solutionPdf = await upload(owner, d.problemId, "solution-pdf");
          const body = {
            content: structuredClone(d.content),
            privateParts: structuredClone(d.privateParts),
          };
          body.content.context.push(image(stmt.id));
          body.content.attachments = [
            { id: stmt.id, purpose: "statement-image" },
            { id: statementPdf.id, purpose: "statement-pdf" },
            { id: solutionPdf.id, purpose: "solution-pdf" },
          ];
          body.privateParts[0].solution = [image(secret.id)];
          assert.equal(
            (
              await api(
                "update",
                req(owner, { version: 1, ...body }),
                d.problemId,
              )
            ).status,
            200,
          );
          assert.equal((await read(d.problemId, stmt.id)).status, 404);
          const privateDownload = await read(
            d.problemId,
            solutionPdf.id,
            owner,
          );
          assert.equal(privateDownload.status, 200);
          assert.ok(
            privateDownload.headers
              .get("content-disposition")
              ?.startsWith("attachment"),
          );
          assert.ok(
            privateDownload.headers
              .get("content-security-policy")
              ?.includes("sandbox"),
          );
          const results = await Promise.all([
            api("publish", req(owner, { version: 2 }), d.problemId),
            api("publish", req(owner, { version: 2 }), d.problemId),
            media("delete", req(owner), d.problemId, stmt.id),
          ]);
          assert.deepEqual(
            results
              .slice(0, 2)
              .map((r) => r.status)
              .sort(),
            [200, 409],
          );
          assert.equal(results[2].status, 409);
          const revision = (
            await (results[0].status === 200 ? results[0] : results[1]).json()
          ).revision;
          // Final sealing rejects a missing binding and extra unmentioned media.
          const extra = await upload(owner, d.problemId);
          for (const mode of ["missing", "extra"]) {
            const c = await pool.connect(),
              next = randomUUID();
            try {
              await c.query("BEGIN");
              await c.query(
                "INSERT INTO authored_revision_part SELECT $1,part_id,answer_mode FROM authored_revision_part WHERE revision_id=$2",
                [next, revision.id],
              );
              await c.query(
                "INSERT INTO authored_revision_private_part SELECT $1,part_id,answer_mode,data FROM authored_revision_private_part WHERE revision_id=$2",
                [next, revision.id],
              );
              if (mode === "extra") {
                await c.query(
                  "INSERT INTO author_revision_media SELECT $1,problem_id,media_id,purpose FROM author_revision_media WHERE revision_id=$2",
                  [next, revision.id],
                );
                await c.query(
                  "INSERT INTO author_revision_media VALUES($1,$2,$3,'statement-image')",
                  [next, d.problemId, extra.id],
                );
              }
              await assert.rejects(
                c.query(
                  "INSERT INTO authored_revision(id,problem_id,number,content) SELECT $1,problem_id,99,content FROM authored_revision WHERE id=$2",
                  [next, revision.id],
                ),
                /media bindings are incomplete/,
              );
            } finally {
              await c.query("ROLLBACK");
              c.release();
            }
          }
          assert.equal((await read(d.problemId, stmt.id)).status, 200);
          assert.equal((await read(d.problemId, statementPdf.id)).status, 200);
          for (const id of [secret.id, solutionPdf.id]) {
            assert.equal((await read(d.problemId, id)).status, 404);
            assert.equal(
              (await read(d.problemId, id, undefined, revision.id)).status,
              404,
            );
          }
          const publicJson = JSON.stringify(
            await (
              await api("public", req(undefined, undefined, "GET"), d.problemId)
            ).json(),
          );
          assert.equal(
            publicJson.includes(secret.id) ||
              publicJson.includes(solutionPdf.id) ||
              publicJson.includes("pathname"),
            false,
          );
          const replacement = await upload(owner, d.problemId);
          body.content.context[1] = image(replacement.id);
          body.content.attachments[0] = {
            id: replacement.id,
            purpose: "statement-image",
          };
          assert.equal(
            (
              await api(
                "update",
                req(owner, { version: 3, ...body }),
                d.problemId,
              )
            ).status,
            200,
          );
          assert.equal(
            (await api("publish", req(owner, { version: 4 }), d.problemId))
              .status,
            200,
          );
          assert.equal((await read(d.problemId, stmt.id)).status, 404);
          assert.equal(
            (await read(d.problemId, stmt.id, undefined, revision.id)).status,
            200,
          );
          assert.equal(
            (await media("delete", req(owner), d.problemId, stmt.id)).status,
            409,
          );
          await assert.rejects(
            pool.query("DELETE FROM author_revision_media WHERE media_id=$1", [
              stmt.id,
            ]),
            /immutable/,
          );
          await pool.query(
            "UPDATE author_media SET created_at=now()-interval '2 days' WHERE problem_id=$1",
            [d.problemId],
          );
          assert.equal((await cleanup(owner)).status, 200);
          assert.equal((await read(d.problemId, stmt.id, owner)).status, 200);
          assert.equal(
            (await api("unpublish", req(owner, { version: 5 }), d.problemId))
              .status,
            200,
          );
          assert.equal(
            (await read(d.problemId, stmt.id, undefined, revision.id)).status,
            404,
          );
          assert.equal((await read(d.problemId, replacement.id)).status, 404);
          await assert.rejects(
            pool.query(
              await readFile("migrations/0003_author_media.down.sql", "utf8"),
            ),
            /Retain media registry/,
          );
        },
      );
      await t.test(
        "remove/link races cannot delete a newly linked object, orphan cleanup respects grace and private storage failures",
        async () => {
          const owner = await user(),
            d = await create(owner),
            file = await upload(owner, d.problemId);
          const content = structuredClone(d.content);
          content.context.push(image(file.id));
          content.attachments = [{ id: file.id, purpose: "statement-image" }];
          const [save, del] = await Promise.all([
            api(
              "update",
              req(owner, { version: 1, content, privateParts: d.privateParts }),
              d.problemId,
            ),
            media("delete", req(owner), d.problemId, file.id),
          ]);
          assert.ok(
            (save.status === 200 && del.status === 409) ||
              (save.status === 400 && del.status === 200),
            `unexpected race statuses ${save.status}/${del.status}`,
          );
          const orphan = await upload(owner, d.problemId);
          assert.equal((await cleanup(owner)).status, 200);
          assert.equal((await read(d.problemId, orphan.id, owner)).status, 200);
          await pool.query(
            "UPDATE author_media SET created_at=now()-interval '2 days' WHERE id=$1",
            [orphan.id],
          );
          assert.ok((await (await cleanup(owner)).json()).deleted >= 1);
          assert.equal((await read(d.problemId, orphan.id, owner)).status, 404);
          mock.failPut = true;
          mock.failDelete = true;
          const failed = await media(
            "upload",
            form(owner, "solution-pdf", pdf),
            d.problemId,
          );
          assert.equal(failed.status, 503);
          assert.equal((await failed.text()).includes("author-media/"), false);
          const tombstone = await pool.query(
            "SELECT id,state,pathname FROM author_media WHERE problem_id=$1 AND state='deleting'",
            [d.problemId],
          );
          assert.ok(tombstone.rows.length);
          mock.failPut = false;
          mock.failDelete = false;
          await pool.query(
            "UPDATE author_media SET created_at=now()-interval '2 hours' WHERE problem_id=$1 AND state='deleting'",
            [d.problemId],
          );
          assert.equal((await (await cleanup(owner)).json()).retry, 0);
          for (const row of tombstone.rows)
            assert.equal(mock.objects.has(row.pathname), false);
        },
      );
      await t.test(
        "deleting the last orphan recovers problem quota and ambiguous PUT failures retain retry tombstones",
        async () => {
          const owner = await user(),
            d = await create(owner),
            file = await upload(owner, d.problemId);
          assert.equal(
            (
              await api(
                "delete",
                req(owner, { version: 1 }, "DELETE"),
                d.problemId,
              )
            ).status,
            204,
          );
          assert.equal(
            (
              await pool.query("SELECT id FROM authored_problem WHERE id=$1", [
                d.problemId,
              ])
            ).rowCount,
            1,
          );
          assert.equal(
            (await media("delete", req(owner), d.problemId, file.id)).status,
            200,
          );
          assert.equal(
            (
              await pool.query("SELECT id FROM authored_problem WHERE id=$1", [
                d.problemId,
              ])
            ).rowCount,
            0,
          );
          const active = await create(owner);
          mock.failPut = true;
          mock.failDelete = false;
          assert.equal(
            (
              await media(
                "upload",
                form(owner, "statement-image"),
                active.problemId,
              )
            ).status,
            503,
          );
          mock.failPut = false;
          const pending = await pool.query(
            "SELECT id,state FROM author_media WHERE problem_id=$1",
            [active.problemId],
          );
          assert.equal(pending.rowCount, 1);
          assert.equal(pending.rows[0].state, "deleting");
          await pool.query(
            "UPDATE author_media SET created_at=now()-interval '2 hours' WHERE problem_id=$1",
            [active.problemId],
          );
          assert.equal((await cleanup(owner)).status, 200);
          assert.equal(
            (
              await pool.query(
                "SELECT id FROM author_media WHERE problem_id=$1",
                [active.problemId],
              )
            ).rowCount,
            0,
          );
        },
      );
      await t.test(
        "persistent daily limits charge failures, aggregate quota is reserved atomically",
        async () => {
          const owner = await user(),
            d = await create(owner);
          await pool.query(
            "INSERT INTO author_media_usage VALUES($1,current_date,30)",
            [owner],
          );
          const before = mock.objects.size;
          assert.equal(
            (await media("upload", form(owner, "statement-image"), d.problemId))
              .status,
            429,
          );
          assert.equal(mock.objects.size, before);
          await pool.query(
            "UPDATE author_media_usage SET day=current_date-1 WHERE user_id=$1",
            [owner],
          );
          await upload(owner, d.problemId);
          assert.equal(
            (
              await pool.query(
                "SELECT attempts FROM author_media_usage WHERE user_id=$1",
                [owner],
              )
            ).rows[0].attempts,
            1,
          );
          await pool.query(
            "UPDATE author_media_usage SET attempts=29 WHERE user_id=$1",
            [owner],
          );
          const two = await Promise.all(
            [1, 2].map(() =>
              media("upload", form(owner, "statement-image"), d.problemId),
            ),
          );
          assert.deepEqual(two.map((r) => r.status).sort(), [201, 429]);
          const limited = await user(),
            p = await create(limited);
          for (let i = 0; i < 34; i++) {
            const id = randomUUID();
            await pool.query(
              "INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state) VALUES($1,$2,'statement-image',$3,'quota.png','image/png',3145728,$4,'ready')",
              [id, p.problemId, `isolated/quota/${id}`, "0".repeat(64)],
            );
          }
          assert.equal(
            (
              await media(
                "upload",
                form(limited, "statement-image"),
                p.problemId,
              )
            ).status,
            429,
          );
        },
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
