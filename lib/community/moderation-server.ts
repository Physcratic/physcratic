import 'server-only';
import {pool} from '../db';
import {submissionUser,isSubmissionOrigin} from '../submission-server';
import {trustedCommentIp} from './comments-ip';
import {communityProfilesEnabled} from './profile-route';
import {createModerationApi} from './moderation-api';
import {communityDiscussionReady} from './comments-route';
export const moderationApi=createModerationApi({pool,user:submissionUser,origin:isSubmissionOrigin,ip:trustedCommentIp,profiles:communityProfilesEnabled,commentsPublic:communityDiscussionReady});
