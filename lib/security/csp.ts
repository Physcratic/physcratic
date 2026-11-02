/**
 * Content Security Policy, sent as Content-Security-Policy-Report-Only (next.config.mjs) so it
 * blocks nothing yet. Violations are posted to /api/csp-report and logged.
 *
 * Origins were found by searching the code for scripts, iframes, fetch targets, images, fonts and
 * form actions (see the PR that added this file):
 * - Vercel Analytics (`@vercel/analytics` in app/layout.tsx) loads /_vercel/insights/script.js and
 *   posts to /_vercel/insights, both on our own origin.
 * - Tally is only linked to (tally.so in lib/coaching/consultation.ts and the feedback link), never
 *   embedded, so it needs no entry here. Add `https://tally.so` to frame-src if an embed arrives.
 * - The PDF viewer's worker is bundled and served from /_next/static (worker-src, plus blob: for pdf.js).
 * - Fonts come from next/font, which self-hosts them. Auth calls only our own /api/auth.
 * - reCAPTCHA is not on main yet. The unmerged sign-up captcha (branch codex/signup-captcha) loads
 *   https://www.google.com/recaptcha/api.js, so its origins are allowed here ahead of time.
 *
 * Reports use report-uri, which every browser delivers at once (checked in Chromium). The endpoint
 * also parses the newer Reporting API shape (application/reports+json), so adding report-to and a
 * Reporting-Endpoints header later needs no change on the receiving side.
 *
 * Follow-up: script-src keeps 'unsafe-inline' because Next inlines scripts (and the JSON-LD blocks
 * are inline). Replace it with per-request nonces, then switch the header from report-only to enforcing.
 */

export const CSP_REPORT_PATH = "/api/csp-report";

export type CspDirectives = Record<string, readonly string[]>;

export interface CspOptions {
  /** Adds 'unsafe-eval' (React refresh) and websockets. Never true in production. */
  development?: boolean;
  /** Adds the Vercel toolbar origin that preview deployments load. */
  vercelPreview?: boolean;
  /** Where violations are posted. */
  reportPath?: string;
}

const SELF = "'self'";
const RECAPTCHA_SCRIPT = ["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"];
const RECAPTCHA_FRAME = ["https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"];

export function cspDirectives({ development = false, vercelPreview = false, reportPath = CSP_REPORT_PATH }: CspOptions = {}): CspDirectives {
  const live = vercelPreview ? ["https://vercel.live"] : [];
  return {
    "default-src": [SELF],
    // 'unsafe-inline' stays until nonces replace it (see the follow-up above).
    "script-src": [SELF, "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : []), ...RECAPTCHA_SCRIPT, ...live],
    "style-src": [SELF, "'unsafe-inline'"],
    "img-src": [SELF, "data:", "blob:", ...live],
    "font-src": [SELF, "data:", ...live],
    "connect-src": [SELF, ...(development ? ["ws:", "wss:"] : []), "https://www.google.com/recaptcha/", ...live],
    "frame-src": [SELF, ...RECAPTCHA_FRAME, ...live],
    "worker-src": [SELF, "blob:"],
    "media-src": [SELF],
    "manifest-src": [SELF],
    "object-src": ["'none'"],
    "base-uri": [SELF],
    "form-action": [SELF],
    "frame-ancestors": [SELF],
    "report-uri": [reportPath],
  };
}

/** The policy as one header value. Directives are separated by "; " and values by spaces. */
export function buildCsp(options: CspOptions = {}): string {
  return Object.entries(cspDirectives(options))
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
