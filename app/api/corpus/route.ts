import { corpusPilot } from "@/lib/corpus-pilot";
import { catalogExport } from "@/lib/corpus-catalog";

export function GET(request: Request) {
  const collection = new URL(request.url).searchParams.get("collection");
  if (collection && collection !== "catalog" && collection !== "pilot") {
    return Response.json(
      { error: "Unknown corpus collection" },
      { status: 400 },
    );
  }
  const isCatalog = collection === "catalog";
  return new Response(
    JSON.stringify(isCatalog ? catalogExport : corpusPilot, null, 2),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${isCatalog ? "physcratic-olympiad-catalog" : "physcratic-corpus-pilot"}.json"`,
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
