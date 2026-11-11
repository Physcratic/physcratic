import {z} from 'zod';
export const deletionRequestSchema=z.strictObject({confirmation:z.literal('DELETE MY ACCOUNT'),password:z.string().min(1).max(128),requestToken:z.string().regex(/^[a-f0-9]{64}$/)});
export const deletionStatusSchema=z.strictObject({requestToken:z.string().regex(/^[a-f0-9]{64}$/)});
export const deletionReceiptSchema=z.strictObject({deletionId:z.uuid(),state:z.enum(['database-erased-cleanup-pending','complete']),pendingObjects:z.number().int().nonnegative()});
export const deletionHeaders={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
export const deletionReply=(body:unknown,status=200)=>Response.json(body,{status,headers:deletionHeaders});
