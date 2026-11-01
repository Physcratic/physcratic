import { authorMediaApi } from "@/lib/problem-authoring-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return authorMediaApi("cleanup", request);
}
