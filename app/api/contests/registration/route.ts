import { z } from "zod";
import { contestIdSchema } from "@/lib/contest-contracts";
import { contestHandler, contestJson, contestUser } from "@/lib/contest-http";
import { setContestRegistration } from "@/lib/contest-server";

const schema = z.strictObject({
  contestId: contestIdSchema,
  registered: z.boolean(),
});
export const runtime = "nodejs";
export async function POST(request: Request) {
  return contestHandler(async () => {
    const user = await contestUser(request);
    const input = schema.parse(await contestJson(request));
    return setContestRegistration(user.id, input.contestId, input.registered);
  });
}
