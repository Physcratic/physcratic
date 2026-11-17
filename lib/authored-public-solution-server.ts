import "server-only";
import { pool } from "./db";
import { privateAuthorStorage } from "./author-media-storage";
import { createPublicAuthoredSolutionApi } from "./authored-public-solution-api";
export const publicAuthoredSolutionApi = createPublicAuthoredSolutionApi({ pool, storage: privateAuthorStorage });
