import { llmsIndex } from "@/lib/seo/llms";
import { publicDiscoveryUrl } from "@/lib/public-discovery";

export const dynamic = "force-static";

// The short index. Built from the same list as the sitemap, so the two cannot disagree.
export function GET() {
  return new Response(llmsIndex(publicDiscoveryUrl()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
