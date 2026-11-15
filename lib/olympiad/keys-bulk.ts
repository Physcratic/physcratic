import "server-only";
import tasks from "./bulk-tasks.json";
import { review, type ArchiveKeyPart } from "../archive-grading/definitions";

/** Editable responses without invented grading keys. Existing verified checks remain separate. */
export const bulkParts: Record<string, ArchiveKeyPart[]> = Object.fromEntries(Object.entries(tasks).map(([id, questions]) => [id, questions.map((question, index) => ({
  ...review("q" + (index + 1), "Your answer", "Use the symbols and units in this part. Compare your response with the worked solution. Automatic grading is not configured for this response."),
  sourcePart: question.sourcePart,
  responseFormat: question.responseFormat as "math" | "text",
}))]));
