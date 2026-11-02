import "server-only";
import { pool } from "../db";
import { submissionUser, isSubmissionOrigin } from "../submission-server";
import { createProfileMediaApi } from "./profile-media-api";
import { createPrivateProfileStorage } from "./profile-media-storage";
export const profileMediaApi = createProfileMediaApi({ pool, user: submissionUser,
  origin: isSubmissionOrigin, storage: createPrivateProfileStorage() });
