// Where sign-up sends someone afterwards. The address comes from the page's ?returnTo=, which anyone can write, so only a
// same-site path is accepted: one slash, then the path. Anything else (another site, a scheme such as javascript:,
// a backslash, which some browsers read as a slash, or a control character that the URL parser strips) falls back.
export const signUpFallbackPath = "/dashboard";
const base = "http://same-site.invalid";

export function safeSignUpReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return signUpFallbackPath;
  // "/" then anything but another "/" (which would make it "//host", a protocol-relative address to another site).
  if (!value.startsWith("/") || value.startsWith("//")) return signUpFallbackPath;
  // Backslashes, spaces and control characters (tab and newline are dropped by the URL parser, so "/\t/host" becomes "//host").
  if (/[\\\u0000- \u007f]/.test(value)) return signUpFallbackPath;
  try {
    // The last word comes from the URL parser itself: whatever it makes of the value must still be this site.
    if (new URL(value, base).origin !== base) return signUpFallbackPath;
  } catch {
    return signUpFallbackPath;
  }
  return value;
}
