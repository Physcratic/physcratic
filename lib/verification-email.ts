import "server-only";
import { Resend } from "resend";
import { deliverVerificationEmail } from "./verification-email-delivery";

export async function sendVerificationEmail(mail: { email: string; url: string; token: string }) {
  return deliverVerificationEmail(mail, process.env, async (key, payload, options) => {
    try { return await new Resend(key).emails.send(payload, options); }
    catch { throw new Error("Verification email provider unavailable."); }
  });
}
