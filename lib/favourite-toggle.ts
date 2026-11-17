// Pure helpers for the favourite control on Arena cards. The server stays the source of truth: the override only shows
// the change the person asked for until the confirmed statistics come back, and is dropped if the write fails.
export type FavouriteStat = { favourites: number; favourite: boolean };

/** The stat as shown while a change is pending. With no override, or one that matches, the stat is returned as is. */
export function applyFavouriteOverride<T extends FavouriteStat>(stat: T, desired: boolean | undefined): T {
  if (desired === undefined || desired === stat.favourite) return stat;
  return { ...stat, favourite: desired, favourites: Math.max(0, stat.favourites + (desired ? 1 : -1)) };
}

/** Plain words for a failed write, so the error never relies on colour. */
export function favouriteErrorMessage(status: number | undefined): string {
  if (status === 409) return "Your account changed. Reload the page before continuing.";
  if (status === 429) return "Too many requests. Try again in a minute.";
  return "The change could not be confirmed. Reload before retrying.";
}

/** "1 favourite", "2 favourites". */
export function favouriteNoun(count: number): string {
  return count === 1 ? "favourite" : "favourites";
}
