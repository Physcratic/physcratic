/**
 * Turns a posted CSP report into the single log line the endpoint writes. Pure, so it is tested
 * without a server. Only the directive, the blocked origin and a fixed route label are kept. Query
 * strings and fragments are never logged, and every value is cut to 100 characters with control
 * characters removed so a report cannot forge a log line.
 */

export const MAX_REPORT_BYTES = 8 * 1024;
export const MAX_REPORT_READ_MS = 5000;
export const REPORT_CONTENT_TYPES = ["application/csp-report", "application/reports+json"] as const;

export interface CspReportLine {
  directive: string;
  blocked: string;
  path: string;
}

const clean = (value: unknown): string =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim().slice(0, 100) : "";

/** "https://x.example/a?b=1" becomes "https://x.example". Keywords such as inline, eval, data and blob stay as they are. */
export function blockedOrigin(blocked: unknown): string {
  const text = clean(blocked);
  if (!text) return "unknown";
  if (!text.includes(":") && !text.includes("/")) return text; // "inline", "eval", "self"
  try {
    const url = new URL(text);
    return url.origin !== "null" ? url.origin : `${url.protocol}`; // data:, blob:, about:
  } catch {
    return "unknown";
  }
}

const publicRouteLabels = new Set([
  "/", "/dashboard", "/dashboard/author", "/dashboard/submissions", "/dashboard/contests/manage",
  "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/email-change", "/settings",
  "/learn", "/terms", "/problems", "/problems/archive", "/coaching", "/coaching/consultation",
  "/coaching/become-a-tutor", "/admin/moderation", "/admin/verification",
]);
const dynamicRouteLabels: [RegExp, string][] = [
  [/^\/u\/[^/]+\/?$/, "/u/[handle]"],
  [/^\/learn\/[^/]+\/?$/, "/learn/[slug]"],
  [/^\/problems\/topics\/[^/]+\/?$/, "/problems/topics/[slug]"],
  [/^\/dashboard\/problems\/[^/]+\/?$/, "/dashboard/problems/[id]"],
  [/^\/dashboard\/authored\/[^/]+\/?$/, "/dashboard/authored/[id]"],
  [/^\/dashboard\/contests\/[^/]+\/?$/, "/dashboard/contests/[id]"],
];

/** Never log handles, IDs or arbitrary path segments, including unrecognized routes. */
export function pagePath(documentUri: unknown): string {
  const text = clean(documentUri);
  if (!text) return "unknown";
  try {
    const path = new URL(text, "https://csp-report.invalid").pathname;
    if (publicRouteLabels.has(path)) return path;
    return dynamicRouteLabels.find(([pattern]) => pattern.test(path))?.[1] ?? "other";
  } catch {
    return "unknown";
  }
}

const fromBody = (body: Record<string, unknown>, uriKey: string): CspReportLine => ({
  directive: clean(body.effectiveDirective ?? body["effective-directive"] ?? body["violated-directive"] ?? body.violatedDirective).split(" ")[0] || "unknown",
  blocked: blockedOrigin(body.blockedURL ?? body["blocked-uri"] ?? body.blockedUri),
  path: pagePath(body[uriKey]),
});

/** Accepts the report-uri shape ({"csp-report": {...}}) and the Reporting API shape ([{type, url, body}]). */
export function parseCspReports(payload: unknown): CspReportLine[] {
  const lines: CspReportLine[] = [];
  const items = Array.isArray(payload) ? payload : [payload];
  for (const item of items.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const legacy = record["csp-report"];
    if (legacy && typeof legacy === "object") {
      lines.push(fromBody(legacy as Record<string, unknown>, "document-uri"));
    } else if (record.type === "csp-violation" && record.body && typeof record.body === "object") {
      const body = record.body as Record<string, unknown>;
      lines.push(fromBody({ ...body, documentURL: body.documentURL ?? record.url }, "documentURL"));
    }
  }
  return lines;
}
