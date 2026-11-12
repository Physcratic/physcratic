import "server-only";
import type { BetterAuthOptions } from "better-auth";
import type { Pool } from "pg";
import { signupPolicy } from "@/lib/signup-policy";
import { signupCaptcha } from "@/lib/signup-captcha";
import { authoringStagingAuth } from "@/lib/authoring-staging";
import { accountEmailOptions, accountSecurity, type Defer } from "@/lib/auth-account";
import { assertAccountCanSignIn } from "@/lib/community/account-restriction";

// One place for the auth settings, so the database tests run the same flows and limits as the app.
export function createAuthOptions({ pool, defer, overrides = {} }: { pool: Pool; defer: Defer; overrides?: Partial<BetterAuthOptions> }) {
  const stagingAuth = authoringStagingAuth();
  const emails = accountEmailOptions({ pool, defer });
  return {
    database: pool,
    plugins: [signupCaptcha(), accountSecurity({ pool })],
    ...signupPolicy,
    databaseHooks: {
      ...signupPolicy.databaseHooks,
      session: { create: { before: async session => {
        await assertAccountCanSignIn(pool, session.userId);
        return { data: session };
      } } },
    },
    user: {
      ...signupPolicy.user,
      // Strict mode: the current address approves, then the new address verifies. Only then does the email switch.
      changeEmail: { enabled: true, updateEmailWithoutVerification: false, sendChangeEmailConfirmation: emails.sendChangeEmailConfirmation },
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
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: emails.sendResetPassword,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: emails.sendVerificationEmail,
    },
    rateLimit: {
      enabled: true,
      // Deploy only after the reviewed rateLimit table and runtime grants exist.
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
        "/change-email": { window: 60, max: 3 },
        "/change-password": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
        "/verify-email": { window: 60, max: 10 },
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
    ...overrides,
  } satisfies BetterAuthOptions;
}
