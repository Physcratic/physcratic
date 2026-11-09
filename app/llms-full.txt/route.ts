import { llmsFull } from "@/lib/seo/llms";
import { publicDiscoveryUrl } from "@/lib/public-discovery";

export const dynamic = "force-static";

// Every problem, guide and coaching page, one line each. Built from the same list as the sitemap.
export function GET() {
  return new Response(llmsFull(publicDiscoveryUrl()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
