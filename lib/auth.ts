import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { after } from "next/server";
import { pool } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/verification-email";
import { getTermsAcceptance } from "@/lib/terms";
import { authoringStagingAuth } from "@/lib/authoring-staging";

const stagingAuth = authoringStagingAuth();

export const auth = betterAuth({
  database: pool,
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
  baseURL:
    stagingAuth?.baseURL ??
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url, token }) => {
      // Keep delivery alive after the response without leaking account existence through send timing.
      after(async () => {
        try {
          await sendVerificationEmail({ email: user.email, url, token });
        } catch (error) {
          console.error("Verification email delivery failed", error instanceof Error ? error.message : "Unknown delivery error");
        }
      });
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  trustedOrigins: stagingAuth?.trustedOrigins ?? [
    ...(process.env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.NODE_ENV === "production"
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
        ]
      : []),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // The cross-site v0 preview requires secure SameSite=None cookies.
          defaultCookieAttributes: { sameSite: "none" as const, secure: true },
        },
      }
    : {}),
});
