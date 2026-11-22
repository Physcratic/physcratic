import "server-only";
import { PROFILE_PUBLICATION_POLICY_VERSION } from "./profile-contracts";

// Alias names come only from static SQL in the server callers.
export function publicProfileEligible(profile: "cp" | "p" | "pp") {
  return `(${profile}.deactivated_at IS NULL
    AND ${profile}.publication_recorded_at IS NOT NULL
    AND ${profile}.publication_policy_version='${PROFILE_PUBLICATION_POLICY_VERSION}'
    AND EXISTS (
      SELECT 1 FROM "user" profile_account
      WHERE profile_account.id=${profile}.user_id AND profile_account."emailVerified" IS TRUE
        AND (${profile}.publication_basis='legacy_acknowledgement'
          OR (${profile}.publication_basis='signup'
            AND profile_account."profileSignupHandle"=${profile}.handle
            AND profile_account."profileSignupPolicyVersion"=${profile}.publication_policy_version))
    ))`;
}

export function publicProfileDisplayName(profile: "cp" | "pp") {
  return `CASE WHEN ${profile}.display_name ~ '[^[:space:]]' THEN ${profile}.display_name ELSE ${profile}.handle END`;
}
