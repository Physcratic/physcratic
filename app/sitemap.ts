import type { MetadataRoute } from "next";
import { indexableRoutes } from "@/lib/seo/public-routes";
import { xmlEscape } from "@/lib/seo/xml";
import { publicDiscoveryUrl } from "@/lib/public-discovery";

// lastModified comes from the data (a problem's import date, a guide's updated date) and is left out when the data
// has none. No priority or changefreq: Google ignores them.
export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map((route) => ({
    // Next 15.5 writes <loc> verbatim, so a raw "&" would make the XML invalid.
    url: xmlEscape(`${publicDiscoveryUrl()}${route.path}`),
    ...(route.lastmod ? { lastModified: route.lastmod } : {}),
  }));
}
