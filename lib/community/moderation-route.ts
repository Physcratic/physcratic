import 'server-only';
import {profileReply} from './profile-api';
export const communityModerationEnabled=(env:Record<string,string|undefined>=process.env)=>env.COMMUNITY_MODERATION_ENABLED==='true'&&env.COMMUNITY_STAFF_ENABLED==='true';
export const communityModerationUiEnabled=(env:Record<string,string|undefined>=process.env)=>communityModerationEnabled(env)&&env.COMMUNITY_MODERATION_UI_ENABLED==='true';
export type ModerationArea='reports'|'appeals'|'staff';
export function createModerationRoute(area:ModerationArea,enabled=communityModerationEnabled,load=()=>import('./moderation-server')){return async(request:Request)=>{if(!enabled())return profileReply({error:'Moderation is disabled.'},503);try{return await(await load()).moderationApi(area,request);}catch{return profileReply({error:'Moderation is temporarily unavailable.'},503);}};}
