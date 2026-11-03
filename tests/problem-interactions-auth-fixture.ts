import { useSyncExternalStore } from 'react';
let value={data:{user:{id:'fixture-a',emailVerified:true}},isPending:false,error:null};
const listeners=new Set<()=>void>();
export function fixtureViewer(id:string,emailVerified=true){value={...value,data:{user:{id,emailVerified}}};for(const notify of listeners)notify();}
export const authClient={useSession:()=>useSyncExternalStore(notify=>{listeners.add(notify);return()=>{listeners.delete(notify);};},()=>value,()=>value)};
