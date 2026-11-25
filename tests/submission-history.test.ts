import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SWRConfig } from "swr";
import { initialHistoryForAccount } from "../lib/submission-history-types";
import { SubmissionHistory } from "../components/physics/submission-history";
import type { SubmissionHistoryData } from "../lib/submission-history-types";
(globalThis as { React?: unknown }).React = React;
const initialData: SubmissionHistoryData = { attempts: [{ id: "test-attempt", title: "PRIVATE TEST TITLE", problemId: "ipho-2025-t1", partId: "a", status: "awaiting-reference", createdAt: "2026-11-21T00:00:00Z", payload: { problemId: "ipho-2025-t1", problemVersion: "a".repeat(64), partId: "a", working: "PRIVATE TEST WORKING", finalAnswer: "", evidence: [], idempotencyKey: "00000000-0000-4000-8000-000000000001" }, check: null, ratingEvent: null }] };
test("fresh server data is available only to its verified owner", () => {
  assert.equal(initialHistoryForAccount("owner", "owner", initialData), initialData);
  for (const account of ["other", undefined]) assert.equal(initialHistoryForAccount(account, "owner", initialData), undefined);
  assert.equal(initialHistoryForAccount(undefined, undefined, initialData), undefined);
});
test("private server data remains hidden while the client session is unresolved", () => {
  const html = renderToStaticMarkup(React.createElement(SWRConfig, { value: { provider: () => new Map() } }, React.createElement<NonNullable<React.ComponentProps<typeof SubmissionHistory>>>(SubmissionHistory, { accountId: "owner", initialData })));
  assert.doesNotMatch(html, /PRIVATE TEST TITLE|PRIVATE TEST WORKING/);
});
