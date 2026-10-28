import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { readRequestBytes, RequestBodyTimeoutError } from "@/lib/submission-request";

export const runtime = "nodejs";
const handlers = toNextJsHandler(auth);

function authError(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  try {
    const response = await handlers.GET(request);
    return response.status >= 500 ? authError("Account service temporarily unavailable.", 503) : response;
  } catch {
    return authError("Account service temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const body = request.body ? await readRequestBytes(request, 16384) : undefined;
    const response = await handlers.POST(new Request(request.url, { method: request.method, headers: new Headers(request.headers), body: body as BodyInit | undefined }));
    return response.status >= 500 ? authError("Account service temporarily unavailable.", 503) : response;
  } catch (error) {
    if (error instanceof RangeError) return authError("Account request is too large.", 413);
    if (error instanceof RequestBodyTimeoutError) return authError("Account request timed out.", 408);
    return authError("Account service temporarily unavailable.", 503);
  }
}
