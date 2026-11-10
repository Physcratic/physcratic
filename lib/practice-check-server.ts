import 'server-only';
import { pool } from './db';
import { submissionUser, isSubmissionOrigin } from './submission-server';
import { createPracticeCheckApi } from './practice-check-api';
export const practiceCheckApi=createPracticeCheckApi({pool,user:submissionUser,origin:isSubmissionOrigin});
