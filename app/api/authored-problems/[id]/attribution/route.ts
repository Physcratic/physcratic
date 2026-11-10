import { authoredAttributionRoute } from "@/lib/authored-attribution-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return authoredAttributionRoute(request, (await params).id);
}
