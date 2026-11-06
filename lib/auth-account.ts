import "server-only";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import type { Pool } from "pg";
import { z } from "zod";
import { normalizeAddress, reserveAuthEmail } from "./auth-email-budget";
import { authEmailReady } from "./auth-email-transport";
import { EMAIL_NOT_READY_MESSAGE } from "./account-messages";
import { sendChangeEmailApproval, sendChangeEmailVerify, sendPasswordResetEmail, sendVerificationEmail } from "./verification-email";

export type Defer = (task: () => Promise<void>) => void;

// Same body Better Auth returns, so a full budget looks exactly like a normal request.
export const RESET_REPLY = { status: true, message: "If this email exists in our system, check your email for the reset link" } as const;
export const EMAIL_CHANGE_PATHS = { approved: "/email-change?step=approved", done: "/email-change?step=done", signedOut: "/email-change?step=signed-out" } as const;

const fail = (status: "BAD_REQUEST" | "UNAUTHORIZED" | "TOO_MANY_REQUESTS", code: string, message: string) =>
  new APIError(status, { code, message });

/** Reads the unsigned claims of a token Better Auth just signed. Only used to pick a template. */
export function tokenRequestType(token: string) {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof claims?.requestType === "string" ? claims.requestType : undefined;
  } catch { return undefined; }
}

export function withCallback(url: string, callback: string) {
  const link = new URL(url);
  link.searchParams.set("callbackURL", callback);
  return link.toString();
}

function quietly(defer: Defer, label: string, task: () => Promise<void>) {
  defer(async () => {
    try { await task(); }
    catch (error) { console.error(`${label} failed`, error instanceof Error ? error.message : "Unknown delivery error"); }
  });
}

async function hasPassword(pool: Pool, userId: string) {
  const { rowCount } = await pool.query(`SELECT 1 FROM "account" WHERE "userId"=$1 AND "providerId"='credential' AND "password" IS NOT NULL LIMIT 1`, [userId]);
  return Boolean(rowCount);
}

/** Better Auth callbacks for the verification, reset and change-email messages. */
export function accountEmailOptions({ pool, defer }: { pool: Pool; defer: Defer }) {
  return {
    sendVerificationEmail: async ({ user, url, token }: { user: { email: string }; url: string; token: string }) => {
      // Keep delivery alive after the response without leaking account existence through send timing.
      if (tokenRequestType(token) === "change-email-verification") {
        quietly(defer, "Email change verification", async () => {
          // Each click on the approval link sends another one, so this step has its own per-address cap.
          if (!(await reserveAuthEmail(pool, user.email, "change-verify"))) { console.warn("Email change verification skipped, address budget used"); return; }
          await sendChangeEmailVerify({ newEmail: user.email, url: withCallback(url, EMAIL_CHANGE_PATHS.done), token });
        });
        return;
      }
      quietly(defer, "Verification email delivery", () => sendVerificationEmail({ email: user.email, url, token }));
    },
    sendResetPassword: async ({ user, url, token }: { user: { id: string; email: string }; url: string; token: string }) => {
      quietly(defer, "Password reset email", async () => {
        await sendPasswordResetEmail({ email: user.email, url, token, setPassword: !(await hasPassword(pool, user.id)) });
      });
    },
    sendChangeEmailConfirmation: async ({ user, newEmail, url, token }: { user: { email: string }; newEmail: string; url: string; token: string }) => {
      quietly(defer, "Email change approval", () =>
        sendChangeEmailApproval({ email: user.email, newEmail, url: withCallback(url, EMAIL_CHANGE_PATHS.approved), token }));
    },
  };
}

// Same answer for every address and account, so it reveals nothing about who has an account.
const emailNotReady = () => fail("BAD_REQUEST", "EMAIL_NOT_CONFIGURED", EMAIL_NOT_READY_MESSAGE);

/** Request checks that Better Auth does not do on its own. */
export function accountSecurity({ pool, emailReady = () => authEmailReady() }: { pool: Pool; emailReady?: () => boolean }) {
  return {
    id: "account-security",
    hooks: {
      before: [
        {
          // One name: the community display name. The account name is never edited after sign-up.
          matcher: (ctx) => ctx.path === "/update-user",
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.body && typeof ctx.body === "object" && "name" in ctx.body)
              throw fail("BAD_REQUEST", "NAME_CHANGE_NOT_ALLOWED", "Change your display name in Settings, under Profile.");
          }),
        },
        {
          matcher: (ctx) => ctx.path === "/request-password-reset",
          handler: createAuthMiddleware(async (ctx) => {
            if (!emailReady()) throw emailNotReady();
            const email = (ctx.body as { email?: unknown } | undefined)?.email;
            if (typeof email !== "string" || !z.email().safeParse(email).success) return;
            // Counted whether or not the address has an account, so the cap reveals nothing.
            if (!(await reserveAuthEmail(pool, email, "reset"))) return ctx.json(RESET_REPLY);
          }),
        },
        {
          matcher: (ctx) => ctx.path === "/change-email",
          handler: createAuthMiddleware(async (ctx) => {
            const session = await getSessionFromCtx(ctx);
            if (!session) throw fail("UNAUTHORIZED", "UNAUTHORIZED", "Sign in again, then try that.");
            if (!emailReady()) throw emailNotReady();
            const body = (ctx.body ?? {}) as { currentPassword?: unknown; newEmail?: unknown };
            const password = body.currentPassword;
            if (typeof password !== "string" || !password)
              throw fail("BAD_REQUEST", "CURRENT_PASSWORD_REQUIRED", "Enter your current password first.");
            const account = await ctx.context.internalAdapter.findCredentialAccount(session.user.id);
            if (!account?.password)
              throw fail("BAD_REQUEST", "PASSWORD_NOT_SET", "Set a password first. Then you can change your email.");
            if (password.length > 128 || !(await ctx.context.password.verify({ hash: account.password, password })))
              throw fail("BAD_REQUEST", "INVALID_PASSWORD", "That password didn't match. Try again or reset it.");
            if (typeof body.newEmail !== "string" || normalizeAddress(body.newEmail) === normalizeAddress(session.user.email)) return;
            if (!(await reserveAuthEmail(pool, session.user.email, "change-approval")))
              throw fail("TOO_MANY_REQUESTS", "EMAIL_BUDGET", "That's a lot of emails for one hour. Try again later.");
          }),
        },
      ],
      after: [
        {
          // Better Auth signs in whoever opens the final change-email link. It has no option to turn that off,
          // so a session it just made for a browser that was not signed in is revoked and its cookie cleared.
          matcher: (ctx) => ctx.path === "/verify-email",
          handler: createAuthMiddleware(async (ctx) => {
            const created = ctx.context.newSession;
            if (!created) return;
            const held = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
            if (held === created.session.token) return;
            await ctx.context.internalAdapter.deleteSession(created.session.token);
            ctx.context.responseHeaders?.delete("set-cookie");
            deleteSessionCookie(ctx);
            if (ctx.query?.callbackURL) throw ctx.redirect(EMAIL_CHANGE_PATHS.signedOut);
            return ctx.json({ status: true, user: null });
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
