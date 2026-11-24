import "server-only";
import { pool } from "../db";
import { submissionUser, isSubmissionOrigin } from "../submission-server";
import { createCommunityAchievementsApi } from "./achievements-api";
import { communityAchievementsEnabled, externalMedalShowcaseEnabled, medalShowcaseEnabled } from "./achievements-route";
export const communityAchievementsApi = createCommunityAchievementsApi({
  pool, earnedEnabled: communityAchievementsEnabled, medalsEnabled: medalShowcaseEnabled,
  externalMedalsEnabled: externalMedalShowcaseEnabled, user: submissionUser, origin: isSubmissionOrigin,
});
