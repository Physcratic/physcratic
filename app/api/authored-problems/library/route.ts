import { pool } from "@/lib/db";
import { createAuthoredLibraryApi } from "@/lib/authored-library-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createAuthoredLibraryApi(pool);
