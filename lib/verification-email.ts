import "server-only";
import { createHash } from "node:crypto";
import { verificationRecipient } from "./authoring-staging";
import { deliverAuthEmail } from "./auth-email-transport";
import {
  changeEmailApprovalEmail, changeEmailVerifyEmail, passwordResetEmail, signupVerificationEmail, type AuthEmailContent,
} from "./auth-email-templates";

const key = (kind: string, token: string) => `${kind}/${createHash("sha256").update(token).digest("hex")}`;

async function send(email: string, url: string, content: AuthEmailContent, idempotencyKey: string) {
  await deliverAuthEmail({ ...content, to: verificationRecipient(email, url), idempotencyKey });
}

export async function sendVerificationEmail({ email, url, token }: { email: string; url: string; token: string }) {
  await send(email, url, signupVerificationEmail({ url }), key("verify-email", token));
}

export async function sendPasswordResetEmail({ email, url, token, setPassword }: { email: string; url: string; token: string; setPassword: boolean }) {
  await send(email, url, passwordResetEmail({ url, setPassword }), key("reset-password", token));
}

/** Goes to the current address. It must approve before the new address gets its link. */
export async function sendChangeEmailApproval({ email, newEmail, url, token }: { email: string; newEmail: string; url: string; token: string }) {
  const resetUrl = new URL("/forgot-password", url).toString();
  await send(email, url, changeEmailApprovalEmail({ newEmail, url, resetUrl }), key("change-email-approval", token));
}

export async function sendChangeEmailVerify({ newEmail, url, token }: { newEmail: string; url: string; token: string }) {
  await send(newEmail, url, changeEmailVerifyEmail({ newEmail, url }), key("change-email-verify", token));
}
