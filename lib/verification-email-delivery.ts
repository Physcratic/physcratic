import { createHash } from "node:crypto";
import { z } from "zod";

type Env = Record<string, string | undefined>;
type Mail = { email: string; url: string; token: string };
type Payload = { from: string; to: string[]; subject: string; text: string; html: string };
export type VerificationTransport = (key: string, payload: Payload, options: { idempotencyKey: string }) => Promise<{ error: unknown }>;

function address(value: string) {
  const email = value.trim();
  if (!z.email().safeParse(email).success) throw new Error("Invalid verification email configuration.");
  const at = email.lastIndexOf("@");
  return email.slice(0, at) + email.slice(at).toLowerCase();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function deliverVerificationEmail(mail: Mail, env: Env, transport: VerificationTransport) {
  const email = address(mail.email);
  // Only Vercel's production target retains unrestricted delivery. Unknown/local targets fail closed.
  if (env.VERCEL_ENV !== "production") {
    const entries = env.STAGING_VERIFICATION_EMAIL_ALLOWLIST?.split(",") ?? [];
    if (!entries.length || entries.length > 20 || entries.some((entry) => !entry.trim())) throw new Error("Staging email delivery is restricted.");
    const allowed = entries.map(address);
    if (!allowed.includes(email)) throw new Error("Staging email delivery is restricted.");
    try {
      const expected = new URL(env.BETTER_AUTH_URL ?? "");
      const link = new URL(mail.url);
      if (expected.protocol !== "https:" || expected.username || expected.password || link.origin !== expected.origin) throw new Error();
    } catch { throw new Error("Staging verification origin is not configured."); }
  }
  const domain = env.RESEND_EMAIL_DOMAIN?.trim();
  if (!env.RESEND_API_KEY || !domain || !/^[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}$/i.test(domain)) throw new Error("Verification email sender is not configured.");
  let result: { error: unknown };
  try { result = await transport(env.RESEND_API_KEY, {
    from: `Physcratic <accounts@${domain}>`, to: [email], subject: "Verify your email | Physcratic",
    text: ["Verify your email address", "", "Use this link to verify your Physcratic account:", mail.url, "", "This link expires in 1 hour.", "Didn't sign up? You can ignore this email."].join("\\n"),
    html: (() => {
      const verificationUrl = escapeHtml(mail.url);
      const logoUrl = escapeHtml(new URL("/physcratic-email-logo.png", new URL(mail.url).origin).toString());
      return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:32px 16px;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif;color:#17213b;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf3;border-radius:12px;"><tr><td style="padding:36px 32px;text-align:center;"><img src="${logoUrl}" alt="Physcratic" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 20px;border:0;"><h1 style="font-size:24px;line-height:1.3;margin:0 0 12px;color:#14213d;">Verify your email</h1><p style="font-size:15px;line-height:1.7;color:#546176;margin:0 0 26px;">One quick step before you can start saving your physics progress.</p><a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 24px;font-weight:600;font-size:15px;">Verify email</a><p style="font-size:12px;line-height:1.6;color:#68758b;margin:24px 0 0;">This link expires in 1 hour.</p></td></tr><tr><td style="border-top:1px solid #edf0f6;padding:22px 32px;"><p style="font-size:12px;line-height:1.7;color:#68758b;margin:0 0 10px;">Button not working? Copy this link into your browser:</p><a href="${verificationUrl}" style="font-size:12px;line-height:1.7;color:#2563eb;overflow-wrap:anywhere;word-break:break-word;">${verificationUrl}</a><p style="font-size:12px;line-height:1.7;color:#68758b;margin:16px 0 0;">Didn't sign up? You can safely ignore this email.</p></td></tr></table></body></html>`;
    })(),
  }, { idempotencyKey: `verify-email/${createHash("sha256").update(mail.token).digest("hex")}` });
  } catch { throw new Error("Verification email provider unavailable."); }
  if (result.error) throw new Error("Verification email provider failed.");
}
