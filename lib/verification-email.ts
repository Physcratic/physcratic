import "server-only";
import { createHash } from "node:crypto";
import { Resend } from "resend";

export async function sendVerificationEmail({ email, url, token }: { email: string; url: string; token: string }) {
  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim();
  if (!process.env.RESEND_API_KEY || !domain || !/^[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}$/i.test(domain)) {
    throw new Error("Verification email sender is not configured.");
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `Physcratic <accounts@${domain}>`,
    to: [email],
    subject: "Verify your Physcratic email address",
    text: [
      "Welcome to Physcratic.",
      "",
      "Verify your email address to start saving your physics practice and solutions.",
      "",
      url,
      "",
      "This link expires in 1 hour. After verifying, sign in with your email and password.",
      "If you did not request this email, you can safely ignore it.",
    ].join("\n"),
  }, { idempotencyKey: `verify-email/${createHash("sha256").update(token).digest("hex")}` });
  if (error) throw new Error(`Resend delivery failed (${error.name}).`);
}
