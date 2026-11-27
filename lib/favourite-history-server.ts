import "server-only";
import { pool } from "./db";
import { submissionUser } from "./submission-server";
import { createFavouriteHistoryApi } from "./favourite-history-api";

export const favouriteHistoryApi = createFavouriteHistoryApi({ pool, user: submissionUser, cursorSecret: process.env.BETTER_AUTH_SECRET });
