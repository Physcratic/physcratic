import { problemAuthoringApi } from "@/lib/problem-authoring-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return problemAuthoringApi("publish", request, (await params).id);
}
