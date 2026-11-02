import "server-only";
import { pool } from "../db";
import { submissionUser, isSubmissionOrigin } from "../submission-server";
import { createCommunityProfileApi } from "./profile-api";

export const communityProfileApi = createCommunityProfileApi({ pool, user: submissionUser, origin: isSubmissionOrigin });
