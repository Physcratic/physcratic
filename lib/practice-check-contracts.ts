import { z } from 'zod';
import { archiveGradeRequestSchema, archiveGradeResponseSchema } from './archive-grading-contracts';

export const practiceCheckPolicy = Object.freeze({ requestsPerMinute:60, submissionsPerMinute:20, attemptsPerDay:100, maxBodyBytes:65536, historyPageSize:50 });
export const practiceCheckInputSchema = archiveGradeRequestSchema.superRefine((input,ctx)=>{
  if(!input.answers.length || !input.answers.some(a=>a.latex.trim())) ctx.addIssue({code:'custom',message:'Enter an answer before saving a check.'});
  if(input.answers.some(a=>a.latex.includes('\u0000') || !a.latex.isWellFormed())) ctx.addIssue({code:'custom',message:'Answer text must be valid PostgreSQL-compatible Unicode.'});
});
export const practiceCheckRequestSchema=practiceCheckInputSchema.safeExtend({idempotencyKey:z.uuid().transform(value=>value.toLowerCase())}).transform(input=>({...input,answers:[...input.answers].sort((a,b)=>a.partId.localeCompare(b.partId,'en'))}));
export type PracticeCheckRequest=z.infer<typeof practiceCheckRequestSchema>;
export const practiceKindSchema=z.enum(['practice','arena']);
export const practiceCheckSchema=archiveGradeResponseSchema.extend({
  id:z.uuid(),kind:practiceKindSchema,version:archiveGradeRequestSchema.shape.version,createdAt:z.iso.datetime(),
  answers:archiveGradeRequestSchema.shape.answers,
});
export type PracticeCheck=z.infer<typeof practiceCheckSchema>;
export const practiceCheckReceiptSchema=z.strictObject({attempt:practiceCheckSchema,saved:z.literal(true),replayed:z.boolean()});
export const practiceCheckHistorySchema=z.strictObject({attempts:z.array(practiceCheckSchema).max(50),nextCursor:z.string().max(256).nullable()});
export const practiceProgressEntrySchema=z.strictObject({
  kind:practiceKindSchema,problemId:archiveGradeRequestSchema.shape.problemId,version:archiveGradeRequestSchema.shape.version,
  title:z.string().max(200),href:z.string().regex(/^\/dashboard\/problems\/[a-z]+(?:-[a-z]+)*$/),
  status:z.enum(['solved','in-progress','not-graded']),correctParts:z.number().int().nonnegative(),
  requiredParts:z.number().int().min(0).max(64),incorrectParts:z.number().int().nonnegative(),lastCheckedAt:z.iso.datetime(),
});
export const practiceProgressSchema=z.strictObject({
  progress:z.array(practiceProgressEntrySchema).max(1000),savedChecks:z.number().int().nonnegative(),
  solvedProblems:z.number().int().nonnegative(),inProgressProblems:z.number().int().nonnegative(),notGradedProblems:z.number().int().nonnegative(),
});
export type PracticeProgress=z.infer<typeof practiceProgressSchema>;
