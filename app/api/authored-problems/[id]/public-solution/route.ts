import { publicSolutionRoute } from "@/lib/authored-public-solution-route";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return publicSolutionRoute(request, (await params).id);
}
