import {z} from 'zod';
import {problemKeySchema} from '../unified-arena';
export const commentKeySchema=problemKeySchema.transform(k=>k.startsWith('authored:')?k.toLowerCase():k);
export const commentBodySchema=z.string().trim().min(1).max(2000).refine(s=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(s),'Use plain text without control characters.');
const uuid=z.uuid().transform(v=>v.toLowerCase());
const base={key:commentKeySchema};
export const commentWriteSchema=z.discriminatedUnion('action',[
 z.strictObject({...base,action:z.literal('create'),parent:uuid.nullable(),requestId:uuid,body:commentBodySchema}),
 z.strictObject({...base,action:z.literal('edit'),id:uuid,version:z.number().int().positive(),body:commentBodySchema}),
 z.strictObject({...base,action:z.literal('delete'),id:uuid,version:z.number().int().positive()}),
 z.strictObject({...base,action:z.literal('like'),id:uuid,liked:z.boolean()}),
]);
export const commentCursorSchema=z.strictObject({key:commentKeySchema,parent:uuid.nullable(),sort:z.enum(['newest','top']),score:z.string().regex(/^\d{1,19}$/).refine(s=>BigInt(s)<=BigInt(Number.MAX_SAFE_INTEGER)),created:z.string().datetime({offset:true}),id:uuid});
export const commentListSchema=z.strictObject({...base,parent:uuid.optional(),sort:z.enum(['newest','top']).default('newest'),after:z.string().max(1200).optional()});
const authorSchema=z.strictObject({handle:z.string(),displayName:z.string()}).nullable();
export const commentSchema=z.strictObject({moderationReason:z.string().max(1000).nullable().optional(),moderationState:z.enum(['visible','held','hidden']).optional(),id:z.uuid(),parentId:z.uuid().nullable(),body:z.string(),version:z.number().int(),score:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),depth:z.number().int().min(0).max(64),createdAt:z.string(),editedAt:z.string().nullable(),deleted:z.boolean(),owned:z.boolean(),liked:z.boolean(),hasReplies:z.boolean(),author:authorSchema,replyAuthor:authorSchema});
export const commentsPageSchema=z.strictObject({comments:z.array(commentSchema).max(20),nextCursor:z.string().nullable()});
export type DiscussionComment=z.infer<typeof commentSchema>;

export const commentAckSchema=z.strictObject({id:uuid,liked:z.boolean().optional()});
