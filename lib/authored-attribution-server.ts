import "server-only";
import { pool } from "./db";
import { createAuthoredAttributionApi } from "./authored-attribution-api";
import { communityProfilesEnabled } from "./community/profile-route";
export const authoredAttributionApi = createAuthoredAttributionApi(pool, communityProfilesEnabled);
