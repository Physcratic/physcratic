/** HTTP loopback development needs cookies that can be sent without TLS.
 * Hosted previews retain their cross-site HTTPS cookie settings.
 */
export function developmentCookieAttributes(baseURL: string | undefined, environment: string | undefined) {
  if (environment !== "development") return undefined;
  let loopback = false;
  try {
    const url = new URL(baseURL ?? "");
    loopback = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password;
  } catch { /* Unknown previews keep the existing secure policy. */ }
  return loopback
    ? { sameSite: "lax" as const, secure: false }
    : { sameSite: "none" as const, secure: true };
}
