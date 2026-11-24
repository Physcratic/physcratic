import 'server-only';
import { profileReply } from './profile-api';
export type MedalAction='submit'|'own'|'queue'|'review'|'proof'|'detail';
export function medalsEnabled(env:Record<string,string|undefined>=process.env){return env.COMMUNITY_MEDALS_ENABLED==='true'&&env.COMMUNITY_STAFF_ENABLED==='true';}
export function createMedalRoute(enabled=medalsEnabled,load=()=>import('./medal-server')){
 return async(action:MedalAction,request:Request,id?:string)=>{
  if(!enabled())return profileReply({error:'Medal verification is disabled.'},503);
  try{return await(await load()).medalApi(action,request,id);}catch{return profileReply({error:'Medal verification unavailable.'},503);}
 };
}
export const medalRoute=createMedalRoute();
export function verificationUiEnabled(env:Record<string,string|undefined>=process.env){return medalsEnabled(env)&&env.COMMUNITY_VERIFICATION_UI_ENABLED==='true';}
