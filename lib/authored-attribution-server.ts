import "server-only";
import { pool } from "./db";
import { createAuthoredAttributionApi } from "./authored-attribution-api";
export const authoredAttributionApi = createAuthoredAttributionApi(pool, () => process.env.COMMUNITY_AUTHORSHIP_ENABLED === "true" && process.env.COMMUNITY_PROFILES_ENABLED === "true");
