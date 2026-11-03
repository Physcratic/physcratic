import 'server-only';
import {profileReply} from './profile-api';
export const communityProblemStatsEnabled=(env:Record<string,string|undefined>=process.env)=>env.COMMUNITY_PROBLEM_STATS_ENABLED==='true';
export function createProblemStatsRoute(enabled=communityProblemStatsEnabled,load=()=>import('./problem-stats-server')){return async(r:Request)=>{if(!enabled())return profileReply({error:'Problem statistics are disabled.'},503);try{return await(await load()).problemStatsApi(r);}catch{return profileReply({error:'Problem statistics are temporarily unavailable.'},503);}};}
export const problemStatsRoute=createProblemStatsRoute();
