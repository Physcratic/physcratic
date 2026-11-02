import { createHash, timingSafeEqual } from "node:crypto";
import { readRequestBytes } from "@/lib/submission-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const OPERATOR_TOKEN_SHA256 = "539ddc80c4a2f7f6aac7a2add807972cc9b106aa5e9c949b38bfe9b07a24d79b";
const EXPIRES_AT = 1793640486000;

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
    const body: unknown = JSON.parse(new TextDecoder().decode(await readRequestBytes(request, 10000, 5000)));
    if (!body || typeof body !== "object") return reply({ verified: false }, 400);
    const input = body as Record<string, unknown>;
    if (input.operation === "config") {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
      return siteKey ? reply({ siteKey, expiresAt: EXPIRES_AT }, 200) : reply({ verified: false }, 503);
    }
    if (typeof input.token !== "string" || !input.token.trim() || input.token.length > 8192) return reply({ verified: false }, 400);
    const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
    const allowed = process.env.RECAPTCHA_ALLOWED_HOSTNAMES?.split(",").map(x => x.trim()) ?? [];
    if (!secret || !allowed.includes("physcratic.com")) return reply({ verified: false }, 503);
    const result = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: input.token }).toString(),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return reply({ verified: false }, 503);
    const verdict: unknown = await result.json();
    if (!verdict || typeof verdict !== "object") return reply({ verified: false }, 403);
    const v = verdict as Record<string, unknown>;
    const success = v.success === true;
    const hostname = typeof v.hostname === "string" ? v.hostname : null;
    const action = typeof v.action === "string" ? v.action : null;
    const score = typeof v.score === "number" && Number.isFinite(v.score) && v.score >= 0 && v.score <= 1 ? v.score : null;
    const issuedAt = typeof v.challenge_ts === "string" ? Date.parse(v.challenge_ts) : NaN;
    const age = Date.now() - issuedAt;
    const fresh = Number.isFinite(age) && age >= -30000 && age <= 120000;
    const verified = success && hostname === "physcratic.com" && action === "signup" && score !== null && score >= 0.5 && fresh;
    return reply({ verified, success, hostname, action, score, fresh }, verified ? 200 : 403);
  } catch {
    return reply({ verified: false }, 503);
  }
}

