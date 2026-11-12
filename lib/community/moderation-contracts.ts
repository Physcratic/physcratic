import {z} from 'zod';
import {commentKeySchema} from './comments-contracts';
import {profileHandleSchema} from './profile-contracts';
import {moderationNote} from './moderation-note';
export {moderationNote} from './moderation-note';
const uuid=z.uuid().transform(v=>v.toLowerCase());
export const reportSubject=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('comment'),key:commentKeySchema,id:uuid}),
 z.strictObject({kind:z.literal('profile'),handle:profileHandleSchema}),
 z.strictObject({kind:z.literal('problem'),key:commentKeySchema}),
]);
export const reportInput=z.strictObject({requestId:uuid,subject:reportSubject,reason:z.enum(['abuse','hate','threat','spam','privacy','rights','other']),details:moderationNote.or(z.literal('')).default('')});
export const appealInput=z.strictObject({requestId:uuid,key:commentKeySchema,commentId:uuid,reason:moderationNote});
export const decisionInput=z.discriminatedUnion('action',[
 z.strictObject({action:z.literal('report'),id:uuid,version:z.number().int().positive().max(2147483647),state:z.enum(['triaged','dismissed','actioned']),reason:moderationNote}),
 z.strictObject({action:z.literal('comment'),id:uuid,version:z.number().int().positive().max(2147483647),contentVersion:z.number().int().positive().max(2147483647),state:z.enum(['hidden','visible']),reason:moderationNote}),
 z.strictObject({action:z.literal('thread'),id:uuid,key:commentKeySchema,version:z.number().int().nonnegative().max(2147483647),locked:z.boolean(),reason:moderationNote}),
 z.strictObject({action:z.literal('appeal'),id:uuid,version:z.number().int().positive().max(2147483647),state:z.enum(['accepted','rejected']),reason:moderationNote}),
]);
export const ownCasesQuery=z.strictObject({id:uuid.optional(),after:uuid.optional()}).refine(v=>!v.id||!v.after);
export const staffQuery=z.strictObject({queue:z.enum(['reports','held','appeals']).optional(),after:uuid.optional(),item:z.enum(['report','comment','thread','appeal']).optional(),id:uuid.optional(),beforeAudit:z.string().regex(/^[1-9]\d{0,17}$/).optional(),beforeContent:z.coerce.number().int().positive().max(2147483647).optional()}).refine(v=>v.item?Boolean(v.id)&&!v.queue&&!v.after:!v.id&&!v.beforeAudit&&!v.beforeContent);
