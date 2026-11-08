import { z } from 'zod';
import arena from './arena/index.json';
import { filterArena, type ArenaCatalogEntry } from './arena-schema';
import { getEstimatedProblemElo } from './problem-archive';
import { bandFilterIds } from './rating-bands';
import { getProblemTags } from './problem-tags';
import { authoredLibraryPageSchema } from './authored-library-contracts';
import { publicShowcaseSchema } from './community/achievements';

export type ProblemIdentity = { kind: 'arena'; id: string } | { kind: 'authored'; id: string };
export type ProblemKey = `arena:${string}` | `authored:${string}`;
export function problemKey(problem: ProblemIdentity): ProblemKey { return `${problem.kind}:${problem.id}`; }
export function problemHref(problem: ProblemIdentity) { return problem.kind === 'arena' ? `/dashboard/problems/${problem.id}` : `/dashboard/authored/${problem.id}`; }
export const problemKeySchema = z.string().refine(value => {
  if (value.startsWith('arena:')) return arena.problems.some(p => p.id === value.slice(6));
  return value.startsWith('authored:') && z.uuid().safeParse(value.slice(9)).success;
});
export const arenaFiltersSchema = z.strictObject({
  q: z.string().trim().max(200).default(''), tag: z.string().trim().max(80).default(''),
  difficulty: z.enum(['all','unrated',...bandFilterIds]).default('all'),
  source: z.enum(['all','arena','authored']).default('all'), after: problemKeySchema.optional(),
});
export const publicAuthorSchema = z.strictObject({handle:z.string(),displayName:z.string(),...publicShowcaseSchema.shape});
export const collectionEntrySchema = z.strictObject({
  key: problemKeySchema, kind:z.enum(['arena','authored']), id:z.string(), title:z.string(), tags:z.array(z.string()),
  summary:z.string(), elo:z.number().optional(), estimatedDifficulty:z.string().nullable(),
  provenance:authoredLibraryPageSchema.shape.problems.element.shape.provenance.optional(),
  author:publicAuthorSchema.nullable(),
});
export const unifiedArenaPageSchema = z.strictObject({problems:z.array(collectionEntrySchema).max(24),nextCursor:problemKeySchema.nullable(),authoredUnavailable:z.boolean(),attributionUnavailable:z.boolean(),statsEnabled:z.boolean().optional()});
export type CollectionEntry = z.infer<typeof collectionEntrySchema>;
export type UnifiedArenaPage = z.infer<typeof unifiedArenaPageSchema>;
export function staticArenaEntries(filters:z.infer<typeof arenaFiltersSchema>):CollectionEntry[] {
  if(filters.source==='authored'||filters.difficulty==='unrated'||filters.after?.startsWith('authored:'))return [];
  return filterArena(arena.problems as ArenaCatalogEntry[],{query:filters.q,topic:filters.tag||'all',difficulty:filters.difficulty})
    .sort((a,b)=>a.id.localeCompare(b.id)).filter(p=>!filters.after||p.id>filters.after.slice(6))
    .map(p=>({key:problemKey({kind:'arena',id:p.id}),kind:'arena',id:p.id,title:p.title,tags:getProblemTags(p),summary:p.summary,elo:getEstimatedProblemElo(p.id),estimatedDifficulty:null,author:null}));
}
