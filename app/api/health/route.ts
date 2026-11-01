import { healthPayload } from "@/lib/health";

// Uptime probe. No database, no auth, no secrets: it only proves the app is serving.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(healthPayload(process.env, new Date()), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
