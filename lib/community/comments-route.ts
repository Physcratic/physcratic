import 'server-only';
import {profileReply} from './profile-api';
// Batch 4 cannot launch production: Batch 5 must explicitly replace this lock after moderation/reporting verification.
export function communityCommentsEnabled(env:Record<string,string|undefined>=process.env){return env.COMMUNITY_COMMENTS_ENABLED==='true'&&(env.NODE_ENV==='development'||env.NODE_ENV==='test'||env.VERCEL_ENV==='preview')&&env.VERCEL_ENV!=='production';}
export function createCommentsRoute(enabled=communityCommentsEnabled,load=()=>import('./comments-server')){return async(r:Request)=>{if(!enabled())return profileReply({error:'Discussions are disabled.'},503);try{return await(await load()).commentsApi(r);}catch{return profileReply({error:'Discussions are temporarily unavailable.'},503);}};}
export const commentsRoute=createCommentsRoute();
