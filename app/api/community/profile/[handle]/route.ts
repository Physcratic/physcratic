import { communityProfileRoute } from "@/lib/community/profile-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  return communityProfileRoute("public", request, (await params).handle);
}
