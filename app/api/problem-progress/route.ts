import { problemProgressApi } from "@/lib/problem-progress-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => problemProgressApi(request);
