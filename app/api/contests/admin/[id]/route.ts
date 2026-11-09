import { contestEditSchema, contestIdSchema } from "@/lib/contest-contracts";
import { contestHandler, contestJson, contestUser } from "@/lib/contest-http";
import { updateContest } from "@/lib/contest-server";
export const runtime = "nodejs";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return contestHandler(async () => {
    const user = await contestUser(request);
    const id = contestIdSchema.parse((await params).id);
    const input = contestEditSchema.parse(await contestJson(request));
    return {
      contest: await updateContest(user.id, id, input.version, input.draft),
    };
  });
}
