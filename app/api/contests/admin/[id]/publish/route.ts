import { contestIdSchema, contestPublishSchema } from "@/lib/contest-contracts";
import { contestHandler, contestJson, contestUser } from "@/lib/contest-http";
import { publishContest } from "@/lib/contest-server";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return contestHandler(async () => {
    const user = await contestUser(request);
    const id = contestIdSchema.parse((await params).id);
    const input = contestPublishSchema.parse(await contestJson(request));
    return { contest: await publishContest(user.id, id, input.version) };
  });
}
