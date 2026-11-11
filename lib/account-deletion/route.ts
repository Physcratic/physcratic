import 'server-only';
import {deletionReply} from './contracts';
export const accountDeletionEnabled=(env:Record<string,string|undefined>=process.env)=>env.ACCOUNT_DELETION_ENABLED==='true';
export function createAccountDeletionRoute(enabled=accountDeletionEnabled,load=()=>import('./server')){
 return async(request:Request)=>{
  if(!enabled())return deletionReply({error:'Account deletion is not available.'},503);
  try{return await(await load()).accountDeletionApi(request);}catch{return deletionReply({error:'Account deletion is unavailable. No completion is confirmed. Retry with the same request token.'},503);}
 };
}
export const accountDeletionRoute=createAccountDeletionRoute();
