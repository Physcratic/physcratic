import type { MetadataRoute } from "next";
import { isProductionDeploy, siteUrl } from "@/lib/site";

// Search and AI crawlers are named so the policy is explicit. OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot,
// Googlebot and Bingbot get the same rules as "*", and ChatGPT-User, Claude-SearchBot, Claude-User and
// Google-Extended fall under "*". The practice problems are meant to be found.
// /api/ is deliberately not disallowed: Google must fetch it to render pages,
// and API responses already send X-Robots-Tag: noindex.
export const CRAWLERS = ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot"] as const;

// Cover the exact authoring page, queries and descendants without matching /dashboard/authored/.
const DISALLOW = ["/dashboard/author$", "/dashboard/author?", "/dashboard/author/", "/dashboard/submissions", "/sign-in", "/sign-up"];

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeploy()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      ...CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
      { userAgent: "*", allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
