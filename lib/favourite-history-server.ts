import "server-only";
import { pool } from "./db";
import { submissionUser } from "./submission-server";
import { createFavouriteHistoryApi } from "./favourite-history-api";
import { favouriteHistoryCursorSecret } from "./favourite-history-config";

export const favouriteHistoryApi = createFavouriteHistoryApi({ pool, user: submissionUser, cursorSecret: favouriteHistoryCursorSecret() });
