import {accountDeletionEnabled} from '@/lib/account-deletion/route';
import {deletionReply} from '@/lib/account-deletion/contracts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!accountDeletionEnabled())return deletionReply({error:'Account deletion is not available.'},503);
 try{return(await import('@/lib/account-deletion/operator-server')).deletionOperatorApi(request);}catch{return deletionReply({error:'Operator service is unavailable.'},503);}
}
