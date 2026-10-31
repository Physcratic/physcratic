import type { MetadataRoute } from "next";
import { indexableRoutes } from "@/lib/seo/public-routes";
import { siteUrl } from "@/lib/site";

// No lastModified/priority/changefreq: Google ignores priority and we have
// no trustworthy modification dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map((route) => ({ url: `${siteUrl()}${route.path}` }));
}
