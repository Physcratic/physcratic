/**
 * Stable machine codes for the authoring schema's own issues.
 *
 * lib/problem-authoring.ts is pinned by scripts/public-solutions-release/PACKAGE_SHA256SUMS, so its issues carry
 * only a message. This map gives each of those exact messages a code. The schema stays the only source of the
 * rules. A code is never renamed or reused. A message that is not in the map reads as "unknown".
 * lib/problem-authoring-codes.test.ts fails when a message in the pinned file changes without this map.
 */

/** The rules only Publish checks, from publishableDraftSchema. */
export const PUBLISH_RULE_CODES = {
  "Title and rights provenance required": "missing-title-or-rights",
  "Add a statement and at least one part. Use text, statement images or a statement PDF.": "missing-statement",
  "Every image requires descriptive alternative text before publication": "image-needs-alt",
  "Every published part requires a key or explicit manual mode": "part-needs-key",
  "Add a difficulty rating from 0 to 4,000.": "missing-difficulty",
} as const;

/** The custom rules every saved draft is held to, from authoredDraftSchema and the schemas inside it. They block Publish too. */
export const DRAFT_RULE_CODES = {
  "Duplicate tags": "duplicate-tag",
  "Duplicate section, part or block ID": "duplicate-id",
  "Duplicate media reference": "duplicate-media",
  "Image requires statement-image reference": "image-needs-media",
  "Document exceeds total size limit": "document-too-large",
  "Reserved variable": "reserved-variable",
  "Reversed variable bounds": "reversed-variable-bounds",
  "Empty variable domain": "empty-variable-domain",
  "Duplicate variables": "duplicate-variable",
  "Missing, duplicate or mismatched private part": "mismatched-private-part",
  "Duplicate private block ID": "duplicate-private-id",
  "Draft exceeds total size limit": "draft-too-large",
} as const;

export const ISSUE_CODES = { ...PUBLISH_RULE_CODES, ...DRAFT_RULE_CODES } as const;
export type PublishRuleCode = (typeof PUBLISH_RULE_CODES)[keyof typeof PUBLISH_RULE_CODES];
export type IssueCode = (typeof ISSUE_CODES)[keyof typeof ISSUE_CODES] | "unknown";

const byMessage: ReadonlyMap<string, IssueCode> = new Map(Object.entries(ISSUE_CODES));
/** The stable code of a schema issue, or "unknown" for a message the map does not hold, such as a built-in zod length check. */
export function codeOfIssue(issue: { readonly message: string }): IssueCode {
  return byMessage.get(issue.message) ?? "unknown";
}
