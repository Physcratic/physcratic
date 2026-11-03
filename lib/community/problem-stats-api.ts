import 'server-only';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {profileReply} from './profile-api';
import {readRequestBytes,RequestBodyTimeoutError} from '../submission-request';
import {statsKeysSchema,favouriteWriteSchema,statsPageSchema} from './problem-stats-contracts';
type Deps={pool:Pool;user:(r:Request)=>Promise<{id:string;emailVerified?:boolean}|null|undefined>;origin:(r:Request)=>boolean};
class StatsError extends Error{constructor(public status:number,message:string){super(message);}}
// One batch, <=20,001 indexed correct-attempt rows. An exceeded budget is unknown, never a partial count.
export async function readProblemStats(pool:Pick<Pool,'query'>,keys:string[],userId:string|null){
 const authored=keys.filter(k=>k.startsWith('authored:')).map(k=>k.slice(9));
 const query={text:`WITH publications AS MATERIALIZED (
  SELECT p.id,p.published_revision_id AS revision,p.owner_id,r.schema_version FROM authored_problem p
  JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id
  WHERE p.id=ANY($2::uuid[]) AND p.state='published'
 ), scan AS MATERIALIZED (
  SELECT a.user_id,a.revision_id,a.part_id,a.reason,a.engine_version,a.answer->>'kind' AS kind
  FROM authored_attempt a WHERE a.revision_id IN (SELECT revision FROM publications) AND a.status='correct' AND a.assisted=false LIMIT 20001
 ), completed AS (
  SELECT p.id,a.user_id FROM publications p JOIN scan a ON a.revision_id=p.revision
  JOIN "user" u ON u.id=a.user_id AND u."emailVerified"=true
  JOIN authored_revision_part rp ON rp.revision_id=p.revision AND rp.part_id=a.part_id
  WHERE a.user_id<>p.owner_id AND p.schema_version=1 AND
   ((rp.answer_mode='numeric' AND a.engine_version='numeric-v1' AND a.reason='within-tolerance' AND a.kind='numeric')
    OR (rp.answer_mode='expression' AND a.engine_version='symbolic-v1' AND a.reason='symbolic-equivalent' AND a.kind='expression'))
  GROUP BY p.id,p.revision,a.user_id HAVING count(DISTINCT a.part_id)=(SELECT count(*) FROM authored_revision_part WHERE revision_id=p.revision)
 ) SELECT k.key,coalesce(t.favourites,0)::text AS favourites,
 EXISTS(SELECT 1 FROM community_favourite f WHERE f.problem_key=k.key AND f.user_id=$3) AS favourite,
 CASE WHEN p.id IS NULL OR p.schema_version<>1 OR (SELECT count(*) FROM scan)>20000 THEN NULL
 ELSE (SELECT count(*) FROM completed c WHERE c.id=p.id) END AS solves
 FROM unnest($1::text[]) WITH ORDINALITY k(key,ordinal)
 LEFT JOIN publications p ON k.key='authored:'||p.id::text
 LEFT JOIN community_problem_total t ON t.problem_key=k.key
 WHERE k.key LIKE 'arena:%' OR p.id IS NOT NULL ORDER BY k.ordinal`,values:[keys,authored,userId],query_timeout:5000};
 const {rows}=await pool.query(query);
 return statsPageSchema.parse({problems:rows.map(r=>({key:r.key,favourites:Number(r.favourites),favourite:r.favourite,solves:r.solves===null?null:Number(r.solves)}))});
}
export function createProblemStatsApi(deps:Deps){return async(request:Request)=>{
 let client:PoolClient|undefined,transaction=false;
 try{
  if(!['GET','PUT'].includes(request.method))throw new StatsError(405,'Method not allowed.');
  const url=new URL(request.url);const user=await deps.user(request);
  if(request.method==='GET'){
   if(request.url.length>4096||url.searchParams.size!==1||url.searchParams.getAll('keys').length!==1)throw new StatsError(400,'Invalid statistics request.');
   const keys=statsKeysSchema.parse(JSON.parse(url.searchParams.get('keys')!));
   client=await deps.pool.connect();await client.query("BEGIN READ ONLY; SET LOCAL statement_timeout='4s'");transaction=true;
   const result=await readProblemStats(client,keys,user?.id??null);await client.query('COMMIT');transaction=false;return profileReply(result);
  }
  if(!user)throw new StatsError(401,'Sign in to save favourites.');
  if(!user.emailVerified||!deps.origin(request))throw new StatsError(403,'Request not permitted.');
  if(url.search)throw new StatsError(400,'Invalid favourite request.');
  const limit=await deps.pool.query<{requests:number}>(`INSERT INTO community_favourite_limit(user_id,window_start,requests) VALUES($1,date_trunc('minute',clock_timestamp()),1)
   ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN community_favourite_limit.window_start=date_trunc('minute',clock_timestamp()) THEN least(community_favourite_limit.requests+1,61) ELSE 1 END,window_start=date_trunc('minute',clock_timestamp()) RETURNING requests`,[user.id]);
  if(limit.rows[0].requests>60){const r=profileReply({error:'Favourite limit reached. Retry next minute.'},429);r.headers.set('Retry-After','60');return r;}
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new StatsError(415,'Send JSON.');
  const body=favouriteWriteSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,2048,5000))));
  client=await deps.pool.connect();await client.query('BEGIN');transaction=true;await client.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'");
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,12))',['community-favourite:'+user.id]);
  if(body.key.startsWith('authored:')){const p=await client.query(`SELECT p.id FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id WHERE p.id=$1 AND p.state='published' FOR SHARE OF p`,[body.key.slice(9)]);if(!p.rows[0])throw new StatsError(404,'Problem not found.');}
  if(body.favourite)await client.query('INSERT INTO community_favourite(user_id,problem_key) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,body.key]);
  else await client.query('DELETE FROM community_favourite WHERE user_id=$1 AND problem_key=$2',[user.id,body.key]);
  await client.query('COMMIT');transaction=false;
  // Authoritative retry-safe desired state. Counts are refreshed separately as one batch.
  return profileReply({key:body.key,favourite:body.favourite});
 }catch(error){if(transaction)await client?.query('ROLLBACK').catch(()=>{});if(error instanceof StatsError)return profileReply({error:error.message},error.status);if(error instanceof RangeError)return profileReply({error:'Favourite request too large.'},413);if(error instanceof RequestBodyTimeoutError)return profileReply({error:'Favourite request timed out.'},408);if(error instanceof z.ZodError||error instanceof SyntaxError||error instanceof TypeError)return profileReply({error:'Invalid favourite or statistics request.'},400);return profileReply({error:'Problem statistics are temporarily unavailable.'},503);}finally{client?.release();}
};}
