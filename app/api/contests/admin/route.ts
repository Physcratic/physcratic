import { contestDraftSchema } from "@/lib/contest-contracts";
import { contestHandler, contestJson, contestUser } from "@/lib/contest-http";
import { createContest, getContestAdminData } from "@/lib/contest-server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return contestHandler(async () =>
    getContestAdminData((await contestUser(request, false)).id),
  );
}
export async function POST(request: Request) {
  return contestHandler(async () => {
    const user = await contestUser(request);
    return {
      contest: await createContest(
        user.id,
        contestDraftSchema.parse(await contestJson(request)),
      ),
    };
  }, 201);
}
