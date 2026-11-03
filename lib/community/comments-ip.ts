import 'server-only';
import {isIP} from 'node:net';
import {createHmac} from 'node:crypto';
// Trust only the platform-overwritten single-IP header on Vercel. Never select a hop from caller chains.
export function trustedCommentIp(request:Request,env:Record<string,string|undefined>=process.env){
 const value=env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.trim():undefined;
 if(!value||value.includes('%')||!isIP(value)||!env.BETTER_AUTH_SECRET)return 'unknown';
 let normalized=value;
 if(isIP(value)===6){
  const expand=(part:string)=>part?part.split(':').flatMap(group=>{if(!group.includes('.'))return [group];const n=group.split('.').map(Number);return [((n[0]<<8)|n[1]).toString(16),((n[2]<<8)|n[3]).toString(16)];}):[];
  const [left,right='']=value.toLowerCase().split('::'),a=expand(left),b=expand(right);
  const groups=[...a,...Array(8-a.length-b.length).fill('0'),...b].map(n=>n.padStart(4,'0'));
  if(groups.slice(0,5).every(g=>g==='0000')&&groups[5]==='ffff'){const x=parseInt(groups[6],16),y=parseInt(groups[7],16);normalized=[x>>8,x&255,y>>8,y&255].join('.');}
  else normalized=groups.slice(0,4).join(':')+'::/64';
 }
 return createHmac('sha256',env.BETTER_AUTH_SECRET).update(normalized).digest('hex');
}
