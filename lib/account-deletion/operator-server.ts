import 'server-only';
import {Pool} from 'pg';
import {verifyPassword} from 'better-auth/crypto';
import {auth} from '../auth';
import {pool} from '../db';
import {isSubmissionOrigin} from '../submission-server';
import {createDeletionOperatorApi} from './operator';
import {createPrivateAuthorStorage} from '../author-media-storage';
import {createPrivateProfileStorage} from '../community/profile-media-storage';
import {createPrivateMedalStorage} from '../community/medal-storage';
const connectionString=process.env.ACCOUNT_DELETION_OPERATOR_DATABASE_URL;
if(!connectionString)throw Error('Dedicated operator connection is not configured');
const operatorPool=new Pool({connectionString,max:2,connectionTimeoutMillis:3000,statement_timeout:20000});
const author=createPrivateAuthorStorage(),profile=createPrivateProfileStorage(),medal=createPrivateMedalStorage();
export const deletionOperatorApi=createDeletionOperatorApi({pool:operatorPool,origin:isSubmissionOrigin,
 session:async request=>(await auth.api.getSession({headers:request.headers}))??null,
 password:async(userId,password)=>{const {rows}=await pool.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=$2',[userId,'credential']);const hash=rows[0]?.password;return{hash:hash??'',verified:Boolean(hash)&&await verifyPassword({hash,password})};},
},{del:async(provider,pathname)=>{await({author,profile,medal}[provider]).del(pathname);}});
