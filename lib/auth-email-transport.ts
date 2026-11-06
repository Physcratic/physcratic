import "server-only";
import { Resend } from "resend";
import type { AuthEmailContent } from "./auth-email-templates";

export type AuthEmail = AuthEmailContent & { to: string; idempotencyKey: string };
type Environment = Record<string, string | undefined>;

/** The memory transport is for tests only. It never runs on a production build or a Vercel production deployment. */
export function memoryTransportAllowed(env: Environment = process.env) {
  return env.AUTH_EMAIL_TRANSPORT === "memory" && env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
}

const outboxKey = Symbol.for("physcratic.authEmailOutbox");
type Store = typeof globalThis & { [outboxKey]?: AuthEmail[] };
/** Messages captured by the memory transport, oldest first. */
export function authEmailOutbox() {
  return ((globalThis as Store)[outboxKey] ??= []);
}

export async function deliverAuthEmail(message: AuthEmail, env: Environment = process.env) {
  if (env.AUTH_EMAIL_TRANSPORT !== undefined) {
    // A set but refused memory transport fails closed instead of falling back to real delivery.
    if (!memoryTransportAllowed(env)) throw new Error("Account email transport is misconfigured.");
    const outbox = authEmailOutbox();
    outbox.push(message);
    if (outbox.length > 500) outbox.splice(0, outbox.length - 500);
    return;
  }
  const domain = env.RESEND_EMAIL_DOMAIN?.trim();
  if (!env.RESEND_API_KEY || !domain || !/^[a-z\d](?:[a-z\d.-]*[a-z\d])?\.[a-z]{2,}$/i.test(domain)) {
    throw new Error("Verification email sender is not configured.");
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `Physcratic <accounts@${domain}>`,
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
  }, { idempotencyKey: message.idempotencyKey });
  if (error) throw new Error(`Resend delivery failed (${error.name}).`);
}
