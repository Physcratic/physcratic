import { profileMediaRoute } from "@/lib/community/profile-media-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return profileMediaRoute("image", request, (await params).id);
}
