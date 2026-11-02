import 'server-only';
import { pool } from '../db';
import { submissionUser,isSubmissionOrigin } from '../submission-server';
import { createMedalApi } from './medal-api';
import { createPrivateMedalStorage } from './medal-storage';
export const medalApi=createMedalApi({pool,user:submissionUser,origin:isSubmissionOrigin,storage:createPrivateMedalStorage()});
