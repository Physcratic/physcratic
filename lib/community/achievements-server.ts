import "server-only";
import { pool } from "../db";
import { submissionUser, isSubmissionOrigin } from "../submission-server";
import { createCommunityAchievementsApi } from "./achievements-api";
export const communityAchievementsApi = createCommunityAchievementsApi({ pool, user: submissionUser, origin: isSubmissionOrigin });
