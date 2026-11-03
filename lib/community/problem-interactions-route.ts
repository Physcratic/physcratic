import 'server-only';
import { profileReply } from './profile-api';
export const problemInteractionsEnabled=(env:Record<string,string|undefined>=process.env)=>env.COMMUNITY_PROBLEM_INTERACTIONS_ENABLED==='true';
export function createProblemInteractionsRoute(enabled=problemInteractionsEnabled,load=()=>import('./problem-interactions-server')) {
 return async(request:Request)=>{
  if(!enabled())return profileReply({error:'Problem interactions are disabled.',disabled:true},503);
  try{return await (await load()).problemInteractionsApi(request);}catch{return profileReply({error:'Problem interactions are unavailable.'},503);}
 };
}
export const problemInteractionsRoute=createProblemInteractionsRoute();
