import assert from "node:assert/strict";
import test from "node:test";
import {
  contestDraftSchema,
  contestSubmissionSchema,
  contestPhase,
  contestEnd,
  contestScore,
  testContestDraft,
  testContestDurationMinutes,
  formatContestDuration,
} from "./contest-contracts";
import {
  contestProblemOptions,
  contestProblemSnapshot,
} from "./contest-catalog";
import { checkArchivePart } from "./archive-grading";

const start = "2026-11-03T12:00:00.000Z";
test("seven days is a shared 168-hour interval with exclusive close", () => {
  assert.equal(testContestDurationMinutes, 10080);
  assert.equal(
    contestEnd(start, testContestDurationMinutes),
    "2026-11-10T12:00:00.000Z",
  );
  const time = Date.parse(start);
  assert.equal(contestPhase(start, 10080, time - 1), "upcoming");
  assert.equal(contestPhase(start, 10080, time), "live");
  assert.equal(contestPhase(start, 10080, time + 604800000 - 1), "live");
  assert.equal(contestPhase(start, 10080, time + 604800000), "ended");
  assert.equal(formatContestDuration(10080), "7 days");
});
test("drafts reject duplicate IDs, bad schedules, client ratings and invalid limits", () => {
  assert.ok(contestDraftSchema.safeParse(testContestDraft).success);
  for (const change of [
    { problemIds: ["incline", "incline"] },
    { launchOnPublish: false, startsAt: null },
    { durationMinutes: 0 },
    { durationMinutes: 43201 },
    { rated: true },
    { problemIds: [] },
  ])
    assert.equal(
      contestDraftSchema.safeParse({ ...testContestDraft, ...change }).success,
      false,
    );
});
test("best-per-part scores never double count retries or lose earned points", () => {
  const result = (
    partId: string,
    status: "correct" | "incorrect" | "inconclusive",
  ) => ({ partId, status, message: "Test" });
  const score = contestScore([
    { problemId: "a", results: [result("1", "correct")] },
    {
      problemId: "a",
      results: [result("1", "correct"), result("2", "incorrect")],
    },
    {
      problemId: "a",
      results: [result("1", "incorrect"), result("2", "inconclusive")],
    },
    { problemId: "b", results: [result("1", "correct")] },
  ]);
  assert.deepEqual([...score], ["a:1", "b:1"]);
});
test("all proposed test problems exist, have fully checked parts and omit keys from public metadata", () => {
  const options = contestProblemOptions();
  for (const id of testContestDraft.problemIds) {
    assert.ok(options.some((item) => item.id === id));
    const snapshot = contestProblemSnapshot(id)!;
    assert.ok(snapshot.statement);
    assert.equal(snapshot.version.length, 64);
    assert.ok(
      snapshot.definition.parts.every((part) => part.kind !== "self-review"),
    );
    assert.ok(
      snapshot.metadata.parts.every(
        (part) =>
          !("canonical" in part) &&
          !("target" in part) &&
          !("solution" in part),
      ),
    );
  }
  const part = contestProblemSnapshot("incline")!.definition.parts[0];
  assert.equal(checkArchivePart(part, "4.9").status, "correct");
  assert.equal(checkArchivePart(part, "100").status, "incorrect");
});
test("submission contract rejects client-supplied score and unbounded answers", () => {
  const input = {
    problemId: "incline",
    version: "a".repeat(64),
    idempotencyKey: "12345678-1234-4234-8234-123456789012",
    answers: [{ partId: "answer", latex: "4.9" }],
  };
  assert.ok(contestSubmissionSchema.safeParse(input).success);
  assert.equal(
    contestSubmissionSchema.safeParse({ ...input, score: 1 }).success,
    false,
  );
  assert.equal(
    contestSubmissionSchema.safeParse({
      ...input,
      answers: [{ partId: "answer", latex: "x".repeat(1025) }],
    }).success,
    false,
  );
});
