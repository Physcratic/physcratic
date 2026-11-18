/** Immutable revision policy. Exposure flags never change historical evidence. */
export const legacySolutionPolicy = "legacy-private-v1" as const;
export const publicSolutionPolicy = "public-solutions-v1" as const;
export const publicSolutionEvidence = "public-access-unverifiable-v1" as const;
export function publicSolutionsEnabled(env: Record<string, string | undefined> = process.env) {
  return env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED === "true";
}
export function storedSolutionPolicy(row: { solution_policy?: unknown; solution_consented_at?: unknown; solution_policy_present?: unknown }) {
  const policy = row.solution_policy;
  const consent = row.solution_consented_at;
  // Missing fields are the pre-migration schema, not implicit public consent.
  if ((policy === legacySolutionPolicy || policy === undefined || (row.solution_policy_present === false && policy === null)) && consent == null)
    return legacySolutionPolicy;
  if (policy === publicSolutionPolicy && (typeof consent === "string" || consent instanceof Date) && Number.isFinite(new Date(consent).getTime()))
    return publicSolutionPolicy;
  throw Error("Invalid stored solution policy");
}
/** Fixed SQL fragments for internal aliases; JSON extraction works before migration0020. */
export const revisionSolutionColumns = `to_jsonb(r)->>'solution_policy' AS solution_policy,to_jsonb(r)->>'solution_consented_at' AS solution_consented_at,to_jsonb(r) ? 'solution_policy' AS solution_policy_present`;
export const legacyRevisionPredicate = `((NOT (to_jsonb(r) ? 'solution_policy') AND NOT (to_jsonb(r) ? 'solution_consented_at')) OR (to_jsonb(r)->>'solution_policy'='legacy-private-v1' AND to_jsonb(r)->>'solution_consented_at' IS NULL))`;
