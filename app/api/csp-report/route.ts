import { MAX_REPORT_BYTES, MAX_REPORT_READ_MS, REPORT_CONTENT_TYPES, parseCspReports } from "@/lib/security/csp-report";
import { readRequestBytes } from "@/lib/submission-request";

export const dynamic = "force-dynamic";

/** Reads at most `limit` bytes. Returns null when the body is bigger, without buffering the rest. */
async function readCapped(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";
  const bytes = await readRequestBytes(request, limit, MAX_REPORT_READ_MS);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/**
 * Receives Content-Security-Policy-Report-Only violations. It logs one line per report and always
 * answers 204, so a bad or oversized body gets the same answer as a good one. Only POST exists.
 */
export async function POST(request: Request) {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if ((REPORT_CONTENT_TYPES as readonly string[]).includes(type)) {
    try {
      const text = await readCapped(request, MAX_REPORT_BYTES);
      if (text) {
        for (const line of parseCspReports(JSON.parse(text))) console.warn("[csp]", line.directive, line.blocked, line.path);
      }
    } catch {
      // A body that is not JSON is ignored.
    }
  }
  return new Response(null, { status: 204 });
}
