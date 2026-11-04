import {z} from 'zod';
import {reportSubject} from './moderation-contracts';
const base={id:z.uuid(),state:z.string(),version:z.number().int(),reason:z.string(),resolution:z.string(),createdAt:z.string(),updatedAt:z.string()};
export const reportCaseSchema=z.object({...base,subject:reportSubject,details:z.string()});
export const appealCaseSchema=z.object({...base,commentId:z.uuid(),contentVersion:z.number().int(),reviewVersion:z.number().int()});
export const heldCaseSchema=z.object({id:z.uuid(),state:z.literal('held'),version:z.number().int(),contentVersion:z.number().int(),codes:z.array(z.string()),policyVersion:z.string(),updatedAt:z.string()});
export const moderationCaseSchema=z.union([reportCaseSchema,appealCaseSchema,heldCaseSchema]);
export const casePageSchema=z.object({role:z.enum(['admin','moderator']).optional(),cases:z.array(moderationCaseSchema).max(20),nextCursor:z.uuid().nullable()});
export type ModerationCase=z.infer<typeof moderationCaseSchema>;
export const reviewDetailSchema=z.object({role:z.enum(['admin','moderator']),record:z.object({
 id:z.uuid(),version:z.number().int(),state:z.string().optional(),key:z.string().optional(),parentId:z.uuid().nullable().optional(),rootId:z.uuid().optional(),threadVersion:z.number().int().optional(),threadLocked:z.boolean().optional(),locked:z.boolean().optional(),deleted:z.boolean().optional(),contentVersion:z.number().int().optional(),commentId:z.uuid().optional(),subject:reportSubject.optional(),reason:z.string().optional(),details:z.string().optional(),resolution:z.string().optional(),codes:z.array(z.string()).optional(),policyVersion:z.string().optional(),
}),audit:z.array(z.object({id:z.string(),actorId:z.string().nullable(),action:z.string(),version:z.number().int(),reason:z.string(),createdAt:z.string(),data:z.record(z.string(),z.unknown())})).max(50),nextAudit:z.string().nullable(),evidence:z.array(z.object({contentVersion:z.number().int(),body:z.string(),deleted:z.boolean(),createdAt:z.string()})).max(20),nextContent:z.number().int().nullable()});
export type ReviewDetail=z.infer<typeof reviewDetailSchema>;
export class ModerationRequestError extends Error{
 constructor(public status:number){super(status===401?'Sign in to continue.':status===403?'Current permission or an independent reviewer is required.':status===404?'This item is no longer available to this account.':status===409?'This case changed or already exists. Reload its status before retrying.':status===429?'Request limit reached. Wait before retrying.':status===400||status===413?'Check the selected reason and text limits.':'The request could not be confirmed. Check the history before retrying.');}
}
export async function moderationFetch(path:string,init:RequestInit={}){
 const r=await fetch(path,{...init,credentials:'same-origin',cache:'no-store',signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
 if(!r.ok)throw new ModerationRequestError(r.status);return r.json();
}
export const caseTitle=(c:ModerationCase)=>'subject'in c?(c.subject.kind==='profile'?'Profile @'+c.subject.handle:c.subject.kind==='comment'?'Comment '+c.subject.id.slice(0,8):c.subject.key):'commentId'in c?'Appeal for '+c.commentId.slice(0,8):'Held comment '+c.id.slice(0,8);
