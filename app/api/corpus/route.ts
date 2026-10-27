import { corpusPilot } from "@/lib/corpus-pilot";

export function GET() {
  return new Response(JSON.stringify(corpusPilot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="physcratic-corpus-pilot.json"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
