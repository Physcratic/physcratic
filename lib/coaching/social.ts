import type { Metadata } from "next";
import { baseOpenGraph } from "../site";

/** The link preview image, built by app/coaching/opengraph-image.tsx. A static route, so this path always works. */
export const COACHING_OG_IMAGE_PATH = "/coaching/opengraph-image";

/**
 * openGraph and twitter metadata for a coaching page. Next replaces the whole openGraph object instead of
 * merging it, so a page that sets its own loses the image it would have inherited: `withImage` adds it
 * back. The layout leaves it off, because the opengraph-image file in the same folder already supplies it.
 */
export function coachingSocial({ title, description, url, withImage }: { title: string; description: string; url: string; withImage: boolean }): Pick<Metadata, "openGraph" | "twitter"> {
  const images = withImage ? [{ url: COACHING_OG_IMAGE_PATH, width: 1200, height: 630 }] : undefined;
  return {
    openGraph: { ...baseOpenGraph, title, description, url, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(images ? { images: [COACHING_OG_IMAGE_PATH] } : {}) },
  };
}
