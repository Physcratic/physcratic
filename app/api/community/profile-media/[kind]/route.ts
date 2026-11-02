import { profileMediaRoute } from "@/lib/community/profile-media-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string }> };
export async function PUT(request: Request, { params }: Context) {
  return profileMediaRoute("upload", request, (await params).kind);
}
export async function DELETE(request: Request, { params }: Context) {
  return profileMediaRoute("remove", request, (await params).kind);
}
