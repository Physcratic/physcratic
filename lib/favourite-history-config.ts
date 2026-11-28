import "server-only";

/** A dedicated key avoids coupling favourite activation to an authentication-key change. */
export function favouriteHistoryCursorSecret(env: Record<string, string | undefined> = process.env) {
  const dedicated = env.FAVOURITE_HISTORY_CURSOR_SECRET;
  // An explicitly configured but invalid key must fail closed, not silently use another key.
  if (dedicated !== undefined)
    return dedicated.length >= 32 && dedicated.length <= 1024 && dedicated.trim() === dedicated ? dedicated : undefined;
  return env.BETTER_AUTH_SECRET || undefined;
}
