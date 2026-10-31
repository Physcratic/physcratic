import type { MetadataRoute } from "next";
import { isProductionDeploy, siteUrl } from "@/lib/site";

// AI crawlers — OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot,
// Claude-User, ClaudeBot, PerplexityBot, Google-Extended — are covered by "*"
// and are allowed on purpose: the practice problems are meant to be found.
// /api/ is deliberately not disallowed: Google must fetch it to render pages,
// and API responses already send X-Robots-Tag: noindex.
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeploy()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/author",
        "/dashboard/submissions",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
