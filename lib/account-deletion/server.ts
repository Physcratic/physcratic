import 'server-only';
import {Pool} from 'pg';
import {verifyPassword} from 'better-auth/crypto';
import {auth} from '../auth';
import {pool} from '../db';
import {isSubmissionOrigin} from '../submission-server';
import {createAccountDeletionApi} from './api';
const connectionString=process.env.ACCOUNT_DELETION_DATABASE_URL;
if(!connectionString)throw Error('Dedicated deletion connection is not configured');
const deletionPool=new Pool({connectionString,max:2,connectionTimeoutMillis:3000,statement_timeout:20000});
export const accountDeletionApi=createAccountDeletionApi({pool:deletionPool,origin:isSubmissionOrigin,
 session:async request=>(await auth.api.getSession({headers:request.headers}))??null,
 password:async(userId,password)=>{const {rows}=await pool.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=$2',[userId,'credential']);const hash=rows[0]?.password;return{hash:hash??'',verified:Boolean(hash)&&await verifyPassword({hash,password})};},
});
