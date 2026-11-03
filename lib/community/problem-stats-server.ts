import 'server-only';
import {pool} from '../db';
import {submissionUser,isSubmissionOrigin} from '../submission-server';
import {createProblemStatsApi} from './problem-stats-api';
export const problemStatsApi=createProblemStatsApi({pool,user:submissionUser,origin:isSubmissionOrigin});
