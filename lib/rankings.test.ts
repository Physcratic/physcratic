import assert from "node:assert/strict";
import test from "node:test";
import {
  parseRankingsQuery,
  rankingsPagination,
  RANKINGS_PAGE_SIZE,
  RANKINGS_SEARCH_MAX_LENGTH,
} from "./rankings";

test("rankings queries default to the first page and preserve literal handle searches", () => {
  assert.deepEqual(parseRankingsQuery(new URLSearchParams()), {
    search: "",
    page: 1,
  });
  for (const search of ["Mixed_CASE", "%", "_", "\\", "' OR 1=1 --", "物理"]) {
    assert.deepEqual(
      parseRankingsQuery(
        new URLSearchParams({ search: ` ${search} `, page: "3" }),
      ),
      { search, page: 3 },
    );
  }
});

test("rankings queries reject invalid or unbounded pages and oversized searches", () => {
  for (const page of [
    "",
    "0",
    "-1",
    "1.5",
    "1e3",
    "Infinity",
    "NaN",
    "1000001",
    "9007199254740993",
    " 1",
    "01",
  ]) {
    assert.equal(parseRankingsQuery(new URLSearchParams({ page })), null, page);
  }
  assert.equal(
    parseRankingsQuery(
      new URLSearchParams({
        search: "x".repeat(RANKINGS_SEARCH_MAX_LENGTH + 1),
      }),
    ),
    null,
  );
  assert.ok(
    parseRankingsQuery(
      new URLSearchParams({
        search: "x".repeat(RANKINGS_SEARCH_MAX_LENGTH),
        page: "1000000",
      }),
    ),
  );
});

test("rankings pagination clamps stale pages and never creates unbounded page sizes", () => {
  assert.deepEqual(rankingsPagination(1, 0), {
    page: 1,
    pageSize: RANKINGS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  assert.deepEqual(rankingsPagination(100, 51), {
    page: 3,
    pageSize: RANKINGS_PAGE_SIZE,
    total: 51,
    totalPages: 3,
  });
  assert.equal(rankingsPagination(2, 50).totalPages, 2);
  assert.equal(rankingsPagination(2, 25).page, 1);
});
