import 'server-only';
import { pool } from '../db';
import { submissionUser, isSubmissionOrigin } from '../submission-server';
import { trustedCommentIp } from './comments-ip';
import { communityProfilesEnabled } from './profile-route';
import { createActionsApi } from './actions-api';

export const actionsApi = createActionsApi({
  pool, user: submissionUser, origin: isSubmissionOrigin,
  ip: trustedCommentIp, profiles: communityProfilesEnabled,
});
