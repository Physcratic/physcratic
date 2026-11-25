import { siteSearch } from "@/lib/site-search";

export const runtime = "nodejs";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";
  if (query.length > 160 || params.getAll("q").length > 1) {
    return Response.json({ error: "Use a search of 160 characters or fewer." }, { status: 400 });
  }
  return Response.json({ results: siteSearch(query) }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
