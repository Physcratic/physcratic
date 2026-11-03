import 'server-only';
import type { Pool,PoolClient } from 'pg';
import { z } from 'zod';
import { interactionKeysSchema,favoriteWriteSchema,interactionsSchema } from './problem-interactions';
import { profileReply } from './profile-api';
import { readRequestBytes,RequestBodyTimeoutError } from '../submission-request';
type Deps={pool:Pool;user:(request:Request)=>Promise<{id:string;emailVerified?:boolean}|null|undefined>;origin:(request:Request)=>boolean};
class InteractionError extends Error{constructor(public status:number,message:string){super(message);}}
// One bounded batch query. Counts above the work budgets are unavailable, never
// truncated totals. No profiles, identities, answers, or private keys projected.
const statistics=`WITH targets AS (
 SELECT k.key,p.id,p.owner_id,r.id AS revision,r.schema_version
 FROM unnest($1::text[]) k(key)
 LEFT JOIN authored_problem p ON p.id=CASE WHEN k.key LIKE 'authored:%' THEN substring(k.key FROM 10)::uuid ELSE NULL END AND p.state='published'
 LEFT JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id
 WHERE k.key LIKE 'arena:%' OR r.id IS NOT NULL
), eligible_targets AS (
 SELECT t.*, (t.schema_version=1 AND parts.n BETWEEN 1 AND 32 AND parts.supported) AS provable
 FROM targets t CROSS JOIN LATERAL (
  SELECT count(*) AS n,bool_and(answer_mode IN ('numeric','expression')) AS supported FROM
   (SELECT answer_mode FROM authored_revision_part WHERE revision_id=t.revision LIMIT 33) bounded_parts
 ) parts
)
SELECT t.key,
 CASE WHEN f.total>10000 THEN NULL ELSE f.total::integer END AS favourites,
 EXISTS(SELECT 1 FROM community_favorite f WHERE f.user_id=$2 AND f.problem_key=t.key) AS favourite,
 (t.owner_id IS DISTINCT FROM $2) AS eligible,
 CASE WHEN t.provable IS NOT TRUE OR c.candidates>$3 THEN NULL ELSE c.completed::integer END AS completed
FROM eligible_targets t
CROSS JOIN LATERAL (SELECT count(*) AS total FROM (
 SELECT 1 FROM community_favorite f WHERE f.problem_key=t.key AND f.user_id IS DISTINCT FROM t.owner_id LIMIT 10001
) limited) f
CROSS JOIN LATERAL (
 WITH RECURSIVE users(user_id,n) AS (
  (SELECT a.user_id,1 FROM authored_attempt a WHERE t.provable=true AND a.problem_id=t.id AND a.revision_id=t.revision
   AND a.status='correct' AND a.assisted=false AND a.user_id<>t.owner_id ORDER BY a.user_id LIMIT 1)
  UNION ALL
  SELECT next.user_id,users.n+1 FROM users CROSS JOIN LATERAL (
   SELECT a.user_id FROM authored_attempt a WHERE a.problem_id=t.id AND a.revision_id=t.revision
    AND a.status='correct' AND a.assisted=false AND a.user_id<>t.owner_id AND a.user_id>users.user_id ORDER BY a.user_id LIMIT 1
  ) next WHERE users.n<($3+1)
 )
 SELECT count(*) AS candidates,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM "user" u WHERE u.id=users.user_id AND u."emailVerified"=true) AND NOT EXISTS(
  SELECT 1 FROM authored_revision_part rp WHERE rp.revision_id=t.revision AND NOT EXISTS(
   SELECT 1 FROM authored_attempt a WHERE a.problem_id=t.id AND a.revision_id=t.revision
    AND a.user_id=users.user_id AND a.part_id=rp.part_id AND a.status='correct' AND a.assisted=false
    AND ((rp.answer_mode='numeric' AND a.engine_version='numeric-v1' AND a.reason='within-tolerance' AND a.answer->>'kind'='numeric')
      OR (rp.answer_mode='expression' AND a.engine_version='symbolic-v1' AND a.reason='symbolic-equivalent' AND a.answer->>'kind'='expression'))
  )
 )) AS completed FROM users
) c`;
export function createProblemInteractionsApi(deps:Deps){return async(request:Request)=>{
 let client:PoolClient|undefined,transaction=false;
 try{
  if(!['GET','PUT'].includes(request.method))throw new InteractionError(405,'Method not allowed.');
  const url=new URL(request.url);if(request.url.length>5000)throw new InteractionError(400,'Invalid problem selection.');
  const user=await deps.user(request);let keys:string[];
  const expected=request.headers.get('x-expected-viewer');
  if(expected!==null&&expected!==(user?encodeURIComponent(user.id):'guest'))throw new InteractionError(409,'Your account changed. Reload statistics.');
  let write:z.infer<typeof favoriteWriteSchema>|undefined;
  if(request.method==='GET'){
   if([...url.searchParams.keys()].some(k=>k!=='keys')||url.searchParams.getAll('keys').length!==1)throw new InteractionError(400,'Invalid problem selection.');
   keys=interactionKeysSchema.parse(url.searchParams.get('keys')!.split(','));
  }else{
   if(!user)throw new InteractionError(401,'Sign in to save favourites.');
   if(user.emailVerified!==true||!deps.origin(request))throw new InteractionError(403,'Request not permitted.');
   const limit=await deps.pool.query(`INSERT INTO community_interaction_limit(user_id,window_start,requests) VALUES($1,date_trunc('minute',clock_timestamp()),1)
    ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN community_interaction_limit.window_start=date_trunc('minute',clock_timestamp()) THEN least(community_interaction_limit.requests+1,31) ELSE 1 END,
    window_start=date_trunc('minute',clock_timestamp()) RETURNING requests`,[user.id]);
   if(limit.rows[0].requests>30){const r=profileReply({error:'Favourite limit reached. Retry next minute.'},429);r.headers.set('Retry-After','60');return r;}
   if(url.search)throw new InteractionError(400,'Invalid favourite request.');
   if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new InteractionError(415,'Send JSON.');
   write=favoriteWriteSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,2048,5000))));keys=[write.key];
  }
  client=await deps.pool.connect();await client.query('BEGIN');transaction=true;
  await client.query("SET LOCAL statement_timeout='5s'");await client.query("SET LOCAL lock_timeout='2s'");
  // Hold the current publication through response computation and writes.
  const ids=keys.filter(k=>k.startsWith('authored:')).map(k=>k.slice(9));
  const publicRows=await client.query(`SELECT id,owner_id FROM authored_problem WHERE id=ANY($1::uuid[]) AND state='published' AND published_revision_id IS NOT NULL ORDER BY id FOR SHARE`,[ids]);
  const missing=keys.filter(key=>key.startsWith('authored:')&&!publicRows.rows.some(row=>row.id===key.slice(9)));
  let savedMissing:string[]=[];
  if(publicRows.rows.length!==ids.length){
   if(write?.favourite===false){
    // Removing one's own bookmark never exposes withdrawn/private metadata.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,12))',[user!.id]);
    await client.query('DELETE FROM community_favorite WHERE user_id=$1 AND problem_key=$2',[user!.id,write.key]);
    await client.query('COMMIT');transaction=false;
    return profileReply(interactionsSchema.parse({viewer:'verified',problems:[{key:write.key,favourites:null,completed:null,favourite:false,canFavourite:false}]}));
   }
   if(!write&&user){savedMissing=(await client.query('SELECT problem_key FROM community_favorite WHERE user_id=$1 AND problem_key=ANY($2::text[])',[user.id,missing])).rows.map(row=>row.problem_key);}
   // Only the caller's existing preferences can be shown for an unavailable
   // target. Never reveal whether the target exists or any private metadata.
   if(savedMissing.length!==missing.length)throw new InteractionError(404,'Problem unavailable.');
  }
  if(write){
   if(write.favourite&&publicRows.rows.some(p=>p.owner_id===user!.id))throw new InteractionError(403,'Authors cannot favourite their own problems.');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,12))',[user!.id]);
   if(write.favourite){
    const count=await client.query('SELECT count(*) AS n FROM (SELECT 1 FROM community_favorite WHERE user_id=$1 LIMIT 1001) f',[user!.id]);
    const exists=await client.query('SELECT 1 FROM community_favorite WHERE user_id=$1 AND problem_key=$2',[user!.id,write.key]);
    if(Number(count.rows[0].n)>=1000&&!exists.rowCount)throw new InteractionError(409,'Favourite storage limit reached. Remove another favourite first.');
    await client.query('INSERT INTO community_favorite(user_id,problem_key) VALUES($1,$2) ON CONFLICT DO NOTHING',[user!.id,write.key]);
   }else await client.query('DELETE FROM community_favorite WHERE user_id=$1 AND problem_key=$2',[user!.id,write.key]);
  }
  const rows=await client.query(statistics,[keys,user?.id??null,Math.floor(2000/keys.length)]);
  if(keys.some(key=>!rows.rows.some(row=>row.key===key)&&!savedMissing.includes(key)))throw new InteractionError(404,'Problem unavailable.');
  const viewer=!user?'guest':user.emailVerified===true?'verified':'unverified';
  const result=interactionsSchema.parse({viewer,problems:keys.map(key=>{const row=rows.rows.find(r=>r.key===key);return row?{key,favourites:row.favourites,completed:row.completed,favourite:row.favourite,canFavourite:viewer==='verified'&&row.eligible}:{key,favourites:null,completed:null,favourite:true,canFavourite:false};})});
  await client.query('COMMIT');transaction=false;return profileReply(result);
 }catch(error){
  if(client&&transaction)await client.query('ROLLBACK').catch(()=>{});
  if(error instanceof InteractionError)return profileReply({error:error.message},error.status);
  if(error instanceof z.ZodError||error instanceof SyntaxError||error instanceof TypeError)return profileReply({error:'Invalid problem interactions request.'},400);
  if(error instanceof RangeError)return profileReply({error:'Request too large.'},413);
  if(error instanceof RequestBodyTimeoutError)return profileReply({error:'Request timed out.'},408);
  return profileReply({error:'Problem interactions are temporarily unavailable.'},503);
 }finally{client?.release();}
};}
