import "server-only";
import type { BetterAuthPlugin } from "better-auth";
import { SIGNUP_CAPTCHA_ACTION } from "./signup-captcha-action";

// The locked upstream plugin also accepts v2 responses without a numeric score.
// Require a complete v3 verdict. Google consumes tokens once, across instances.
export function signupCaptcha(env: Record<string, string | undefined> = process.env) {
  const secret = env.RECAPTCHA_SECRET_KEY?.trim();
  const hosts = env.RECAPTCHA_ALLOWED_HOSTNAMES?.split(",").map(host => host.trim()).filter(Boolean) ?? [];
  const reject = (status: number) => ({ response: Response.json({
    code: status === 400 ? "MISSING_RESPONSE" : status === 403 ? "VERIFICATION_FAILED" : "CAPTCHA_UNAVAILABLE",
    message: "Account verification could not be completed. Please try again.",
  }, { status, headers: { "Cache-Control": "private, no-store" } }) });
  return {
    id: "signup-captcha",
    onRequest: async (request, ctx) => {
      const pathname = new URL(request.url).pathname;
      const base = ctx.options.basePath ?? "/api/auth";
      const path = (pathname.startsWith(base) ? pathname.slice(base.length) : pathname)
        .replace(/\/{2,}/g, "/").replace(/\/$/, "");
      if (path !== "/sign-up/email") return;
      if (!secret || !hosts.length) return reject(500);
      const token = request.headers.get("x-captcha-response")?.trim();
      if (!token || token.length > 8192) return reject(400);
      try {
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ secret, response: token }).toString(),
          signal: AbortSignal.timeout(5000), cache: "no-store", redirect: "error",
        });
        if (!response.ok) return reject(500);
        const result: unknown = await response.json();
        if (!result || typeof result !== "object") return reject(403);
        const verdict = result as Record<string, unknown>;
        if (verdict.success !== true || typeof verdict.score !== "number" ||
          !Number.isFinite(verdict.score) || verdict.score < 0.5 || verdict.score > 1 ||
          verdict.action !== SIGNUP_CAPTCHA_ACTION || typeof verdict.hostname !== "string" ||
          !hosts.includes(verdict.hostname)) return reject(403);
      } catch {
        // Never log provider payloads, tokens, credentials or request URLs.
        return reject(500);
      }
    },
  } satisfies BetterAuthPlugin;
}
