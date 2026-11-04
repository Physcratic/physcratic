import 'server-only';
import type {PoolClient} from 'pg';
// Operator-only utility. No HTTP route or runtime grant invokes maintenance.
// One keyset page per transaction. Evidence, audit, cases and live restrictions are never purged.
const tables={
 moderation:{table:'community_moderation_limit',keys:['bucket'],stale:"day < (clock_timestamp() AT TIME ZONE 'UTC')::date-30 AND minute < clock_timestamp()-interval '30 days'"},
 comments:{table:'community_comment_limit',keys:['bucket'],stale:"day < (clock_timestamp() AT TIME ZONE 'UTC')::date-30 AND minute < clock_timestamp()-interval '30 days' AND post_minute < clock_timestamp()-interval '30 days'"},
 content:{table:'community_content_limit',keys:['user_id'],stale:"day < (clock_timestamp() AT TIME ZONE 'UTC')::date-30"},
 spam:{table:'community_comment_spam',keys:['user_id','body_hash'],stale:"last_post < clock_timestamp()-interval '30 days'"},
} as const;
export type MaintenanceArea=keyof typeof tables;
export async function pruneModerationPage(client:PoolClient,area:MaintenanceArea,after:string[]=[]){
 if(!Object.hasOwn(tables,area))throw new Error('Invalid maintenance area');
 const {table,keys,stale}=tables[area];
 if(after.length&&after.length!==keys.length||after.some(v=>typeof v!=='string'||v.length>512))throw new Error('Invalid maintenance cursor');
 const columns=keys.join(','),tuple=keys.length>1?'('+columns+')':columns,placeholders=keys.map((_,i)=>'$'+(i+1)).join(','),compare=keys.length>1?'('+placeholders+')':placeholders;
 await client.query("SET LOCAL statement_timeout='4s';SET LOCAL lock_timeout='2s'");
 const rows=(await client.query(`SELECT ${columns} FROM ${table} ${after.length?`WHERE ${tuple}>${compare}`:''} ORDER BY ${columns} LIMIT 200 FOR UPDATE SKIP LOCKED`,after)).rows;
 let removed=0;
 if(rows.length){
  // Fixed keys/identifiers, parameterized values. At most 200 indexed row deletions.
  const values:unknown[]=[],conditions=rows.map(row=>'('+keys.map(key=>{values.push(row[key]);return key+'=$'+values.length;}).join(' AND ')+')');
  removed=(await client.query(`DELETE FROM ${table} WHERE (${conditions.join(' OR ')}) AND (${stale})`,values)).rowCount??0;
 }
 return {scanned:rows.length,removed,next:rows.length===200?keys.map(key=>String(rows.at(-1)![key])):null};
}
