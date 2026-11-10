import "server-only";
import { pool } from "./db";
import { createAuthoredAttributionApi } from "./authored-attribution-api";
export const authoredAttributionApi = createAuthoredAttributionApi(pool);
