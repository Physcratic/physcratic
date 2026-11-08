"use client";

import { createContext, useContext } from "react";

/** The tag filter a card can reach, so a tag on a card is a button that sets it. Outside the library the tags stay plain labels. */
export type TagFilter = { active: string; toggle: (tag: string) => void };

export const TagFilterContext = createContext<TagFilter | null>(null);

export const useTagFilter = () => useContext(TagFilterContext);

/** Whether a card tag is the one the filter is set to. Case does not matter. */
export const isActiveTag = (active: string, tag: string) => active !== "all" && active.toLowerCase() === tag.toLowerCase();

/** The next filter when a tag is pressed: pressing the active tag again clears it. */
export const nextTagFilter = (active: string, tag: string) => (isActiveTag(active, tag) ? "all" : tag);

/** The page address for a tag filter, so the filter can be shared. `topic` is dropped because `tag` replaces it. */
export function tagFilterHref(href: string, tag: string): string {
  const url = new URL(href);
  url.searchParams.delete("topic");
  if (tag === "all") url.searchParams.delete("tag");
  else url.searchParams.set("tag", tag);
  return `${url.pathname}${url.search}${url.hash}`;
}
