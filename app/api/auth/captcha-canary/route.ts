import { createHash, timingSafeEqual } from "node:crypto";
import { readRequestBytes } from "@/lib/submission-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary, approved account-free provider verifier. Remove after the canary.
const OPERATOR_TOKEN_SHA256 = "32fb4cbbb26bea9cfe65be0f9bae188b7fc744fd8e47beb7ea0a5490e7f32f58";
const EXPIRES_AT = 1793639208699; // Fixed deadline: no more than ten minutes from credential generation.

function reply(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization");
  if (Date.now() >= EXPIRES_AT || !bearer?.startsWith("Bearer ") || bearer.length > 512) return reply({ error: "Unavailable" }, 404);
  const digest = createHash("sha256").update(bearer.slice(7)).digest();
  if (!timingSafeEqual(digest, Buffer.from(OPERATOR_TOKEN_SHA256, "hex"))) return reply({ error: "Unavailable" }, 404);
  if (request.headers.get("origin") !== "https://physcratic.com" || new URL(request.url).origin !== "https://physcratic.com") return reply({ error: "Unavailable" }, 404);
  try {
    const body = JSON.parse(new TextDecoder().decode(await readRequestBytes(request, 10000)));
    if (typeof body.token !== "string" || !body.token.trim() || body.token.length > 8192) return reply({ verified: false }, 400);
    const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
    const allowed = process.env.RECAPTCHA_ALLOWED_HOSTNAMES?.split(",").map(x => x.trim()) ?? [];
    if (!secret || !allowed.includes("physcratic.com")) return reply({ verified: false }, 503);
    const result = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: body.token }).toString(),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return reply({ verified: false }, 503);
    const verdict: unknown = await result.json();
    if (!verdict || typeof verdict !== "object") return reply({ verified: false }, 403);
    const v = verdict as Record<string, unknown>;
    const hostname = typeof v.hostname === "string" ? v.hostname : null;
    const action = typeof v.action === "string" ? v.action : null;
    const score = typeof v.score === "number" && Number.isFinite(v.score) && v.score >= 0 && v.score <= 1 ? v.score : null;
    const verified = v.success === true && hostname === "physcratic.com" && action === "signup" && score !== null && score >= 0.5;
    return reply({ verified, hostname, action, score }, verified ? 200 : 403);
  } catch {
    return reply({ verified: false }, 503);
  }
}

