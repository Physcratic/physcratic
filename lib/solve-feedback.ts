import type { ArchivePartResult } from "./archive-grading-contracts";

/**
 * Words and tone for the result of checking an answer. Only statuses the grader really returns are used,
 * so there is no "Partly correct" for the archive checker, which has no partial status.
 */
export type FeedbackTone = "success" | "error" | "warning" | "neutral";
export type FeedbackStatus = ArchivePartResult["status"];

const partLabels: Record<FeedbackStatus, { tone: FeedbackTone; label: string }> = {
  correct: { tone: "success", label: "Correct" },
  incorrect: { tone: "error", label: "Not correct" },
  invalid: { tone: "warning", label: "Could not read this answer" },
  inconclusive: { tone: "warning", label: "Could not be decided" },
  "self-review": { tone: "neutral", label: "Check this one yourself" },
  unanswered: { tone: "neutral", label: "Not answered" },
};

export function describePartResult(status: FeedbackStatus) {
  return partLabels[status];
}

export type CheckSummary = {
  tone: FeedbackTone;
  headline: string;
  detail: string;
  /** Every part is correct. This is the same test the answer panel already uses to reveal the solution. */
  allCorrect: boolean;
  /** At least one part was answered and was not correct, so "Try again" and "See hint" make sense. */
  needsAnotherTry: boolean;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function checkSummary(results: readonly ArchivePartResult[], saved: boolean): CheckSummary {
  const count = (...statuses: FeedbackStatus[]) => results.filter((item) => statuses.includes(item.status)).length;
  const correct = count("correct");
  const wrong = count("incorrect", "invalid", "inconclusive");
  const unanswered = count("unanswered");
  const review = count("self-review");
  const allCorrect = results.length > 0 && correct === results.length;
  const rest = [unanswered > 0 ? `${plural(unanswered, "part")} not answered` : "", review > 0 ? `${plural(review, "part")} to check yourself` : ""].filter(Boolean).join(", ");
  const detail = `${correct} correct, ${wrong} to revisit${rest ? `, ${rest}` : ""}. ${saved ? "Saved to your account." : "Nothing is saved."}`;
  if (allCorrect) return { tone: "success", headline: "Correct", detail, allCorrect, needsAnotherTry: false };
  if (wrong === 0 && correct > 0) return { tone: "success", headline: "Correct so far", detail, allCorrect, needsAnotherTry: false };
  if (wrong === 0) return { tone: "neutral", headline: "Nothing to check yet", detail, allCorrect, needsAnotherTry: false };
  return { tone: correct > 0 ? "warning" : "error", headline: correct > 0 ? `${plural(correct, "part")} correct, ${plural(wrong, "part")} to revisit` : "Not correct yet", detail, allCorrect, needsAnotherTry: true };
}

/** Stateless callers retain their existing feedback contract. */
export function summariseCheck(results: readonly ArchivePartResult[]): CheckSummary {
  return checkSummary(results, false);
}
/** Use only for an answer snapshot confirmed by a durable server receipt. */
export function summariseSavedCheck(results: readonly ArchivePartResult[]): CheckSummary {
  return checkSummary(results, true);
}
