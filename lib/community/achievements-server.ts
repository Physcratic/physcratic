import "server-only";
import { pool } from "../db";
import { submissionUser, isSubmissionOrigin } from "../submission-server";
import { createCommunityAchievementsApi } from "./achievements-api";
import { medalShowcaseEnabled } from "./achievements-route";
export const communityAchievementsApi = createCommunityAchievementsApi({ pool, medalsEnabled:medalShowcaseEnabled, user: submissionUser, origin: isSubmissionOrigin });
