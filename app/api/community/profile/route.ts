import { communityProfileRoute } from "@/lib/community/profile-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => communityProfileRoute("own", request);
export const PATCH = (request: Request) => communityProfileRoute("own", request);
