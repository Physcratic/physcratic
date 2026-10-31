import { problemAuthoringApi } from "@/lib/problem-authoring-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const response = await problemAuthoringApi("public", request, id);
  if (response.ok)
    response.headers.set(
      "Link",
      `</api/authored-problems/${id.toLowerCase()}/submission-info>; rel="submission-info"; type="application/json"`,
    );
  return response;
}
