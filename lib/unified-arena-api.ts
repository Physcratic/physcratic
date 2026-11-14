import 'server-only';
import type { Pool } from 'pg';
import { authoredRating, createAuthoredLibraryApi } from './authored-library-api';
import { arenaFiltersSchema, compareByRating, staticArenaEntries, unifiedArenaPageSchema, type CollectionCursor, type CollectionEntry } from './unified-arena';
import { getEstimatedProblemElo } from './problem-archive';
import { achievementEligible, achievementIdSchema, type PublicMedal } from './community/achievements';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
export function createUnifiedArenaApi(pool:Pool, flags:()=>{authors:boolean;badges:boolean;medals:boolean;stats?:boolean}=()=>({authors:false,badges:false,medals:false})) {
 const library=createAuthoredLibraryApi(pool);
 return async(request:Request)=>{
  try {
   const params=new URL(request.url).searchParams;
   if(request.url.length>4096||[...params.keys()].some(k=>params.getAll(k).length!==1))return Response.json({error:'Invalid collection filters.'},{status:400,headers});
   const parsed=arenaFiltersSchema.safeParse(Object.fromEntries(params));
   if(!parsed.success)return Response.json({error:'Invalid collection filters.'},{status:400,headers});
   const f=parsed.data;
   let authoredUnavailable=false,attributionUnavailable=false;
   const includeAuthored=f.source!=='arena'&&(f.difficulty==='all'||f.difficulty==='unrated');
   // The page starts after the cursor problem. Its rating places it in the order: rating from low to high, problems
   // without a rating last, then Physcratic before community, then id.
   let cursor:CollectionCursor|undefined,cursorLost=false;
   if(f.after?.startsWith('arena:'))cursor={kind:'arena',id:f.after.slice(6),rating:getEstimatedProblemElo(f.after.slice(6))};
   else if(f.after){
    const id=f.after.slice(9).toLowerCase();
    try{cursor={kind:'authored',id,rating:(await authoredRating(pool,id)).rating};}catch{cursorLost=true;authoredUnavailable=includeAuthored;}
   }
   const statics=cursorLost?[]:staticArenaEntries(f,cursor);
   let entries:CollectionEntry[]=[],moreAuthored=false;const ratings=new Map<string,number|null>();
   if(includeAuthored&&!cursorLost){
    const p=new URLSearchParams({q:f.q,tag:f.tag,sort:'rating'});
    if(cursor?.kind==='authored'){p.set('after',cursor.id);p.set('afterRating',cursor.rating===null?'unrated':String(cursor.rating));}
    else if(cursor&&cursor.rating!==null)p.set('minRating',String(cursor.rating));
    const response=await library(new Request('https://library.internal/?'+p));
    if(!response.ok){authoredUnavailable=true;}else{
     const page=await response.json();moreAuthored=Boolean(page.nextCursor);
     entries=page.problems.map((v:{problemId:string;title:string;topicTags:string[];methodTags:string[];estimatedDifficulty:string|null;provenance:CollectionEntry['provenance'];rating?:number|null})=>{ratings.set(v.problemId,v.rating??null);return {key:`authored:${v.problemId}`,kind:'authored',id:v.problemId,title:v.title,tags:[...new Set([...v.topicTags,...v.methodTags])],summary:'Published community problem',estimatedDifficulty:v.estimatedDifficulty,provenance:v.provenance,author:null};});
    }
   }
   const rank=(e:CollectionEntry)=>({kind:e.kind,id:e.id,rating:e.kind==='arena'?e.elo??null:ratings.get(e.id)??null});
   const merged=[...statics,...entries].sort((a,b)=>compareByRating(rank(a),rank(b))),problems=merged.slice(0,24);
   const nextCursor=merged.length>24||moreAuthored?problems.at(-1)?.key??null:null;
   {
    entries=problems.filter(e=>e.kind==='authored');
    {
     const enabled=flags();
     if(enabled.authors&&entries.length){
      try{
       // At most 24 publications, one batched snapshot. Never expose Better Auth identity.
       // MATERIALIZED deduplicates authors before bounded achievement progress work.
       const authorQuery={text:`WITH visible AS MATERIALIZED (
         SELECT p.id,cp.user_id,cp.handle,cp.display_name FROM authored_problem p
         JOIN community_profile cp ON cp.user_id=p.owner_id AND cp.public_visibility=true
         WHERE p.id=ANY($1::uuid[]) AND p.state='published'
       ), authors AS MATERIALIZED (SELECT DISTINCT user_id,handle,display_name FROM visible),
       badges AS MATERIALIZED (SELECT a.user_id,${enabled.badges?"coalesce(s.badge_ids,'{}'::text[]) AS ids,g.author_count,g.solve_count":"'{}'::text[] AS ids,0 AS author_count,NULL::integer AS solve_count"}
        FROM authors a ${enabled.badges?"LEFT JOIN community_badge_selection s ON s.user_id=a.user_id LEFT JOIN LATERAL community_achievement_progress(a.user_id) g ON cardinality(s.badge_ids)>0":""})
       SELECT v.id,v.handle,v.display_name AS "displayName",b.ids,b.author_count AS author,b.solve_count AS solver,
       ${enabled.medals?`coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'competition',m.competition,'award',m.award,'year',m.year,'country',m.country,'competitionName',m."competitionName")) FROM community_approved_medal m WHERE m.user_id=v.user_id AND m.id=ANY(b.ids)),'[]'::jsonb)`:"'[]'::jsonb"} AS medals
       FROM visible v JOIN badges b ON b.user_id=v.user_id`,values:[entries.map(e=>e.id)],query_timeout:5000};
       const {rows}=await pool.query<{id:string;handle:string;displayName:string;ids:string[];author:number;solver:number|null;medals:PublicMedal[]}>(authorQuery);
       const byId=new Map(rows.map(r=>[r.id,r]));
       for(const entry of entries){const a=byId.get(entry.id);if(a){const medals:PublicMedal[]=a.medals;entry.author={handle:a.handle,displayName:a.displayName,selectedIds:a.ids.filter((id:string)=>{const earned=achievementIdSchema.safeParse(id);return earned.success?achievementEligible(earned.data,{author:a.author??0,solver:a.solver}):medals.some(m=>m.id===id);}),medals};}}
      }catch{attributionUnavailable=true;}
     }
    }
   }
   return Response.json(unifiedArenaPageSchema.parse({problems,nextCursor,authoredUnavailable,attributionUnavailable,...(flags().stats?{statsEnabled:true}:{})}),{headers});
  }catch{return Response.json({error:'The collection is temporarily unavailable.'},{status:503,headers});}
 };
}
