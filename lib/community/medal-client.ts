import { z } from 'zod';
import { publicMedalSchema } from './achievements';
export const awardLabels={gold:'Gold',silver:'Silver',bronze:'Bronze','honourable-mention':'Honourable Mention'} as const;
export const claimSchema=publicMedalSchema.omit({id:true}).extend({id:z.uuid(),certificateName:z.string(),state:z.enum(['uploading','pending','approved','rejected','more-info','revoked']),version:z.number().int(),reason:z.string(),createdAt:z.string(),updatedAt:z.string()});
export type MedalClaim=z.infer<typeof claimSchema>;
export const claimListSchema=z.object({claims:z.array(claimSchema).max(50)});
export const detailSchema=z.object({claim:claimSchema,audit:z.array(z.object({version:z.number(),actorId:z.string(),state:z.string(),reason:z.string(),createdAt:z.string()}))});
export type ClaimDetail=z.infer<typeof detailSchema>;
export const claimHeader=(value:unknown)=>JSON.stringify(value).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export class MedalRequestError extends Error{constructor(public status:number){super(status===401?'Sign in to continue.':status===403?'You do not have permission for this action. Your session or staff access may have changed.':status===409?'This claim changed or already exists. Reload its status before retrying.':status===429?'The request limit was reached. Wait before retrying; uploads are limited to five attempts per UTC day.':status===400||status===413||status===415?'Check the claim fields and choose a valid PDF, at most 5 MiB and 20 pages.':'Verification is unavailable. Reload your claim history before retrying an upload.');}}
export async function medalFetch(path:string,init:RequestInit={}){const r=await fetch(path,{...init,credentials:'same-origin',cache:'no-store',signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});if(!r.ok)throw new MedalRequestError(r.status);return r;}
export function metadataCsv(claims:MedalClaim[]){const escape=(v:unknown)=>'"'+String(v).replace(/^[\s]*[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\ufeff'+[['Claim ID','Competition','Award','Year','Country','State'],...claims.map(c=>[c.id,c.competition,awardLabels[c.award],c.year,c.country,c.state])].map(row=>row.map(escape).join(',')).join('\r\n');}
export function saveDownload(blob:Blob,name:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
