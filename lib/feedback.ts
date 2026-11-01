/** Beta feedback link: pure URL building. See docs/engineering/BETA_READINESS.md. */

// Literal reference so Next inlines it into the client bundle.
export const feedbackBase = process.env.NEXT_PUBLIC_FEEDBACK_URL;

export const MAX_PAGE_LENGTH = 300;
const MAILTO_SUBJECT = "Physcratic beta feedback";

export type FeedbackContext = { page: string; ref?: string };

/** pathname + search, never the #hash, capped at 300 characters. */
export function normalizeFeedbackPage(page: string): string {
  const hash = page.indexOf("#");
  const withoutHash = hash === -1 ? page : page.slice(0, hash);
  return withoutHash.slice(0, MAX_PAGE_LENGTH);
}

export function buildFeedbackHref(
  base: string | undefined,
  ctx: FeedbackContext,
): string | null {
  const trimmed = base?.trim();
  if (!trimmed) return null;

  let protocol: string;
  try {
    protocol = new URL(trimmed).protocol;
  } catch {
    return null;
  }

  const page = normalizeFeedbackPage(ctx.page);
  const ref = ctx.ref ?? "";

  if (protocol === "https:") {
    return trimmed.replace(/\{page\}|%7Bpage%7D|\{ref\}|%7Bref%7D/gi, (token) =>
      encodeURIComponent(/page/i.test(token) ? page : ref),
    );
  }

  if (protocol === "mailto:") {
    const queryStart = trimmed.indexOf("?");
    const head = queryStart === -1 ? trimmed : trimmed.slice(0, queryStart);
    const existing = queryStart === -1 ? "" : trimmed.slice(queryStart + 1);
    const present = new Set(
      existing
        .split("&")
        .map((pair) => pair.split("=")[0].toLowerCase())
        .filter(Boolean),
    );

    const lines = [`Page: ${page}`];
    if (ctx.ref) lines.push(`Reference: ${ctx.ref}`);
    const body = `${lines.join("\n")}\n\n`;

    const added: string[] = [];
    if (!present.has("subject")) {
      added.push(`subject=${encodeURIComponent(MAILTO_SUBJECT)}`);
    }
    if (!present.has("body")) added.push(`body=${encodeURIComponent(body)}`);
    return [head, [existing, ...added].filter(Boolean).join("&")]
      .filter(Boolean)
      .join("?");
  }

  return null;
}
