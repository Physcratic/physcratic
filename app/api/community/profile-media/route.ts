import { profileMediaRoute } from "@/lib/community/profile-media-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => profileMediaRoute("metadata", request);
