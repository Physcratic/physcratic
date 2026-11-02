import { APIError, createAuthMiddleware } from "better-auth/api";
import { getTermsAcceptance } from "./terms";
import type { BetterAuthOptions } from "better-auth";

export const signupPolicy = {
  user: {
    additionalFields: {
      termsAcceptedVersion: { type: "string", required: false, input: false },
      termsAcceptedAt: { type: "date", required: false, input: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      try {
        getTermsAcceptance(ctx.body);
      } catch {
        throw new APIError("BAD_REQUEST", { code: "TERMS_ACCEPTANCE_REQUIRED", message: "Accept the current Terms of Service before creating an account." });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          try {
            return { data: { ...user, ...getTermsAcceptance(ctx?.body) } };
          } catch {
            throw new APIError("BAD_REQUEST", { code: "TERMS_ACCEPTANCE_REQUIRED", message: "Accept the current Terms of Service before creating an account." });
          }
        },
      },
    },
  },
} satisfies BetterAuthOptions;
