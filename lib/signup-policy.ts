import { APIError, createAuthMiddleware } from "better-auth/api";
import type { BetterAuthOptions } from "better-auth";
import { z } from "zod";
import { PROFILE_PUBLICATION_POLICY_VERSION, profileHandleSchema } from "./community/profile-contracts";
import { getTermsAcceptance } from "./terms";

const profileSignupInput = z.object({
  username: profileHandleSchema,
  profileDisclosureVersion: z.literal(PROFILE_PUBLICATION_POLICY_VERSION),
});

function profileSignupClaim(body: unknown) {
  const parsed = profileSignupInput.safeParse(body);
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", {
      code: "PROFILE_SIGNUP_REQUIRED",
      message: "Choose a valid username and review the current public profile notice.",
    });
  }
  return {
    profileSignupHandle: parsed.data.username,
    profileSignupPolicyVersion: PROFILE_PUBLICATION_POLICY_VERSION,
  };
}

function requireTerms(body: unknown) {
  try {
    return getTermsAcceptance(body);
  } catch {
    throw new APIError("BAD_REQUEST", { code: "TERMS_ACCEPTANCE_REQUIRED", message: "Accept the current Terms of Service before creating an account." });
  }
}

export function createSignupPolicy(profileSignupEnabled = false) {
  return {
    user: {
      additionalFields: {
        termsAcceptedVersion: { type: "string", required: false, input: false },
        termsAcceptedAt: { type: "date", required: false, input: false },
        ...(profileSignupEnabled ? {
          profileSignupHandle: { type: "string", required: false, input: false, returned: false },
          profileSignupPolicyVersion: { type: "string", required: false, input: false, returned: false },
        } : {}),
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        requireTerms(ctx.body);
        if (profileSignupEnabled) profileSignupClaim(ctx.body);
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            const terms = requireTerms(ctx?.body);
            const claim = profileSignupEnabled && ctx?.path === "/sign-up/email"
              ? profileSignupClaim(ctx.body) : undefined;
            return { data: { ...user, ...terms, ...claim } };
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
}

export const signupPolicy = createSignupPolicy();
