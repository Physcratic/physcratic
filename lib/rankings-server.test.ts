import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import { createRankingsService } from "./rankings-server";
import { RANKINGS_PAGE_SIZE } from "./rankings";

const url = process.env.AUTHORING_TEST_DATABASE_URL;

test(
  "rankings preserve public privacy, published rating rules, global ties and bounded pages",
  { skip: !url },
  async () => {
    const target = new URL(url!);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/physcratic_authoring_test");
    assert.equal(target.search, "");
    assert.equal(target.hash, "");
    const namespace = `rankings_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${namespace}`);
    const pool = new Pool({
      connectionString: url,
      options: `-c search_path=${namespace}`,
    });
    const database = drizzle(pool, { schema });
    const getRankings = createRankingsService(database);
    try {
      await pool.query(
        `CREATE TABLE contest (id text PRIMARY KEY, published boolean NOT NULL, rated boolean NOT NULL)`,
      );
      await pool.query(
        `CREATE TABLE contest_rating (id uuid PRIMARY KEY, "userId" text NOT NULL, "contestId" text NOT NULL, "publicHandle" text, rating integer NOT NULL, change integer NOT NULL, "createdAt" timestamptz NOT NULL)`,
      );
      assert.deepEqual(
        (await getRankings({ search: "", page: 1 })).rankings,
        [],
      );
      await pool.query(
        `INSERT INTO contest (id, published, rated) VALUES ('a-published', true, true), ('b-published', true, true), ('draft', false, true), ('unrated', true, false)`,
      );
      const insert = async (
        userId: string,
        handle: string | null,
        rating: number,
        contestId = "a-published",
        date = "2026-11-01T00:00:00Z",
        change = 10,
      ) => {
        await pool.query(
          `INSERT INTO contest_rating (id, "userId", "contestId", "publicHandle", rating, change, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [randomUUID(), userId, contestId, handle, rating, change, date],
        );
      };
      await insert("PRIVATE_NULL_USER_ID", null, 9999);
      await insert("PRIVATE_EMPTY_USER_ID", "", 9998);
      await insert("PRIVATE_WHITESPACE_USER_ID", "   ", 9997);
      await insert("PRIVATE_WITHDRAWN_USER_ID", "withdrawn_handle", 9996);
      await insert(
        "PRIVATE_WITHDRAWN_USER_ID",
        null,
        9996,
        "b-published",
        "2026-11-02T00:00:00Z",
      );
      await insert("PRIVATE_DRAFT_USER_ID", "draft_handle", 9995, "draft");
      await insert(
        "PRIVATE_UNRATED_USER_ID",
        "unrated_handle",
        9994,
        "unrated",
      );
      await insert("PRIVATE_LATEST_USER_ID", "old_handle", 4000);
      await insert(
        "PRIVATE_LATEST_USER_ID",
        "alpha",
        2500,
        "b-published",
        "2026-11-02T00:00:00Z",
        -1500,
      );
      await insert(
        "PRIVATE_LATEST_USER_ID",
        "draft_override",
        9999,
        "draft",
        "2026-11-03T00:00:00Z",
      );
      await insert(
        "PRIVATE_LATEST_USER_ID",
        "unrated_override",
        9999,
        "unrated",
        "2026-11-03T00:00:00Z",
      );
      for (let index = 0; index < 103; index++) {
        await insert(
          `PRIVATE_PUBLIC_USER_ID_${index}`,
          `student_${String(index).padStart(3, "0")}`,
          index < 26 ? 2400 : 2300 - index,
        );
      }
      for (const handle of [
        "percent%handle",
        "slash\\handle",
        "under_score",
        "underXscore",
      ]) {
        await insert(`PRIVATE_LITERAL_USER_ID_${handle}`, handle, 1000);
      }
      await insert(
        "PRIVATE_TIE_TIMESTAMP_USER_ID",
        "tie_older",
        500,
        "a-published",
      );
      await insert(
        "PRIVATE_TIE_TIMESTAMP_USER_ID",
        "tie_latest",
        900,
        "b-published",
      );
      await insert("PRIVATE_DUPLICATE_A", "duplicate_handle", 800);
      await insert("PRIVATE_DUPLICATE_B", "duplicate_handle", 800);

      const first = await getRankings({ search: "", page: 1 });
      const second = await getRankings({ search: "", page: 2 });
      assert.equal(first.rankings.length, RANKINGS_PAGE_SIZE);
      assert.equal(first.pagination.total, 111);
      assert.equal(first.pagination.totalPages, 5);
      assert.deepEqual(first.rankings[0], {
        handle: "alpha",
        rating: 2500,
        change: -1500,
        updatedAt: "2026-11-02T00:00:00.000Z",
        contests: 2,
        rank: 1,
      });
      assert.equal(first.rankings.at(-1)?.rank, 2);
      assert.equal(second.rankings[0].rank, 2);
      assert.equal(second.rankings[1].rank, 2);
      assert.equal(second.rankings[2].rank, 28);
      assert.equal(
        new Set(
          [...first.rankings, ...second.rankings].map((row) => row.handle),
        ).size,
        50,
      );
      assert.deepEqual(await getRankings({ search: "", page: 2 }), second);
      assert.deepEqual(
        await getRankings({ search: "STUDENT_025", page: 500 }),
        {
          rankings: [second.rankings[1]],
          pagination: {
            page: 1,
            pageSize: RANKINGS_PAGE_SIZE,
            total: 1,
            totalPages: 1,
          },
        },
      );
      for (const search of ["%", "\\", "under_score"]) {
        const result = await getRankings({ search, page: 1 });
        assert.equal(result.pagination.total, 1);
        assert.ok(result.rankings[0].handle.includes(search));
      }
      for (const search of [
        "old_handle",
        "withdrawn",
        "draft",
        "unrated",
        "PRIVATE_",
        "' OR 1=1 --",
      ]) {
        assert.equal(
          (await getRankings({ search, page: 1 })).pagination.total,
          0,
          search,
        );
      }
      const tail = await getRankings({ search: "", page: 1000000 });
      assert.equal(tail.pagination.page, 5);
      assert.equal(tail.rankings.length, 11);
      assert.equal(
        (await getRankings({ search: "tie_", page: 1 })).rankings[0].handle,
        "tie_latest",
      );
      assert.equal(
        (await getRankings({ search: "duplicate", page: 1 })).rankings.length,
        2,
      );
      assert.doesNotMatch(
        JSON.stringify([first, second, tail]),
        /PRIVATE_|userId|email|displayName/,
      );
      assert.deepEqual(Object.keys(first.rankings[0]).sort(), [
        "change",
        "contests",
        "handle",
        "rank",
        "rating",
        "updatedAt",
      ]);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${namespace} CASCADE`);
      await admin.end();
    }
  },
);
