import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SWRConfig } from "swr";
import { Rankings } from "../components/physics/rankings";
import type { RankingsResponse } from "../lib/rankings";

// The rendering runner uses the classic JSX transform for dashboard components.
Object.assign(globalThis, { React });

function render(data: RankingsResponse, search = "") {
  const key = `/api/rankings?${new URLSearchParams({ search, page: "1" })}`;
  return renderToStaticMarkup(
    createElement(
      SWRConfig,
      {
        value: {
          provider: () => new Map(),
          fallback: { [key]: data },
          revalidateOnMount: false,
        },
      },
      createElement(Rankings, { search, onSearchChange: () => {} }),
    ),
  );
}

test("leaderboard renders server ranks, tie ranks and accessible page controls", () => {
  const html = render({
    rankings: [
      {
        handle: "<script>public</script>",
        rating: 1800,
        rank: 27,
        change: 10,
        contests: 3,
        updatedAt: "2026-11-03T00:00:00Z",
      },
      {
        handle: "other",
        rating: 1800,
        rank: 27,
        change: -5,
        contests: 2,
        updatedAt: "2026-11-03T00:00:00Z",
      },
    ],
    pagination: { page: 1, pageSize: 25, total: 51, totalPages: 3 },
  });
  assert.equal((html.match(/#27/g) ?? []).length, 2);
  assert.match(html, /Showing 1 to 25 of 51 contestants/);
  assert.match(html, /Page 1 of 3/);
  assert.match(html, /aria-label="Rankings pages"/);
  assert.match(html, /disabled=""[^>]*>Previous/);
  assert.match(html, /Ranks stay the same when searching/);
  assert.match(html, /&lt;script&gt;public&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|Top 100|#1<|#2</);
});

test("leaderboard distinguishes empty results from no matching handles", () => {
  const data = {
    rankings: [],
    pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
  };
  const empty = render(data);
  assert.match(empty, /No rated results yet/);
  assert.doesNotMatch(empty, /Rankings pages|Clear search/);
  const filtered = render(data, "nonexistent");
  assert.match(filtered, /No matching contestants/);
  assert.match(filtered, /Clear search/);
  assert.doesNotMatch(filtered, /Rankings pages|No rated results yet/);
});
