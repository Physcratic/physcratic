/**
 * Who the home page is for. A signed-in visitor gets the Lobby, everyone else (crawlers included) gets the public
 * landing page. The decision starts from the session cookie: with no cookie there is no session to look up, so a
 * crawler never touches the database. Any failure counts as a visitor, so the landing page never errors.
 */
export type HomeAudience = "member" | "visitor";

const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=[^;\s]/;

export function hasSessionCookie(cookieHeader: string | null | undefined): boolean {
  return Boolean(cookieHeader && SESSION_COOKIE.test(cookieHeader));
}

export async function resolveHomeAudience(
  cookieHeader: string | null | undefined,
  lookup: () => Promise<{ user?: unknown } | null | undefined>,
): Promise<HomeAudience> {
  if (!hasSessionCookie(cookieHeader)) return "visitor";
  try {
    const session = await lookup();
    return session?.user ? "member" : "visitor";
  } catch {
    return "visitor";
  }
}
