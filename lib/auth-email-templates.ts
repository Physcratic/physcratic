// Account emails. Every interpolated value is escaped for HTML and flattened for plain text,
// so a name or address can never add markup, links or extra lines.

export type AuthEmailContent = { subject: string; text: string; html: string };

const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => htmlEntities[c]);
}

/** Plain text keeps the value on one line and bounded. */
export function plainValue(value: string) {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ").slice(0, 320);
}

/** Links must be absolute http(s) URLs. Anything else is refused before it reaches a template. */
export function safeLink(url: string) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("Unsafe email link.");
  return parsed.toString();
}

type Part = string | { value: string } | { link: string };
type Paragraph = Part[];
const v = (value: string) => ({ value });
const link = (url: string) => ({ link: safeLink(url) });

function render(subject: string, paragraphs: Paragraph[]): AuthEmailContent {
  const text = paragraphs.map((p) => p.map((part) =>
    typeof part === "string" ? part : "value" in part ? plainValue(part.value) : part.link).join("")).join("\n\n");
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p.map((part) =>
    typeof part === "string" ? escapeHtml(part)
      : "value" in part ? `<strong>${escapeHtml(plainValue(part.value))}</strong>`
        : `<a href="${escapeHtml(part.link)}" style="color:#1d4ed8;word-break:break-all">${escapeHtml(part.link)}</a>`).join("")}</p>`).join("");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f4ef;color:#201f1c;font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif"><div style="max-width:560px;margin:0 auto">${body}</div></body></html>`;
  return { subject, text, html };
}

export function signupVerificationEmail({ url }: { url: string }) {
  return render("Verify your Physcratic email address", [
    ["Welcome to Physcratic."],
    ["Verify your email address to start saving your physics practice and solutions."],
    [link(url)],
    ["This link expires in 1 hour. After verifying, sign in with your email and password."],
    ["If you did not request this email, you can safely ignore it."],
  ]);
}

export function passwordResetEmail({ url, setPassword }: { url: string; setPassword: boolean }) {
  return render(setPassword ? "Set your Physcratic password" : "Reset your Physcratic password", [
    [setPassword ? "Here's the link to set a password for your Physcratic account." : "Someone asked to reset the password on your Physcratic account. If that was you, pick a new one here."],
    [link(url)],
    ["The link works once and expires in 1 hour."],
    ["Didn't ask for this? Ignore this email. Your password stays the same."],
  ]);
}

export function changeEmailApprovalEmail({ newEmail, url, resetUrl }: { newEmail: string; url: string; resetUrl: string }) {
  return render("Approve your new Physcratic email", [
    ["Someone asked to change the email on your Physcratic account to ", v(newEmail), "."],
    ["If that was you, approve it here."],
    [link(url)],
    ["Then we'll send one more link to ", v(newEmail), ". Your email only changes after that one is clicked. Both links expire in 1 hour."],
    ["Not you? Reset your password. ", link(resetUrl)],
  ]);
}

export function changeEmailVerifyEmail({ newEmail, url }: { newEmail: string; url: string }) {
  return render("Confirm your new Physcratic email", [
    ["Click this link to move your Physcratic account to ", v(newEmail), "."],
    [link(url)],
    ["It expires in 1 hour. Didn't ask for this? Ignore this email and nothing changes."],
  ]);
}
