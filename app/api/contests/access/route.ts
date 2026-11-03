import { contestHandler } from "@/lib/contest-http";
import { isContestAdmin } from "@/lib/contest-server";
import { submissionUser } from "@/lib/submission-server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return contestHandler(async () => {
    const user = await submissionUser(request);
    return {
      canManage: Boolean(
        user?.emailVerified && (await isContestAdmin(user.id)),
      ),
    };
  });
}
