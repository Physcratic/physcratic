/**
 * The five steps of the Simple editor. Pure, so the grouping is tested without a browser.
 * Each Simple field is shown in exactly one step. A blocker opens the step its field is in.
 */
import type { EditorDraft } from "@/lib/problem-authoring-editor";
import { PUBLISH_STEPS, blockerField, publishBlockers, type PublishBlocker, type PublishStep } from "./publish-blockers";

export const STUDIO_STEPS = PUBLISH_STEPS;
export type StudioStep = PublishStep;
export const STEP_NAMES: Record<StudioStep, string> = {
  question: "Question",
  answer: "Answer",
  "worked-solution": "Worked solution",
  details: "Details",
  review: "Review",
};

/** The steps of the fields of a part. The part's More options is whole in Answer for now. */
const PART_FIELD_STEP: Record<string, StudioStep> = {
  question: "question",
  picture: "question",
  answer: "answer",
  units: "answer",
  options: "answer",
  solution: "worked-solution",
};
/** The fields of the whole problem. */
const PROBLEM_FIELD_STEP: Record<string, StudioStep> = {
  parts: "question",
  statement: "question",
  "picture:main": "question",
  title: "details",
  source: "details",
  rights: "details",
  difficulty: "details",
  topics: "details",
  "options:problem": "details",
  review: "review",
};

/** The step a Simple field is shown in, in the form simpleIssues and blockerField use. Null for a field Simple does not have. */
export function fieldStep(field: string): StudioStep | null {
  if (field in PROBLEM_FIELD_STEP) return PROBLEM_FIELD_STEP[field];
  const [kind, id] = field.split(":");
  return id && kind in PART_FIELD_STEP ? PART_FIELD_STEP[kind] : null;
}

/** The step to open and the field to focus for one blocker. */
export function blockerJump(b: PublishBlocker, d: EditorDraft): { step: StudioStep; field: string } {
  const field = blockerField(b, d);
  return { step: fieldStep(field) ?? b.step, field };
}

/** The bar's words for how much is left. */
export const barText = (count: number) => (count === 0 ? "Ready to publish" : count === 1 ? "1 thing left" : `${count} things left`);

/** Everything the rail and the bar show, from the server's own rules. */
export function stepSummary(d: EditorDraft) {
  const blockers = publishBlockers(d);
  const counts = Object.fromEntries(STUDIO_STEPS.map((s) => [s, 0])) as Record<StudioStep, number>;
  for (const b of blockers) counts[b.step]++;
  return { blockers, counts, text: barText(blockers.length) };
}
