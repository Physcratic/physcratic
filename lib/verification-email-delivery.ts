import { createHash } from "node:crypto";
import { z } from "zod";

type Env = Record<string, string | undefined>;
type Mail = { email: string; url: string; token: string };
type Payload = { from: string; to: string[]; subject: string; text: string };
export type VerificationTransport = (key: string, payload: Payload, options: { idempotencyKey: string }) => Promise<{ error: unknown }>;

function address(value: string) {
  const email = value.trim();
  if (!z.email().safeParse(email).success) throw new Error("Invalid verification email configuration.");
  const at = email.lastIndexOf("@");
  return email.slice(0, at) + email.slice(at).toLowerCase();
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
    from: `Physcratic <accounts@${domain}>`, to: [email], subject: "Verify your Physcratic email address",
    text: ["Welcome to Physcratic.", "", "Verify your email address to start saving your physics practice and solutions.", "", mail.url, "", "This link expires in 1 hour. After verifying, sign in with your email and password.", "If you did not request this email, you can safely ignore it."].join("\n"),
  }, { idempotencyKey: `verify-email/${createHash("sha256").update(mail.token).digest("hex")}` });
  } catch { throw new Error("Verification email provider unavailable."); }
  if (result.error) throw new Error("Verification email provider failed.");
}
