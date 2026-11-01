import assert from "node:assert/strict";
import test from "node:test";
import { assessPracticeGrade, markingRubricSchema, solutionSubmissionSchema, submissionLimits } from "./solution-grading";

const id = "11111111-1111-4111-8111-111111111111";
const sourceSha256 = "a".repeat(64);
const submission = { problemId: "ipho-2025-t1", problemVersion: sourceSha256, partId: "A.1", working: "Use Coulomb force as the centripetal force: F = m v^2 / r.", finalAnswer: "sqrt(e^2/(4*pi*eps0*m*r))", evidence: [], idempotencyKey: id };
const rubric = { id, problemId: submission.problemId, partId: submission.partId, version: 1, sourceSha256, maxPoints: 0.2, status: "approved", reviewedBy: "independent-reviewer", criteria: [{ id: "force-balance", description: "Correct force balance", maxPoints: 0.1, sourceReference: "Official marking scheme A.1", acceptsEquivalentMethods: true, errorCarryForward: "allowed" }, { id: "result", description: "Correct final expression", maxPoints: 0.1, sourceReference: "Official marking scheme A.1", acceptsEquivalentMethods: true, errorCarryForward: "not-applicable" }] };
const assessments = [{ criterionId: "force-balance", proposedPoints: 0.1, evidenceQuote: "F = m v^2 / r", feedback: "Correct radial force balance.", uncertain: false }, { criterionId: "result", proposedPoints: 0.1, evidenceQuote: submission.finalAnswer, feedback: "The final expression follows the force balance.", uncertain: false }];

test("typed reasoning and LaTeX submissions require no attachment", () => {
  assert.ok(solutionSubmissionSchema.safeParse({ ...submission, working: "$$F = m v^2 / r$$" }).success);
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, working: "", finalAnswer: "" }).success, false);
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, working: "x".repeat(submissionLimits.maxText + 1) }).success, false);
});

test("handwriting requires student-confirmed transcription", () => {
  const evidence = [{ id, mediaType: "image/jpeg", bytes: 1000, sha256: sourceSha256 }];
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, evidence }).success, false);
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, evidence, transcription: { text: "F = m v^2 / r", confirmed: false } }).success, false);
  assert.ok(solutionSubmissionSchema.safeParse({ ...submission, evidence, transcription: { text: "F = m v^2 / r", confirmed: true } }).success);
});

test("attachment validation rejects unsupported types, oversized totals, duplicate IDs and client user identities", () => {
  const evidence = { id, mediaType: "application/pdf", bytes: submissionLimits.maxFileBytes, sha256: sourceSha256 };
  const transcription = { text: "confirmed equations", confirmed: true };
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, userId: "someone-else" }).success, false);
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, evidence: [{ ...evidence, mediaType: "image/svg+xml" }], transcription }).success, false);
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, evidence: [evidence, evidence], transcription }).success, false);
  assert.equal(solutionSubmissionSchema.safeParse({ ...submission, evidence: [1, 2, 3].map((n) => ({ ...evidence, id: `${n}${id.slice(1)}` })), transcription }).success, false);
});

test("rubric criteria must total the official marks and require an approval reviewer", () => {
  assert.ok(markingRubricSchema.safeParse(rubric).success);
  assert.equal(markingRubricSchema.safeParse({ ...rubric, maxPoints: 1 }).success, false);
  assert.equal(markingRubricSchema.safeParse({ ...rubric, maxPoints: Infinity }).success, false);
  assert.equal(markingRubricSchema.safeParse({ ...rubric, reviewedBy: null }).success, false);
  assert.equal(markingRubricSchema.safeParse({ ...rubric, criteria: [rubric.criteria[0], rubric.criteria[0]] }).success, false);
});

test("AI assessments are provisional, not awarded marks or ELO", () => {
  const result = assessPracticeGrade(rubric, assessments, submission);
  assert.equal(result.proposedPoints, 0.2);
  assert.equal(result.awardedPoints, null);
  assert.equal(result.status, "provisional");
  assert.equal(result.rated, false);
  assert.equal(result.eloDelta, 0);
  assert.equal(assessPracticeGrade(rubric, assessments.map((item) => ({ ...item, uncertain: true })), submission).status, "needs-review");
});

test("grading rejects draft rubrics, stale sources, duplicate, missing, over-scored and fabricated assessments", () => {
  assert.throws(() => assessPracticeGrade({ ...rubric, status: "draft" }, assessments, submission), /Unapproved/);
  assert.throws(() => assessPracticeGrade(rubric, assessments, { ...submission, problemVersion: "b".repeat(64) }), /same problem/);
  assert.throws(() => assessPracticeGrade(rubric, assessments, { ...submission, partId: "A.2" }), /same problem/);
  assert.throws(() => assessPracticeGrade(rubric, [assessments[0]], submission), /exactly once/);
  assert.throws(() => assessPracticeGrade(rubric, [assessments[0], assessments[0]], submission), /exactly once/);
  assert.throws(() => assessPracticeGrade(rubric, [{ ...assessments[0], proposedPoints: 1 }, assessments[1]], submission), /over-scored/);
  assert.throws(() => assessPracticeGrade(rubric, [{ ...assessments[0], criterionId: "made-up" }, assessments[1]], submission), /Unknown/);
  assert.throws(() => assessPracticeGrade(rubric, [{ ...assessments[0], evidenceQuote: "not in the student's work" }, assessments[1]], submission), /exact evidence/);
});
