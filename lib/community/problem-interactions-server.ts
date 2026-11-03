import 'server-only';
import { pool } from '../db';
import { submissionUser,isSubmissionOrigin } from '../submission-server';
import { createProblemInteractionsApi } from './problem-interactions-api';
export const problemInteractionsApi=createProblemInteractionsApi({pool,user:submissionUser,origin:isSubmissionOrigin});
