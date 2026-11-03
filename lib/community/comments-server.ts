import 'server-only';
import {pool} from '../db';
import {submissionUser,isSubmissionOrigin} from '../submission-server';
import {communityProfilesEnabled} from './profile-route';
import {trustedCommentIp} from './comments-ip';
import {createCommentsApi} from './comments-api';
export const commentsApi=createCommentsApi({pool,user:submissionUser,origin:isSubmissionOrigin,ip:trustedCommentIp,profiles:communityProfilesEnabled});
