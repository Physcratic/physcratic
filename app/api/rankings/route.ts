import { db } from "@/lib/db";
import { parseRankingsQuery, RANKINGS_SEARCH_MAX_LENGTH } from "@/lib/rankings";
import { createRankingsService } from "@/lib/rankings-server";

export const runtime = "nodejs";
const getRankings = createRankingsService(db);
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const query = parseRankingsQuery(new URL(request.url).searchParams);
  if (!query) {
    return Response.json(
      {
        error: `Use a positive whole page number up to 1000000 and a search of at most ${RANKINGS_SEARCH_MAX_LENGTH} characters.`,
      },
      { status: 400, headers },
    );
  }
  try {
    return Response.json(await getRankings(query), { headers });
  } catch {
    return Response.json(
      {
        error: "Rankings are temporarily unavailable. Please retry.",
      },
      { status: 503, headers },
    );
  }
}
