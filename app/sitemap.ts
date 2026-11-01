import type { MetadataRoute } from "next";
import { indexableRoutes } from "@/lib/seo/public-routes";
import { xmlEscape } from "@/lib/seo/xml";
import { siteUrl } from "@/lib/site";

// No lastModified/priority/changefreq: Google ignores priority and we have
// no trustworthy modification dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map((route) => ({
    // Next 15.5 writes <loc> verbatim, so a raw "&" would make the XML invalid.
    url: xmlEscape(`${siteUrl()}${route.path}`),
  }));
}
