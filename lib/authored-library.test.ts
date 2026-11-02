import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createAuthoredLibraryApi } from "./authored-library-api";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import {
  authoredLibraryFiltersSchema,
  type AuthoredLibraryPage,
} from "./authored-library-contracts";
import {
  publicAuthoredMetadata,
  type AuthoredDocument,
} from "./problem-authoring";

test("library filters bound input and reject private selectors", () => {
  for (const input of [
    { q: "x".repeat(201) },
    { tag: "x".repeat(81) },
    { difficulty: "x".repeat(81) },
    { after: "not-a-uuid" },
    { ownerId: "other" },
    { revisionId: randomUUID() },
    { provenance: "draft" },
  ])
    assert.equal(authoredLibraryFiltersSchema.safeParse(input).success, false);
  assert.equal(
    authoredLibraryFiltersSchema.parse({ q: "  energy  " }).q,
    "energy",
  );
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test(
  "published library discovery on disposable PostgreSQL",
  { skip: !url && "Use scripts/test-problem-authoring.sh" },
  async (t) => {
    const target = new URL(url!);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/physcratic_authoring_test");
    const schema = `library_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url,
      options: `-c search_path=${schema},public`,
      statement_timeout: 5000,
    });
    const api = createAuthoredLibraryApi(pool);
    const author = createProblemAuthoringApi({
      pool,
      user: async () => ({ id: "author", emailVerified: true }),
      origin: () => true,
    });
    const request = (body?: unknown, method = body ? "POST" : "GET") =>
      new Request("https://physcratic.test/api", {
        method,
        headers: {
          origin: "https://physcratic.test",
          "content-type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    async function action(
      kind: Parameters<typeof author>[0],
      id?: string,
      body?: unknown,
      method?: string,
    ) {
      const r = await author(kind, request(body, method), id);
      assert.ok(r.ok, await r.clone().text());
      return r.status === 204 ? undefined : r.json();
    }
    async function list(
      params: Record<string, string | undefined> = {},
      headers?: HeadersInit,
    ) {
      return api(
        new Request(
          `https://physcratic.test/api/authored-problems/library?${new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]])))}`,
          { headers },
        ),
      );
    }
    const input = (title: string, authorized = false) => {
      const partId = randomUUID();
      const content: AuthoredDocument = {
        title,
        topicTags: ["Mechanics"],
        methodTags: ["Energy"],
        estimatedDifficulty: "Intermediate",
        context: [
          {
            id: randomUUID(),
            kind: "text",
            spans: [{ kind: "text", text: "STATEMENT_ONLY_SENTINEL" }],
          },
        ],
        sections: [
          {
            id: randomUUID(),
            title: "Motion",
            blocks: [],
            parts: [
              { id: partId, label: "a", answerMode: "manual", blocks: [] },
            ],
          },
        ],
        provenance: {
          kind: authorized ? "authorized" : "original",
          source: authorized ? "Licensed pendulum source" : "",
          rightsDeclaration: "Author permits this publication.",
        },
        attachments: [],
      };
      return {
        content,
        privateParts: [
          {
            partId,
            key: { kind: "manual" },
            hints: [
              {
                id: randomUUID(),
                kind: "text",
                spans: [{ kind: "text", text: "PRIVATE_HINT_SENTINEL" }],
              },
            ],
            solution: [],
          },
        ],
      };
    };
    const published: {
      id: string;
      revision: string;
      input: ReturnType<typeof input>;
    }[] = [];
    try {
      await pool.query(
        'CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES(\'author\')',
      );
      for (const m of [
        "0001_problem_authoring",
        "0002_authored_write_limit",
        "0003_author_media",
        "0004_authored_attempts",
        "0005_authored_solution_access",
        "0006_authored_discovery",
      ])
        await pool.query(
          "BEGIN;\n" +
            (await readFile(`migrations/${m}.up.sql`, "utf8")) +
            "\nCOMMIT;",
        );
      for (let i = 0; i < 28; i++) {
        const body = input(`Pendulum energy ${i}`, i === 0);
        const d = await action("create", undefined, body);
        const p = await action("publish", d.problemId, { version: 1 });
        published.push({
          id: d.problemId,
          revision: p.revision.id,
          input: body,
        });
      }
      const draft = await action(
        "create",
        undefined,
        input("DRAFT_ONLY_SENTINEL"),
      );
      // Author writes are deliberately limited; reset only the disposable test bucket.
      await pool.query("DELETE FROM authored_write_limit");
      await t.test(
        "bounded guest and authenticated discovery expose only public current metadata",
        async () => {
          const guest = await list();
          assert.equal(guest.status, 200);
          assert.equal(guest.headers.get("cache-control"), "private, no-store");
          assert.equal(guest.headers.get("x-robots-tag"), "noindex, nofollow");
          const page = await guest.json();
          assert.equal(page.problems.length, 24);
          assert.ok(page.nextCursor);
          assert.deepEqual(
            page,
            await (await list({}, { cookie: "session=anything" })).json(),
          );
          const raw = JSON.stringify(page);
          for (const hidden of [
            "PRIVATE_HINT",
            "STATEMENT_ONLY",
            "DRAFT_ONLY",
            "ownerId",
            "attachments",
            "solution",
            "permission",
            "attempt",
            "reveal",
          ])
            assert.equal(raw.includes(hidden), false, hidden);
          assert.deepEqual(
            Object.keys(page.problems[0]).sort(),
            [
              "problemId",
              "revisionId",
              "title",
              "topicTags",
              "methodTags",
              "estimatedDifficulty",
              "provenance",
            ].sort(),
          );
          const projected = publicAuthoredMetadata({
            ...published[0].input.content,
            privateParts: "secret",
          });
          assert.equal("privateParts" in projected, false);
          const second: AuthoredLibraryPage = await (
            await list({ after: page.nextCursor })
          ).json();
          assert.equal(second.problems.length, 4);
          assert.equal(second.nextCursor, null);
          assert.equal(
            new Set(
              [...page.problems, ...second.problems].map((p) => p.problemId),
            ).size,
            28,
          );
        },
      );
      await t.test(
        "search title/tags/source and exact metadata filters; no statement/private search",
        async () => {
          for (const params of [
            { q: "pendulum energy" },
            { tag: "Mechanics" },
            { tag: "Energy" },
            { difficulty: "Intermediate" },
          ])
            assert.equal(
              (await (await list(params)).json()).problems.length,
              24,
            );
          for (const params of [
            { q: "PRIVATE_HINT_SENTINEL" },
            { q: "STATEMENT_ONLY_SENTINEL" },
            { q: "DRAFT_ONLY_SENTINEL" },
            { tag: "unknown mechanics tag" },
            { difficulty: "Advanced" },
            { q: "' OR 1=1 --" },
          ])
            assert.equal(
              (await (await list(params)).json()).problems.length,
              0,
            );
          assert.equal(
            (
              await (
                await list({ q: "licensed source", provenance: "authorized" })
              ).json()
            ).problems[0].problemId,
            published[0].id,
          );
          assert.equal(
            (
              await (
                await list({
                  tag: "Mechanics",
                  difficulty: "Intermediate",
                  provenance: "authorized",
                })
              ).json()
            ).problems.length,
            1,
          );
          assert.equal((await (await list({ tag: "mechanics" })).json()).problems.length, 24);
          for (const query of [
            "ownerId=author",
            "revisionId=" + published[0].revision,
            "q=x&q=y",
            "after=bogus",
            "q=" + "x".repeat(201),
          ])
            assert.equal(
              (await api(new Request("https://physcratic.test/api?" + query)))
                .status,
              400,
            );
        },
      );
      await t.test(
        "taxonomy aliases filter legacy JSON before pagination without rewriting revisions",
        async () => {
          await pool.query("DELETE FROM authored_write_limit");
          const fixtures: { id: string; revision: string; content: AuthoredDocument }[] = [];
          const topicVariants = ["Modern", "Modern physics", "modern-physics", "mOdErN\t PhYsIcS", "Modern\u00a0physics", "MODERN"];
          const methodVariants = ["Blackbody radiation", "Black-body radiation", "black-body-radiation", "bLaCk—bOdY\t Radiation"];
          let hiddenId: string | undefined;
          let hiddenPublished = false;
          try {
            for (let i = 0; i < 28; i++) {
              const body = input(`Taxonomy fixture ${i}`);
              body.content.topicTags = [topicVariants[i % topicVariants.length]];
              body.content.methodTags = [methodVariants[i % methodVariants.length], "My custom technique"];
              if (i === 0) {
                body.content.topicTags.push("modern-physics");
                body.content.methodTags.push("Black-body radiation");
              }
              const d = await action("create", undefined, body);
              const p = await action("publish", d.problemId, { version: 1 });
              fixtures.push({ id: d.problemId, revision: p.revision.id, content: body.content });
            }
            // A newer editable draft must never replace the published tag snapshot.
            const edited = input("DRAFT_TAXONOMY_SENTINEL");
            edited.content.topicTags = ["Optics"];
            await action("update", fixtures[0].id, { ...edited, version: 2 }, "PUT");
            const hidden = input("UNPUBLISHED_TAXONOMY_SENTINEL");
            hidden.content.topicTags = ["Modern"];
            hidden.content.methodTags = ["Blackbody radiation"];
            hiddenId = (await action("create", undefined, hidden)).problemId;
            assert.equal((await (await list({ tag: "Modern" })).json()).problems.length, 24);
            await action("publish", hiddenId, { version: 1 });
            hiddenPublished = true;
            await action("unpublish", hiddenId, { version: 2 });
            const expected = fixtures.map((f) => f.id).sort();
            for (const tag of ["Modern", "Modern physics", "modern-physics", "  MODERN   PHYSICS ",
              "Blackbody radiation", "Black-body radiation", "black-body-radiation", "My custom technique"]) {
              const firstResponse = await list({ tag });
              assert.equal(firstResponse.status, 200, await firstResponse.clone().text());
              const first: AuthoredLibraryPage = await firstResponse.json();
              assert.equal(first.problems.length, 24, tag);
              assert.ok(first.nextCursor);
              const second: AuthoredLibraryPage = await (await list({ tag, after: first.nextCursor! })).json();
              assert.equal(second.problems.length, 4, tag);
              assert.equal(second.nextCursor, null);
              const combined = [...first.problems, ...second.problems];
              assert.deepEqual(combined.map((p) => p.problemId), expected, tag);
              for (const p of combined) {
                assert.deepEqual(p.topicTags, ["Modern physics"]);
                assert.deepEqual(p.methodTags, ["Black-body radiation", "My custom technique"]);
                assert.equal(p.revisionId, fixtures.find((f) => f.id === p.problemId)!.revision);
              }
              for (const secret of ["PRIVATE_HINT", "STATEMENT_ONLY", "SENTINEL", "attachments", "solution", "ownerId"])
                assert.equal(JSON.stringify(combined).includes(secret), false, secret);
            }
            for (const tag of ["my custom technique", "My custom technique' OR true --", "Blackbody radiations", "Optics"]) {
              const page: AuthoredLibraryPage = await (await list({ tag })).json();
              assert.equal(page.problems.some((p) => expected.includes(p.problemId)), false, tag);
            }
            const { rows } = await pool.query("SELECT id,content FROM authored_revision WHERE id = ANY($1::uuid[])", [fixtures.map((f) => f.revision)]);
            assert.equal(rows.length, fixtures.length);
            for (const row of rows) assert.deepEqual(row.content, fixtures.find((f) => f.revision === row.id)!.content);
          } finally {
            await pool.query("DELETE FROM authored_write_limit");
            for (const fixture of fixtures) {
              const version = fixture.id === fixtures[0].id ? 3 : 2;
              await action("unpublish", fixture.id, { version });
              await action("delete", fixture.id, { version: version + 1 }, "DELETE");
            }
            if (hiddenId) await action("delete", hiddenId, { version: hiddenPublished ? 3 : 1 }, "DELETE");
            await pool.query("DELETE FROM authored_write_limit");
          }
        },
      );
      await t.test(
        "exact difficulty preserves valid published edge whitespace",
        async () => {
          const body = input("Whitespace-bearing difficulty");
          body.content.estimatedDifficulty = " Intermediate ";
          const d = await action("create", undefined, body);
          await action("publish", d.problemId, { version: 1 });
          const exact: AuthoredLibraryPage = await (
            await list({ difficulty: " Intermediate " })
          ).json();
          assert.deepEqual(
            exact.problems.map((p) => p.problemId),
            [d.problemId],
          );
          const unpadded: AuthoredLibraryPage = await (
            await list({ difficulty: "Intermediate" })
          ).json();
          assert.equal(
            unpadded.problems.some((p) => p.problemId === d.problemId),
            false,
          );
          await action("unpublish", d.problemId, { version: 2 });
          await action("delete", d.problemId, { version: 3 }, "DELETE");
        },
      );
      await t.test(
        "keyset remains stable through republish, unpublish, draft edit and deletion",
        async () => {
          const first: AuthoredLibraryPage = await (await list()).json();
          const target = published.find(
            (p) => p.id === first.problems[0].problemId,
          )!;
          const updated = structuredClone(target.input);
          updated.content.title = "New harmonic oscillator";
          await action("update", target.id, { ...updated, version: 2 }, "PUT");
          assert.equal(
            (await (await list()).json()).problems[0].title,
            target.input.content.title,
          );
          const p = await action("publish", target.id, { version: 3 });
          assert.notEqual(p.revision.id, target.revision);
          const refreshed: AuthoredLibraryPage = await (await list()).json();
          assert.deepEqual(
            refreshed.problems.map((p) => p.problemId),
            first.problems.map((p) => p.problemId),
          );
          assert.equal(refreshed.problems[0].title, "New harmonic oscillator");
          assert.equal(refreshed.problems[0].revisionId, p.revision.id);
          await action("unpublish", target.id, { version: 4 });
          assert.equal(
            (await author("public", request(), target.id)).status,
            404,
          );
          assert.equal(
            (await (await list()).json()).problems.some(
              (p: AuthoredLibraryPage["problems"][number]) =>
                p.problemId === target.id,
            ),
            false,
          );
          await action("delete", target.id, { version: 5 }, "DELETE");
          await action("delete", draft.problemId, { version: 1 }, "DELETE");
          const second: AuthoredLibraryPage = await (
            await list({ after: first.nextCursor! })
          ).json();
          assert.equal(second.problems.length, 4);
          assert.equal(
            second.problems.some((p) =>
              first.problems.some((old) => old.problemId === p.problemId),
            ),
            false,
          );
          // Publish a retained, previously hidden ID behind the cursor: it appears on
          // refresh, without moving any already-listed surviving problem.
          const hidden = published.find(
            (p) => p.id === first.problems[1].problemId,
          )!;
          await action("unpublish", hidden.id, { version: 2 });
          await action("publish", hidden.id, { version: 3 });
          assert.equal(
            (await (await list({ after: first.nextCursor! })).json()).problems
              .length,
            4,
          );
          assert.equal(
            (await (await list()).json()).problems.some(
              (p: AuthoredLibraryPage["problems"][number]) =>
                p.problemId === hidden.id,
            ),
            true,
          );
        },
      );
      await t.test(
        "search and metadata indexes exist, are usable, and rollback preserves publications",
        async () => {
          await pool.query("SET enable_seqscan=off");
          for (const [sql, index] of [
            [
              "SELECT id FROM authored_revision WHERE authored_discovery_terms(content) @@ websearch_to_tsquery('simple','pendulum')",
              "authored_revision_discovery_search_idx",
            ],
            [
              'SELECT id FROM authored_revision WHERE content @> \'{"topicTags":["Mechanics"]}\'',
              "authored_revision_discovery_metadata_idx",
            ],
            [
              "SELECT id FROM authored_revision WHERE content->>'estimatedDifficulty'='Intermediate'",
              "authored_revision_discovery_difficulty_idx",
            ],
            [
              "SELECT id FROM authored_problem WHERE state='published' ORDER BY id LIMIT 25",
              "authored_problem_discovery_idx",
            ],
          ])
            assert.ok(
              JSON.stringify(
                (await pool.query("EXPLAIN " + sql)).rows,
              ).includes(index),
              index,
            );
          await pool.query("RESET enable_seqscan");
          const before = await (await list()).json();
          await pool.query(
            await readFile(
              "migrations/0006_authored_discovery.down.sql",
              "utf8",
            ),
          );
          await pool.query(
            await readFile("migrations/0006_authored_discovery.up.sql", "utf8"),
          );
          assert.deepEqual(await (await list()).json(), before);
        },
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);

test("library failures are generic and uncacheable", async () => {
  const response = await createAuthoredLibraryApi({
    query: async () => {
      throw Error("PRIVATE_DATABASE_DETAILS");
    },
  } as unknown as Pool)(new Request("https://physcratic.test/api"));
  assert.equal(response.status, 503);
  assert.equal(
    (await response.text()).includes("PRIVATE_DATABASE_DETAILS"),
    false,
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
