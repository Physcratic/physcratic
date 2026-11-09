import 'server-only';
import type { Pool } from 'pg';
import { practiceCheckCatalog, type PracticeCheckCatalogEntry } from './practice-check-catalog';
import { practiceProgressSchema, type PracticeProgress } from './practice-check-contracts';
/** Server-only reader. The caller must supply its authenticated session identity. */
export async function readPracticeProgress(pool:Pool,userId:string,catalog:PracticeCheckCatalogEntry[]=practiceCheckCatalog()):Promise<PracticeProgress>{
  function boundedQuery<R extends import('pg').QueryResultRow>(pool:Pool,text:string,values:unknown[]){const config={text,values,query_timeout:5000};return pool.query<R>(config);}
  // One MVCC snapshot. At most 1,000 server-known identities, no old-version merge.
  if(catalog.length>1000)throw Error('Progress catalogue exceeds its bound');
  const entries=catalog.map(e=>({kind:e.kind,problem_id:e.metadata.problemId,version:e.metadata.version,required:e.metadata.parts.filter(p=>p.kind!=='self-review').map(p=>p.id)}));
  const {rows}=await boundedQuery<{kind:'practice'|'arena';problem_id:string;version:string;total:string;latest:Date;correct:string[];incorrect:string[];all_checks:string}>(pool,`WITH current AS (
    SELECT * FROM jsonb_to_recordset($2::jsonb) AS c(kind text,problem_id text,version text,required jsonb)
  ), totals AS (SELECT count(*)::text AS all_checks FROM practice_check_attempt WHERE user_id=$1), states AS (
  SELECT c.kind,c.problem_id,c.version,a.total,a.latest,p.correct,p.incorrect FROM current c
  JOIN LATERAL (SELECT count(*)::text AS total,max(created_at) AS latest FROM practice_check_attempt a
    WHERE a.user_id=$1 AND a.kind=c.kind AND a.problem_id=c.problem_id AND a.version=c.version) a ON a.latest IS NOT NULL
  CROSS JOIN LATERAL (SELECT coalesce(array_agg(part_id) FILTER(WHERE correct),'{}'::text[]) AS correct,
    coalesce(array_agg(part_id) FILTER(WHERE NOT correct),'{}'::text[]) AS incorrect FROM practice_check_part p
    WHERE p.user_id=$1 AND p.kind=c.kind AND p.problem_id=c.problem_id AND p.version=c.version
    AND c.required ? p.part_id) p)
  SELECT s.*,t.all_checks FROM totals t LEFT JOIN states s ON true ORDER BY s.latest DESC NULLS LAST,s.kind,s.problem_id`,[userId,JSON.stringify(entries)]);
  const byId=new Map(catalog.map(e=>[`${e.kind}:${e.metadata.problemId}`,e]));
  const progress=rows.filter(row=>row.problem_id!==null).map(row=>{
    const entry=byId.get(`${row.kind}:${row.problem_id}`)!;
    const required=entry.metadata.parts.filter(p=>p.kind!=='self-review').length;
    const correct=row.correct.length,incorrect=row.incorrect.length;
    return {kind:row.kind,problemId:row.problem_id,version:row.version,title:entry.title,href:`/dashboard/problems/${row.problem_id}`,
      status:required>0&&correct===required?'solved':correct+incorrect>0?'in-progress':'not-graded',correctParts:correct,requiredParts:required,incorrectParts:incorrect,lastCheckedAt:row.latest.toISOString()};
  });
  const savedChecks=Number(rows[0]?.all_checks??0);
  return practiceProgressSchema.parse({progress,savedChecks,solvedProblems:progress.filter(p=>p.status==='solved').length,inProgressProblems:progress.filter(p=>p.status==='in-progress').length,notGradedProblems:progress.filter(p=>p.status==='not-graded').length});
}
